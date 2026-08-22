import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "../api/client";
import { Category, MenuItem, OrderType, RestaurantTable } from "../types";
import { Button, Card, PageHeader, Select } from "../components/ui";

interface CartLine {
  menuItem: MenuItem;
  quantity: number;
}

export default function Pos() {
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [tableId, setTableId] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  });
  const { data: menuItems = [] } = useQuery({
    queryKey: ["menu-items", "available"],
    queryFn: async () => (await api.get<MenuItem[]>("/menu-items?available=true")).data,
  });
  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => (await api.get<RestaurantTable[]>("/tables")).data,
  });

  const visibleItems = useMemo(
    () => (activeCategory === "all" ? menuItems : menuItems.filter((i) => i.categoryId === activeCategory)),
    [menuItems, activeCategory]
  );

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((l) => l.menuItem.id === item.id);
      if (existing) {
        return prev.map((l) => (l.menuItem.id === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }

  function changeQty(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.menuItem.id === itemId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  const subtotal = cart.reduce((s, l) => s + l.menuItem.price * l.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const placeOrder = useMutation({
    mutationFn: () =>
      api.post("/orders", {
        type: orderType,
        tableId: orderType === "DINE_IN" && tableId ? tableId : undefined,
        items: cart.map((l) => ({ menuItemId: l.menuItem.id, quantity: l.quantity })),
      }),
    onSuccess: () => {
      toast.success("Order placed!");
      setCart([]);
      setTableId("");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const availableTables = tables.filter((t) => t.status === "AVAILABLE" || t.id === tableId);

  return (
    <div>
      <PageHeader title="Point of Sale" subtitle="Build a new order" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                activeCategory === "all" ? "bg-brand-500 text-white" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  activeCategory === c.id
                    ? "bg-brand-500 text-white"
                    : "bg-white text-slate-600 border border-slate-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                <p className="mt-1 text-sm font-bold text-brand-600">${item.price.toFixed(2)}</p>
              </button>
            ))}
            {visibleItems.length === 0 && <p className="text-sm text-slate-400">No items in this category.</p>}
          </div>
        </div>

        <Card className="flex h-fit flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">Order Type</label>
            <Select value={orderType} onChange={(e) => setOrderType(e.target.value as OrderType)}>
              <option value="DINE_IN">Dine In</option>
              <option value="TAKEAWAY">Takeaway</option>
              <option value="DELIVERY">Delivery</option>
            </Select>
          </div>
          {orderType === "DINE_IN" && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">Table</label>
              <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
                <option value="">Select table…</option>
                {availableTables.map((t) => (
                  <option key={t.id} value={t.id}>
                    Table {t.number} ({t.capacity} seats)
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-sm font-semibold text-slate-700">Cart</p>
            {cart.length === 0 ? (
              <p className="text-sm text-slate-400">No items yet — tap a dish to add it.</p>
            ) : (
              <div className="space-y-2">
                {cart.map((line) => (
                  <div key={line.menuItem.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-700">{line.menuItem.name}</p>
                      <p className="text-xs text-slate-400">${line.menuItem.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => changeQty(line.menuItem.id, -1)}
                        className="h-6 w-6 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        −
                      </button>
                      <span className="w-5 text-center">{line.quantity}</span>
                      <button
                        onClick={() => changeQty(line.menuItem.id, 1)}
                        className="h-6 w-6 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Tax (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-800">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <Button
            disabled={cart.length === 0 || placeOrder.isPending}
            onClick={() => placeOrder.mutate()}
            className="w-full"
          >
            {placeOrder.isPending ? "Placing order…" : "Place Order"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
