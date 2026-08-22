import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "../api/client";
import { Role, User } from "../types";
import { Badge, Button, Input, Modal, PageHeader, Select } from "../components/ui";

const ROLES: Role[] = ["ADMIN", "MANAGER", "CHEF", "WAITER", "CASHIER"];

export default function Staff() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => (await api.get<User[]>("/staff")).data,
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => api.put(`/staff/${id}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Staff member deactivated");
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Team accounts and roles"
        action={<Button onClick={() => setModalOpen(true)}>+ Staff Member</Button>}
      />

      {isLoading ? (
        <p className="text-slate-400">Loading staff…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-slate-700">{s.name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.email}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={s.role}
                      onChange={(e) => updateRole.mutate({ id: s.id, role: e.target.value as Role })}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={s.isActive ? "AVAILABLE" : "CANCELLED"} />
                  </td>
                  <td className="px-4 py-3">
                    {s.isActive && (
                      <Button
                        variant="danger"
                        onClick={() => {
                          if (confirm(`Deactivate ${s.name}?`)) deactivate.mutate(s.id);
                        }}
                      >
                        Deactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StaffModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function StaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "WAITER" as Role });

  const create = useMutation({
    mutationFn: () => api.post("/auth/register", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Staff member added");
      setForm({ name: "", email: "", password: "", role: "WAITER" });
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title="New Staff Member">
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
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          type="password"
          placeholder="Temporary password"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Button type="submit" disabled={create.isPending} className="w-full">
          Add Staff Member
        </Button>
      </form>
    </Modal>
  );
}
