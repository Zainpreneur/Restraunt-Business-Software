import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";
import { Button, Input } from "../components/ui";

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@restaurant.com" },
  { role: "Manager", email: "manager@restaurant.com" },
  { role: "Waiter", email: "waiter@restaurant.com" },
  { role: "Chef", email: "chef@restaurant.com" },
];

export default function Login() {
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState("admin@restaurant.com");
  const [password, setPassword] = useState("password123");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">🍴</div>
          <h1 className="text-xl font-bold text-slate-800">Bistro OS</h1>
          <p className="text-sm text-slate-500">Sign in to manage your restaurant</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Email</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Password</label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Demo accounts (password: password123)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => setEmail(a.email)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-left text-xs hover:bg-slate-50"
              >
                <span className="font-semibold text-slate-700">{a.role}</span>
                <br />
                <span className="text-slate-400">{a.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
