import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "📊", roles: undefined },
  { to: "/pos", label: "Point of Sale", icon: "🧾", roles: undefined },
  { to: "/orders", label: "Orders", icon: "🍽️", roles: undefined },
  { to: "/tables", label: "Tables", icon: "🪑", roles: undefined },
  { to: "/reservations", label: "Reservations", icon: "📅", roles: undefined },
  { to: "/menu", label: "Menu", icon: "📋", roles: ["ADMIN", "MANAGER"] },
  { to: "/inventory", label: "Inventory", icon: "📦", roles: ["ADMIN", "MANAGER", "CHEF"] },
  { to: "/customers", label: "Customers", icon: "👥", roles: undefined },
  { to: "/staff", label: "Staff", icon: "🧑‍🍳", roles: ["ADMIN", "MANAGER"] },
];

export function Layout() {
  const { user, logout, hasRole } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <span className="text-2xl">🍴</span>
          <div>
            <p className="font-bold leading-tight text-slate-800">Bistro OS</p>
            <p className="text-xs text-slate-400">Restaurant Business Software</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.filter((item) => !item.roles || hasRole(...item.roles)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                )
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
