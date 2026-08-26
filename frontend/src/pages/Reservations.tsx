import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "../api/client";
import { Reservation, ReservationStatus, RestaurantTable } from "../types";
import { Badge, Button, Card, Input, Modal, PageHeader, Select } from "../components/ui";

const STATUS_OPTIONS: ReservationStatus[] = [
  "PENDING",
  "CONFIRMED",
  "SEATED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

export default function Reservations() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["reservations"],
    queryFn: async () => (await api.get<Reservation[]>("/reservations")).data,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReservationStatus }) =>
      api.put(`/reservations/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const sorted = [...reservations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div>
      <PageHeader
        title="Reservations"
        subtitle="Upcoming bookings"
        action={<Button onClick={() => setModalOpen(true)}>+ Reservation</Button>}
      />

      {isLoading ? (
        <p className="text-slate-400">Loading reservations…</p>
      ) : sorted.length === 0 ? (
        <p className="text-slate-400">No reservations yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Date &amp; Time</th>
                <th className="px-4 py-3">Party</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700">{r.customerName}</p>
                    {r.customerPhone && <p className="text-xs text-slate-400">{r.customerPhone}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{new Date(r.date).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{r.partySize}</td>
                  <td className="px-4 py-3 text-slate-600">{r.table ? `Table ${r.table.number}` : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge label={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={r.status}
                      onChange={(e) =>
                        updateStatus.mutate({ id: r.id, status: e.target.value as ReservationStatus })
                      }
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReservationModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function ReservationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => (await api.get<RestaurantTable[]>("/tables")).data,
    enabled: open,
  });

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    partySize: 2,
    date: "",
    tableId: "",
  });

  const create = useMutation({
    mutationFn: () =>
      api.post("/reservations", {
        ...form,
        date: new Date(form.date).toISOString(),
        tableId: form.tableId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      toast.success("Reservation created");
      setForm({ customerName: "", customerPhone: "", partySize: 2, date: "", tableId: "" });
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title="New Reservation">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Input
          placeholder="Guest name"
          required
          value={form.customerName}
          onChange={(e) => setForm({ ...form, customerName: e.target.value })}
        />
        <Input
          placeholder="Phone (optional)"
          value={form.customerPhone}
          onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            placeholder="Party size"
            required
            value={form.partySize}
            onChange={(e) => setForm({ ...form, partySize: parseInt(e.target.value) || 1 })}
          />
          <Input
            type="datetime-local"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <Select value={form.tableId} onChange={(e) => setForm({ ...form, tableId: e.target.value })}>
          <option value="">No table assigned</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              Table {t.number} ({t.capacity} seats)
            </option>
          ))}
        </Select>
        <Button type="submit" disabled={create.isPending} className="w-full">
          Create Reservation
        </Button>
      </form>
    </Modal>
  );
}
