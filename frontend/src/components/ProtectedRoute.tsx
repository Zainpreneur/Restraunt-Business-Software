import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ roles }: { roles?: string[] }) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !hasRole(...roles)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-slate-500">
        <p className="text-lg font-semibold">Access restricted</p>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }
  return <Outlet />;
}
