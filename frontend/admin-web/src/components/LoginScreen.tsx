import { useState } from "react";
import { Lock } from "lucide-react";
import type { Session } from "../api";
import { roles } from "../data/mockData";

interface LoginScreenProps {
  loading: boolean;
  error: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onSession: (session: Session) => void;
}

export function LoginScreen({ loading, error, onLogin, onSession }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showDemo, setShowDemo] = useState(false);

  const handleDemoLogin = (roleKey: string) => {
    const roleMap: Record<string, number> = {
      "super-admin": 1, admin: 2, teacher: 3, parent: 4,
      student: 5, bursar: 6, secretary: 7, librarian: 8
    };
    const role = roles.find(r => r.key === roleKey);
    onSession({
      token: "demo-token",
      refreshToken: "demo-refresh-token",
      user: {
        email: role?.email ?? `${roleKey}@demo.local`,
        full_name: role?.label ?? roleKey,
        role: role?.label ?? roleKey,
        role_key: roleKey as any,
        school: "Nova Demonstration School"
      }
    });
  };

  return (
    <main className="login-screen">
      <div className="login-background-orb login-orb-1" />
      <div className="login-background-orb login-orb-2" />
      <section className="login-panel">
        <div className="login-brand">
          <div className="brand-mark">N</div>
          <div>
            <p>Smart School Management</p>
            <h1>Welcome back</h1>
          </div>
        </div>

        <form
          className="login-card glass-card"
          onSubmit={(event) => {
            event.preventDefault();
            void onLogin(email, password);
          }}
        >
          <div className="login-card-title">
            <Lock size={22} />
            <div>
              <p>Secure workspace</p>
              <h2>Sign in to your account</h2>
            </div>
          </div>

          <div className="login-form-fields">
            <label className="form-field">
              <span className="field-label">Email Address</span>
              <input 
                value={email} 
                onChange={(event) => setEmail(event.target.value)} 
                placeholder="you@school.com" 
                className="field-input"
              />
            </label>

            <label className="form-field">
              <span className="field-label">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                type="password"
                className="field-input"
              />
            </label>
          </div>

          {error && <div className="login-error"><span className="error-icon">⚠</span>{error}</div>}

          <div className="login-actions">
            <button 
              type="button" 
              className={`secondary-button ${showDemo ? 'active' : ''}`} 
              onClick={() => setShowDemo(!showDemo)}
            >
              {showDemo ? "Hide" : "Show"} Demo
            </button>
            <button type="submit" className="primary-button gradient-button" disabled={loading}>
              {loading ? (
                <span className="button-with-spinner">
                  <span className="spinner" /> Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </div>
        </form>

        {showDemo ? (
          <div className="login-help">
            <p>Or select a role to view a demo of its workspace:</p>
            <div className="demo-roles">
              {roles.map((role) => (
                <button
                  key={role.key}
                  type="button"
                  className="secondary-button"
                  onClick={() => handleDemoLogin(role.key)}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
