import { useState } from "react";
import { UserPlus, ArrowLeft, KeyRound, Eye, EyeOff, Camera } from "lucide-react";
import { completeRegistration } from "../api";
import { PhotoCapture } from "./PhotoCapture";

interface SignUpScreenProps {
  onBack: () => void;
  onComplete: () => void;
}

export function SignUpScreen({ onBack, onComplete }: SignUpScreenProps) {
  const [form, setForm] = useState({
    key: "",
    email: "",
    full_name: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [profilePhoto, setProfilePhoto] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!profilePhoto) {
      setError("Passport photo is required for all users");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(form.password)) {
      setError("Password must contain at least 1 uppercase letter");
      return;
    }
    if (!/[a-z]/.test(form.password)) {
      setError("Password must contain at least 1 lowercase letter");
      return;
    }
    if (!/[0-9]/.test(form.password)) {
      setError("Password must contain at least 1 digit");
      return;
    }

    setSubmitting(true);
    try {
      const res = await completeRegistration({
        key: form.key,
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone || undefined,
        profile_photo: profilePhoto,
      });
      setResult(`Account created for ${res.school_name} (${res.school_code}). You can now log in.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <main className="login-screen">
        <div className="login-background-orb login-orb-1" />
        <div className="login-background-orb login-orb-2" />
        <section className="login-panel">
          <div className="login-brand">
            <div className="brand-mark">N</div>
            <div>
              <p>Smart School Management</p>
              <h1>Welcome Aboard!</h1>
            </div>
          </div>
          <div className="login-card">
            <div className="notice" style={{textAlign:"center",padding:24}}>
              <UserPlus size={40} style={{margin:"0 auto 12px",display:"block"}} />
              <strong style={{fontSize:"1.1rem"}}>{result}</strong>
            </div>
            <button className="primary-button gradient-button" onClick={onComplete}>
              Proceed to Login
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="login-screen">
      <div className="login-background-orb login-orb-1" />
      <div className="login-background-orb login-orb-2" />
      <section className="login-panel">
        <div className="login-brand">
          <div className="brand-mark">N</div>
          <div>
            <p>Smart School Management</p>
            <h1>Activate Your Account</h1>
          </div>
        </div>
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-card-title">
            <KeyRound size={22} />
            <div>
              <p>Registration key required</p>
              <h2>Enter your key & create account</h2>
            </div>
          </div>

          <div className="login-form-fields">
            <label className="form-field">
              <span className="field-label">Registration Key *</span>
              <input value={form.key} onChange={set("key")} placeholder="e.g. A1B2C3D4E5F6G7H8" className="field-input" required />
              <small style={{color:"var(--muted)",fontSize:"0.75rem"}}>Check your email for the key sent after registration approval.</small>
            </label>
            <label className="form-field">
              <span className="field-label">Email Address *</span>
              <input type="email" value={form.email} onChange={set("email")} placeholder="Must match registration email" className="field-input" required />
            </label>
            <label className="form-field">
              <span className="field-label">Full Name *</span>
              <input value={form.full_name} onChange={set("full_name")} placeholder="Your full legal name" className="field-input" required />
            </label>
            <label className="form-field">
              <span className="field-label">Phone (optional)</span>
              <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+256 700 000000" className="field-input" />
            </label>
            <label className="form-field">
              <span className="field-label">Password *</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="Min 8 chars, uppercase, lowercase, digit" className="field-input" required />
                <button type="button" className="tool-button" style={{minHeight:38,minWidth:38,padding:0}} onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
              </div>
            </label>
            <label className="form-field">
              <span className="field-label">Confirm Password *</span>
              <input type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" className="field-input" required />
            </label>
            <div className="form-field">
              <span className="field-label">Passport Photo *</span>
              <PhotoCapture onPhoto={setProfilePhoto} />
            </div>
          </div>

          {error && <div className="login-error"><span className="error-icon">⚠</span>{error}</div>}
          <div className="login-actions">
            <button type="button" className="secondary-button" onClick={onBack}><ArrowLeft size={16}/> Back</button>
            <button type="submit" className="primary-button gradient-button" disabled={submitting}>
              {submitting ? <span className="button-with-spinner"><span className="spinner" /> Activating...</span> : "Activate Account"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
