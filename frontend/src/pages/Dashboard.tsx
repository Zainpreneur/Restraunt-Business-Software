import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api } from "../api/client";
import { DashboardSummary } from "../types";
import { Card, PageHeader, StatTile } from "../components/ui";

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => (await api.get<DashboardSummary>("/dashboard/summary")).data,
    refetchInterval: 30_000,
  });

  if (isLoading || !data) {
    return <div className="text-slate-400">Loading dashboard…</div>;
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Live snapshot of today's business" />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Orders Today" value={data.ordersToday} hint={`${data.completedToday} completed`} />
        <StatTile label="Revenue Today" value={`$${data.revenueToday.toFixed(2)}`} />
        <StatTile label="Avg Order Value" value={`$${data.avgOrderValue.toFixed(2)}`} />
        <StatTile
          label="Tables Occupied"
          value={`${data.tableStats.occupied}/${data.tableStats.total}`}
          hint={`${data.tableStats.available} available`}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="mb-3 text-sm font-semibold text-slate-700">Revenue — Last 7 Days</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.revenueSeries}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec6620" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ec6620" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => d.slice(5)}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
              <Area type="monotone" dataKey="revenue" stroke="#ec6620" fill="url(#rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-semibold text-slate-700">Top Menu Items (7 days)</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.topMenuItems} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 11, fill: "#475569" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip />
              <Bar dataKey="quantity" fill="#ec6620" radius={[0, 6, 6, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {data.lowStockCount > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <p className="mb-2 text-sm font-semibold text-amber-800">
            ⚠️ {data.lowStockCount} inventory item(s) at or below reorder level
          </p>
          <div className="flex flex-wrap gap-2">
            {data.lowStockItems.map((item) => (
              <span key={item.id} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                {item.name}: {item.quantity} {item.unit}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
