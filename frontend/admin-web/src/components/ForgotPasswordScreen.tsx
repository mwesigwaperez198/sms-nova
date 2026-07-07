import { useState } from "react";
import { ArrowLeft, Mail, KeyRound } from "lucide-react";

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000"}/api/v1/auth/forgot-password`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Request failed");
      setMessage("Reset code sent to your email/phone if the account exists.");
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000"}/api/v1/auth/reset-password-with-code`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code, new_password: newPassword }) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Reset failed");
      setMessage("Password reset successfully! You can now sign in.");
      setTimeout(() => onBack(), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
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
            <h1>{step === "request" ? "Forgot password" : "Reset code"}</h1>
          </div>
        </div>

        <form className="login-card glass-card" onSubmit={step === "request" ? handleRequestCode : handleResetPassword}>
          <div className="login-card-title">
            {step === "request" ? <Mail size={22} /> : <KeyRound size={22} />}
            <div>
              <p>Secure reset</p>
              <h2>{step === "request" ? "Enter your email address" : "Enter the code sent to you"}</h2>
            </div>
          </div>

          <div className="login-form-fields">
            {step === "request" ? (
              <label className="form-field">
                <span className="field-label">Email Address</span>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.com" className="field-input" type="email" required />
              </label>
            ) : (
              <>
                <label className="form-field">
                  <span className="field-label">Reset Code</span>
                  <input value={code} onChange={e => setCode(e.target.value)} placeholder="000000" className="field-input" required />
                </label>
                <label className="form-field">
                  <span className="field-label">New Password</span>
                  <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" type="password" className="field-input" required />
                </label>
                <label className="form-field">
                  <span className="field-label">Confirm Password</span>
                  <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" type="password" className="field-input" required />
                </label>
              </>
            )}
          </div>

          {error && <div className="login-error"><span className="error-icon">&#9888;</span>{error}</div>}
          {message && <div className="login-success">{message}</div>}

          <div className="login-actions">
            <button type="button" className="secondary-button" onClick={onBack}>
              <ArrowLeft size={15} /> Back
            </button>
            <button type="submit" className="primary-button gradient-button" disabled={loading}>
              {loading ? <span className="button-with-spinner"><span className="spinner" /> Processing...</span> : step === "request" ? "Send Reset Code" : "Reset Password"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
