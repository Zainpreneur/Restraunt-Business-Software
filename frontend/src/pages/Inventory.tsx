import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "../api/client";
import { InventoryItem } from "../types";
import { Badge, Button, Input, Modal, PageHeader, Select } from "../components/ui";

export default function Inventory() {
  const qc = useQueryClient();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [txnItem, setTxnItem] = useState<InventoryItem | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => (await api.get<InventoryItem[]>("/inventory")).data,
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item removed");
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Stock levels and purchasing"
        action={<Button onClick={() => setAddModalOpen(true)}>+ Item</Button>}
      />

      {isLoading ? (
        <p className="text-slate-400">Loading inventory…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Reorder Level</th>
                <th className="px-4 py-3">Cost / Unit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const low = item.quantity <= item.reorderLevel;
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {item.reorderLevel} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-slate-500">${item.costPerUnit.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge label={low ? "PENDING" : "AVAILABLE"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setTxnItem(item)}>
                          Adjust
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => {
                            if (confirm(`Remove ${item.name} from inventory?`)) deleteItem.mutate(item.id);
                          }}
                        >
                          Del
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddItemModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <TxnModal item={txnItem} onClose={() => setTxnItem(null)} />
    </div>
  );
}

function AddItemModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", unit: "kg", quantity: 0, reorderLevel: 0, costPerUnit: 0 });

  const create = useMutation({
    mutationFn: () => api.post("/inventory", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item added");
      setForm({ name: "", unit: "kg", quantity: 0, reorderLevel: 0, costPerUnit: 0 });
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title="New Inventory Item">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Input
          placeholder="Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Unit (kg, L, unit…)"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Starting quantity"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            step="0.01"
            placeholder="Reorder level"
            value={form.reorderLevel}
            onChange={(e) => setForm({ ...form, reorderLevel: parseFloat(e.target.value) || 0 })}
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Cost per unit"
            value={form.costPerUnit}
            onChange={(e) => setForm({ ...form, costPerUnit: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <Button type="submit" disabled={create.isPending} className="w-full">
          Add Item
        </Button>
      </form>
    </Modal>
  );
}

function TxnModal({ item, onClose }: { item: InventoryItem | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState<"PURCHASE" | "USAGE" | "ADJUSTMENT" | "WASTE">("PURCHASE");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  const submit = useMutation({
    mutationFn: () => api.post(`/inventory/${item!.id}/transactions`, { type, quantity, note: note || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Stock updated");
      setQuantity(1);
      setNote("");
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Modal open={!!item} onClose={onClose} title={`Adjust Stock — ${item?.name ?? ""}`}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="PURCHASE">Purchase (add stock)</option>
          <option value="USAGE">Usage (remove stock)</option>
          <option value="WASTE">Waste (remove stock)</option>
          <option value="ADJUSTMENT">Adjustment (remove stock)</option>
        </Select>
        <Input
          type="number"
          step="0.01"
          placeholder="Quantity"
          required
          value={quantity}
          onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
        />
        <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button type="submit" disabled={submit.isPending} className="w-full">
          Save
        </Button>
      </form>
    </Modal>
  );
}
