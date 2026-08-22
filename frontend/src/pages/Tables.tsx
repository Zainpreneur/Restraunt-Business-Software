import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "../api/client";
import { RestaurantTable, TableStatus } from "../types";
import { Badge, Button, Card, Input, Modal, PageHeader, Select } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const STATUS_OPTIONS: TableStatus[] = ["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING"];

export default function Tables() {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => (await api.get<RestaurantTable[]>("/tables")).data,
    refetchInterval: 20_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TableStatus }) =>
      api.put(`/tables/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tables"] }),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Tables"
        subtitle="Floor status at a glance"
        action={
          hasRole("ADMIN", "MANAGER") && (
            <Button onClick={() => setModalOpen(true)}>+ Table</Button>
          )
        }
      />

      {isLoading ? (
        <p className="text-slate-400">Loading tables…</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {tables.map((table) => {
            const activeOrder = table.orders?.[0];
            return (
              <Card key={table.id} className="text-center">
                <p className="text-3xl font-bold text-slate-800">{table.number}</p>
                <p className="mb-2 text-xs text-slate-400">
                  {table.capacity} seats {table.location ? `· ${table.location}` : ""}
                </p>
                <Badge label={table.status} />
                {activeOrder && (
                  <p className="mt-2 text-xs font-medium text-slate-500">${activeOrder.total.toFixed(2)} open</p>
                )}
                <Select
                  className="mt-3"
                  value={table.status}
                  onChange={(e) =>
                    updateStatus.mutate({ id: table.id, status: e.target.value as TableStatus })
                  }
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Card>
            );
          })}
        </div>
      )}

      <TableModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function TableModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [number, setNumber] = useState(1);
  const [capacity, setCapacity] = useState(2);
  const [location, setLocation] = useState("");

  const create = useMutation({
    mutationFn: () => api.post("/tables", { number, capacity, location: location || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Table created");
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title="New Table">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Input
          type="number"
          placeholder="Table number"
          required
          value={number}
          onChange={(e) => setNumber(parseInt(e.target.value) || 1)}
        />
        <Input
          type="number"
          placeholder="Capacity"
          required
          value={capacity}
          onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
        />
        <Input placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
        <Button type="submit" disabled={create.isPending} className="w-full">
          Create
        </Button>
      </form>
    </Modal>
  );
}
