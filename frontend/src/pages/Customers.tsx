import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "../api/client";
import { Customer } from "../types";
import { Button, Input, Modal, PageHeader } from "../components/ui";

export default function Customers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", search],
    queryFn: async () => (await api.get<Customer[]>(`/customers?q=${encodeURIComponent(search)}`)).data,
  });

  const deleteCustomer = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer removed");
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Guest directory and loyalty"
        action={<Button onClick={() => setModalOpen(true)}>+ Customer</Button>}
      />

      <Input
        placeholder="Search by name, phone, or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-sm"
      />

      {isLoading ? (
        <p className="text-slate-400">Loading customers…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Loyalty Pts</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-slate-700">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{c._count?.orders ?? 0}</td>
                  <td className="px-4 py-3 text-slate-500">{c.loyaltyPoints}</td>
                  <td className="px-4 py-3">
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (confirm(`Remove ${c.name}?`)) deleteCustomer.mutate(c.id);
                      }}
                    >
                      Del
                    </Button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <CustomerModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function CustomerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  const create = useMutation({
    mutationFn: () => api.post("/customers", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer added");
      setForm({ name: "", phone: "", email: "" });
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title="New Customer">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Input
          placeholder="Full name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Button type="submit" disabled={create.isPending} className="w-full">
          Add Customer
        </Button>
      </form>
    </Modal>
  );
}
