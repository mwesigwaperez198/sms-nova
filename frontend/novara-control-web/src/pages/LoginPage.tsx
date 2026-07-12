import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center text-lg font-bold mx-auto mb-3">
            N
          </div>
          <h1 className="text-lg font-semibold">NOVARA System Control</h1>
          <p className="text-zinc-500 text-sm mt-1">Sign in to manage all schools</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              placeholder="admin@novara.tech"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-indigo-300 text-xs bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2">
              {error.includes("Invalid credentials") ? (
                <div>
                  <p className="font-medium mb-1">Login failed</p>
                  <p className="text-indigo-300/80">Invalid email or password. Only NOVARA platform admins (role_id=1) can access this panel.</p>
                </div>
              ) : error.includes("Request failed") ? (
                <div>
                  <p className="font-medium mb-1">Connection error</p>
                  <p className="text-indigo-300/80">Cannot reach the server. Check your connection and try again.</p>
                </div>
              ) : (
                error
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-600 mt-6">
          &copy; {new Date().getFullYear()} Novara System Software LTD
        </p>
      </div>
    </div>
  );
}
