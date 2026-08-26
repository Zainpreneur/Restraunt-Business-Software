import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "../api/client";
import { Category, MenuItem } from "../types";
import { Badge, Button, Card, Input, Modal, PageHeader, Select } from "../components/ui";

export default function Menu() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  });
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["menu-items"],
    queryFn: async () => (await api.get<MenuItem[]>("/menu-items")).data,
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => api.delete(`/menu-items/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      toast.success("Item deleted");
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const toggleAvailability = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      api.put(`/menu-items/${id}`, { isAvailable }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu-items"] }),
  });

  const grouped = categories.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.categoryId === cat.id),
  }));

  return (
    <div>
      <PageHeader
        title="Menu Management"
        subtitle="Manage categories and dishes"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setCategoryModalOpen(true)}>
              + Category
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              + Menu Item
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <p className="text-slate-400">Loading menu…</p>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ category, items: catItems }) => (
            <div key={category.id}>
              <h2 className="mb-3 text-lg font-bold text-slate-800">{category.name}</h2>
              {catItems.length === 0 ? (
                <p className="text-sm text-slate-400">No items yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {catItems.map((item) => (
                    <Card key={item.id} className="flex flex-col justify-between">
                      <div>
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <span className="font-bold text-brand-600">${item.price.toFixed(2)}</span>
                        </div>
                        {item.description && (
                          <p className="mb-2 line-clamp-2 text-xs text-slate-500">{item.description}</p>
                        )}
                        <div className="flex gap-1.5">
                          {item.isVeg && <Badge label="VEG" />}
                          <Badge label={item.isAvailable ? "AVAILABLE" : "CANCELLED"} />
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="secondary"
                          className="flex-1"
                          onClick={() =>
                            toggleAvailability.mutate({ id: item.id, isAvailable: !item.isAvailable })
                          }
                        >
                          {item.isAvailable ? "86 Item" : "Restore"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditing(item);
                            setModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => {
                            if (confirm(`Delete ${item.name}?`)) deleteItem.mutate(item.id);
                          }}
                        >
                          Del
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <MenuItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories}
        editing={editing}
      />
      <CategoryModal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} />
    </div>
  );
}

function MenuItemModal({
  open,
  onClose,
  categories,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  editing: MenuItem | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
    name: editing?.name ?? "",
    description: editing?.description ?? "",
    price: editing?.price ?? 0,
    cost: editing?.cost ?? 0,
    categoryId: editing?.categoryId ?? categories[0]?.id ?? "",
    isVeg: editing?.isVeg ?? false,
  }));

  // Reset form whenever the modal is (re)opened for a different item.
  const key = `${open}-${editing?.id ?? "new"}`;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setForm({
      name: editing?.name ?? "",
      description: editing?.description ?? "",
      price: editing?.price ?? 0,
      cost: editing?.cost ?? 0,
      categoryId: editing?.categoryId ?? categories[0]?.id ?? "",
      isVeg: editing?.isVeg ?? false,
    });
  }

  const save = useMutation({
    mutationFn: () =>
      editing ? api.put(`/menu-items/${editing.id}`, form) : api.post("/menu-items", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      toast.success(editing ? "Item updated" : "Item created");
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Menu Item" : "New Menu Item"}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Input
          placeholder="Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            step="0.01"
            placeholder="Price"
            required
            value={form.price}
            onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Cost"
            value={form.cost}
            onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <Select
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.isVeg}
            onChange={(e) => setForm({ ...form, isVeg: e.target.checked })}
          />
          Vegetarian
        </label>
        <Button type="submit" disabled={save.isPending} className="w-full">
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </form>
    </Modal>
  );
}

function CategoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: () => api.post("/categories", { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created");
      setName("");
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title="New Category">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Input placeholder="Category name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" disabled={create.isPending} className="w-full">
          Create
        </Button>
      </form>
    </Modal>
  );
}
