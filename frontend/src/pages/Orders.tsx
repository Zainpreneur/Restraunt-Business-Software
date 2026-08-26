import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "../api/client";
import { Order, OrderStatus } from "../types";
import { Badge, Button, Card, Input, Modal, PageHeader, Select } from "../components/ui";

type PaymentMethodType2 = "CASH" | "CARD" | "ONLINE" | "WALLET";

const STATUS_FILTERS: (OrderStatus | "ALL")[] = [
  "ALL",
  "OPEN",
  "PREPARING",
  "READY",
  "SERVED",
  "COMPLETED",
  "CANCELLED",
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  OPEN: "PREPARING",
  PREPARING: "READY",
  READY: "SERVED",
  SERVED: "COMPLETED",
};

export default function Orders() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => (await api.get<Order[]>("/orders")).data,
    refetchInterval: 15_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch(`/orders/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const visibleOrders = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <PageHeader title="Orders" subtitle="Track and progress every order" />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
              filter === s ? "bg-brand-500 text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-slate-400">Loading orders…</p>
      ) : visibleOrders.length === 0 ? (
        <p className="text-slate-400">No orders match this filter.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleOrders.map((order) => (
            <Card key={order.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">
                    {order.type === "DINE_IN" && order.table ? `Table ${order.table.number}` : order.type}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(order.createdAt).toLocaleTimeString()} · {order.waiter?.name ?? "—"}
                  </p>
                </div>
                <Badge label={order.status} />
              </div>

              <div className="space-y-1 border-t border-slate-100 pt-2 text-sm">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-slate-600">
                      {item.quantity}× {item.menuItem.name}
                    </span>
                    <span className="text-slate-400">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-bold text-slate-800">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>

              <div className="flex gap-2">
                {NEXT_STATUS[order.status] && (
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => updateStatus.mutate({ id: order.id, status: NEXT_STATUS[order.status]! })}
                  >
                    Mark {NEXT_STATUS[order.status]}
                  </Button>
                )}
                {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                  <>
                    <Button className="flex-1" onClick={() => setPayingOrder(order)}>
                      Pay
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => updateStatus.mutate({ id: order.id, status: "CANCELLED" })}
                    >
                      ✕
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <PaymentModal order={payingOrder} onClose={() => setPayingOrder(null)} />
    </div>
  );
}

function PaymentModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [method, setMethod] = useState<PaymentMethodType2>("CASH");
  const [amount, setAmount] = useState(0);
  const [tip, setTip] = useState(0);

  const key = order?.id ?? "none";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setAmount(order?.total ?? 0);
    setTip(0);
    setMethod("CASH");
  }

  const pay = useMutation({
    mutationFn: () => api.post(`/orders/${order!.id}/payments`, { method, amount, tip }),
    onSuccess: () => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["tables"] });
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Modal open={!!order} onClose={onClose} title={`Payment — Total $${order?.total.toFixed(2)}`}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          pay.mutate();
        }}
      >
        <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethodType2)}>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="ONLINE">Online</option>
          <option value="WALLET">Wallet</option>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Tip"
            value={tip}
            onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
          />
        </div>
        <Button type="submit" disabled={pay.isPending} className="w-full">
          {pay.isPending ? "Processing…" : "Confirm Payment"}
        </Button>
      </form>
    </Modal>
  );
}
