import { useEffect, useState } from "react";
import {
  Building2, ArrowLeft, ArrowRight, Smartphone, Landmark, CreditCard,
  Check, KeyRound, ShieldCheck, Eye, EyeOff, Camera, Mail,
  Lock, AlertTriangle, CheckCircle2, Sparkles, Users, BookOpen,
  ClipboardList, ChevronRight, Info,
} from "lucide-react";
import { registerSchool, fetchPlans, completeRegistration } from "../api";
import type { PlanItem } from "../api";
import { PhotoCapture } from "./PhotoCapture";

interface Props {
  onBack: () => void;
  onComplete: () => void;
}

const STEPS = [
  { id: "welcome", label: "Welcome", icon: Sparkles },
  { id: "school", label: "School Info", icon: Building2 },
  { id: "plan", label: "Choose Plan", icon: CreditCard },
  { id: "key", label: "Get Your Key", icon: KeyRound },
  { id: "activate", label: "Activate Account", icon: ShieldCheck },
  { id: "security", label: "Security Tips", icon: Lock },
];

export function RegistrationWizard({ onBack, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [schoolForm, setSchoolForm] = useState({
    school_name: "",
    admin_name: "",
    admin_email: "",
    admin_phone: "",
    address: "",
    plan_id: null as number | null,
    payment_method: "mobile_money" as "mobile_money" | "bank_account",
    payment_details: "",
  });

  const [activateForm, setActivateForm] = useState({
    key: "",
    email: "",
    full_name: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [profilePhoto, setProfilePhoto] = useState("");
  const [showPw, setShowPw] = useState(false);

  const loadPlans = () => {
    setPlansLoading(true);
    setError(null);
    fetchPlans()
      .then(setPlans)
      .catch((e) => { console.warn("Failed to load plans:", e.message); setError("Could not load plans. Check your connection and retry."); })
      .finally(() => setPlansLoading(false));
  };

  useEffect(() => { loadPlans(); }, []);

  const setSchool = (k: keyof typeof schoolForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setSchoolForm(p => ({ ...p, [k]: e.target.value }));

  const setActivate = (k: keyof typeof activateForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setActivateForm(p => ({ ...p, [k]: e.target.value }));

  const canNext = () => {
    switch (step) {
      case 0: return true;
      case 1: return schoolForm.school_name && schoolForm.admin_name && schoolForm.admin_email && schoolForm.admin_phone;
      case 2: return schoolForm.plan_id !== null && schoolForm.payment_details;
      case 3: return true;
      case 4: return activateForm.key && activateForm.email && activateForm.full_name && activateForm.password;
      case 5: return true;
      default: return false;
    }
  };

  const [submitted, setSubmitted] = useState(false);

  const handleSubmitSchool = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await registerSchool({
        school_name: schoolForm.school_name,
        admin_name: schoolForm.admin_name,
        admin_email: schoolForm.admin_email,
        admin_phone: schoolForm.admin_phone,
        address: schoolForm.address || undefined,
        plan_id: schoolForm.plan_id,
        payment_method: schoolForm.payment_method,
        payment_details: schoolForm.payment_details,
      });
      setSuccessMsg(res.message);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async () => {
    setError(null);
    if (!profilePhoto) { setError("Passport photo is required"); return; }
    if (activateForm.password !== activateForm.confirm) { setError("Passwords do not match"); return; }
    if (activateForm.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (!/[A-Z]/.test(activateForm.password)) { setError("Password must contain an uppercase letter"); return; }
    if (!/[a-z]/.test(activateForm.password)) { setError("Password must contain a lowercase letter"); return; }
    if (!/[0-9]/.test(activateForm.password)) { setError("Password must contain a digit"); return; }

    setSubmitting(true);
    try {
      const res = await completeRegistration({
        key: activateForm.key,
        email: activateForm.email,
        password: activateForm.password,
        full_name: activateForm.full_name,
        phone: activateForm.phone || undefined,
        profile_photo: profilePhoto,
      });
      setSuccessMsg(`Account created for ${res.school_name} (${res.school_code})`);
      setStep(5);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step === 2) { handleSubmitSchool(); return; }
    if (step === 4) { handleActivate(); return; }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
    setError(null);
  };
  const prev = () => { setStep(s => Math.max(s - 1, 0)); setError(null); };

  const selectedPlan = plans.find(p => p.id === schoolForm.plan_id);

  if (submitted) {
    return (
      <main className="login-screen">
        <div className="login-background-orb login-orb-1" />
        <div className="login-background-orb login-orb-2" />
        <section className="login-panel" style={{ maxWidth: 520 }}>
          <div className="login-brand">
            <div className="brand-mark">N</div>
            <div>
              <p>Smart School Management</p>
              <h1>Registration Received</h1>
            </div>
          </div>
          <div className="login-card">
            <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", background: "rgba(52,211,153,0.12)",
                border: "2px solid rgba(52,211,153,0.3)", display: "grid", placeItems: "center", margin: "0 auto 14px",
              }}>
                <CheckCircle2 size={32} style={{ color: "#34d399" }} />
              </div>
              <h2 style={{ fontSize: "1.15rem", color: "#f1f5f9", marginBottom: 6 }}>Thank You, {schoolForm.admin_name}!</h2>
              <p style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.6 }}>
                Your registration for <strong style={{ color: "#a5b4fc" }}>{schoolForm.school_name}</strong> has been received and is pending review.
              </p>
            </div>

            <div style={{
              padding: "14px", background: "rgba(102,126,234,0.08)", borderRadius: 10,
              border: "1px solid rgba(102,126,234,0.15)", marginTop: 12,
            }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#a5b4fc", marginBottom: 8 }}>What happens next?</div>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { num: "1", icon: ClipboardList, title: "Review", desc: "Our team reviews your registration and payment details within 24-48 hours." },
                  { num: "2", icon: Mail, title: "Email Your Key", desc: `A unique registration key will be sent to ${schoolForm.admin_email}.` },
                  { num: "3", icon: KeyRound, title: "Activate Account", desc: "Return to this page, click 'Activate Account', enter your key to create your admin login." },
                ].map(({ num, icon: Icon, title, desc }) => (
                  <div key={num} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%", background: "#667eea",
                      display: "grid", placeItems: "center", flexShrink: 0,
                      fontSize: "0.7rem", fontWeight: 700, color: "#fff",
                    }}>{num}</div>
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#f1f5f9" }}>{title}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              marginTop: 14, padding: "10px 14px", background: "rgba(251,191,36,0.08)",
              borderRadius: 10, border: "1px solid rgba(251,191,36,0.15)",
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
              <AlertTriangle size={16} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>
                <strong style={{ color: "#fbbf24" }}>Important:</strong> Check your email inbox (and spam folder) for the registration key. You cannot activate your account without it.
              </div>
            </div>

            <div className="login-actions" style={{ marginTop: 16, justifyContent: "center" }}>
              <button type="button" className="primary-button gradient-button" onClick={onBack}>
                <span><CheckCircle2 size={16} /> Back to Home</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="login-screen">
      <div className="login-background-orb login-orb-1" />
      <div className="login-background-orb login-orb-2" />
      <section className="login-panel" style={{ maxWidth: 560 }}>
        <div className="login-brand">
          <div className="brand-mark">N</div>
          <div>
            <p>Smart School Management</p>
            <h1>Register Your School</h1>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? "#667eea" : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem",
                color: active ? "#a5b4fc" : done ? "#34d399" : "rgba(255,255,255,0.3)",
                fontWeight: active ? 700 : 500,
              }}>
                <Icon size={13} />
                <span style={{ display: active ? "inline" : "none" }} className="step-label">{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="login-card">
          {step === 0 && <StepWelcome />}
          {step === 1 && <StepSchool form={schoolForm} setField={setSchool} />}
          {step === 2 && <StepPlan plans={plans} loading={plansLoading} selected={schoolForm.plan_id} onSelect={(id) => setSchoolForm(p => ({ ...p, plan_id: id }))} onRetry={loadPlans} paymentMethod={schoolForm.payment_method} paymentDetails={schoolForm.payment_details} onPaymentMethod={setSchool("payment_method")} onPaymentDetails={setSchool("payment_details")} />}
          {step === 3 && <StepKey successMsg={successMsg} />}
          {step === 4 && <StepActivate form={activateForm} setField={setActivate} profilePhoto={profilePhoto} onPhoto={setProfilePhoto} showPw={showPw} onTogglePw={() => setShowPw(!showPw)} />}
          {step === 5 && <StepSecurity successMsg={successMsg} />}

          {error && (
            <div className="login-error" style={{ marginTop: 12 }}>
              <span className="error-icon">⚠</span>{error}
            </div>
          )}

          <div className="login-actions" style={{ marginTop: 16 }}>
            {step > 0 ? (
              <button type="button" className="secondary-button" onClick={prev}>
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <button type="button" className="secondary-button" onClick={onBack}>
                <ArrowLeft size={16} /> Home
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" className="primary-button gradient-button" disabled={!canNext() || submitting} onClick={next}>
                {submitting ? (
                  <span className="button-with-spinner"><span className="spinner" /> Processing...</span>
                ) : step === 2 ? (
                  <span><Check size={16} /> Submit Registration</span>
                ) : step === 4 ? (
                  <span><ShieldCheck size={16} /> Activate Account</span>
                ) : (
                  <span>Next <ArrowRight size={16} /></span>
                )}
              </button>
            ) : (
              <button type="button" className="primary-button gradient-button" onClick={onComplete}>
                <span><CheckCircle2 size={16} /> Proceed to Login</span>
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function StepWelcome() {
  return (
    <div>
      <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
        <Sparkles size={36} style={{ color: "#a5b4fc", marginBottom: 8 }} />
        <h2 style={{ fontSize: "1.15rem", color: "#f1f5f9", marginBottom: 4 }}>Welcome to NOVARA SMS</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Smart School Management — Built for Ugandan Schools</p>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {[
          { icon: Users, title: "Multi-Role Access", desc: "Admin, teachers, bursars, librarians, and more" },
          { icon: BookOpen, title: "Full School Control", desc: "Students, attendance, fees, reports, library" },
          { icon: ShieldCheck, title: "Secure & Reliable", desc: "2FA, face recognition, encrypted data" },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
            background: "rgba(102,126,234,0.08)", borderRadius: 10, border: "1px solid rgba(102,126,234,0.15)",
          }}>
            <Icon size={20} style={{ color: "#667eea", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#f1f5f9" }}>{title}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 14, padding: "12px 14px", background: "rgba(52,211,153,0.08)",
        borderRadius: 10, border: "1px solid rgba(52,211,153,0.15)",
      }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#34d399", marginBottom: 4 }}>How it works</div>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.8 }}>
          <li>Fill in your school & admin details</li>
          <li>Choose a subscription plan</li>
          <li>Receive a registration key via email</li>
          <li>Activate your account with the key</li>
          <li>Start managing your school!</li>
        </ol>
      </div>
    </div>
  );
}

function StepSchool({ form, setField }: { form: any; setField: (k: string) => any }) {
  return (
    <div>
      <div className="login-card-title">
        <Building2 size={22} />
        <div>
          <p>Step 1</p>
          <h2>School & Admin Details</h2>
        </div>
      </div>
      <div className="login-form-fields">
        <label className="form-field">
          <span className="field-label">School Name *</span>
          <input value={form.school_name} onChange={setField("school_name")} placeholder="e.g. Kampala High School" className="field-input" required />
        </label>
        <label className="form-field">
          <span className="field-label">Admin Full Name *</span>
          <input value={form.admin_name} onChange={setField("admin_name")} placeholder="Your full name" className="field-input" required />
        </label>
        <label className="form-field">
          <span className="field-label">Admin Email *</span>
          <input type="email" value={form.admin_email} onChange={setField("admin_email")} placeholder="you@school.com" className="field-input" required />
        </label>
        <label className="form-field">
          <span className="field-label">Admin Phone *</span>
          <input type="tel" value={form.admin_phone} onChange={setField("admin_phone")} placeholder="+256 700 000000" className="field-input" required />
        </label>
        <label className="form-field">
          <span className="field-label">School Address</span>
          <textarea value={form.address} onChange={setField("address")} placeholder="P.O. Box, district, location" className="field-input" rows={2} />
        </label>
      </div>
    </div>
  );
}

function StepPlan({
  plans, loading, selected, onSelect, onRetry,
  paymentMethod, paymentDetails, onPaymentMethod, onPaymentDetails,
}: {
  plans: PlanItem[]; loading: boolean; selected: number | null; onSelect: (id: number) => void;
  onRetry: () => void;
  paymentMethod: string; paymentDetails: string;
  onPaymentMethod: (e: any) => void; onPaymentDetails: (e: any) => void;
}) {
  return (
    <div>
      <div className="login-card-title">
        <CreditCard size={22} />
        <div>
          <p>Step 2</p>
          <h2>Choose Plan & Payment</h2>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 20, color: "var(--muted)" }}>
          <span className="spinner" /> Loading plans...
        </div>
      ) : plans.length === 0 ? (
        <div style={{ textAlign: "center", padding: 20 }}>
          <p style={{ color: "var(--muted)", marginBottom: 8 }}>No plans available right now.</p>
          <button type="button" onClick={onRetry} style={{
            padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(102,126,234,0.4)",
            background: "rgba(102,126,234,0.15)", color: "#667eea", cursor: "pointer", fontWeight: 600,
          }}>Retry</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {plans.map(plan => {
            const sel = selected === plan.id;
            return (
              <button type="button" key={plan.id} onClick={() => onSelect(plan.id)} style={{
                display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12,
                alignItems: "center", padding: "12px 14px",
                border: `2px solid ${sel ? "rgba(102,126,234,0.6)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                background: sel ? "rgba(102,126,234,0.1)" : "rgba(30,41,59,0.5)", color: "#f1f5f9",
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  border: `2px solid ${sel ? "#667eea" : "rgba(255,255,255,0.2)"}`,
                  display: "grid", placeItems: "center",
                  background: sel ? "#667eea" : "transparent",
                }}>
                  {sel && <Check size={12} style={{ color: "#fff" }} />}
                </div>
                <div>
                  <strong style={{ fontSize: "0.9rem" }}>{plan.name}</strong>
                  <div style={{ display: "flex", gap: 10, fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>
                    <span>UGX {plan.price.toLocaleString()}</span>
                    <span>{plan.duration_days} days</span>
                    {plan.max_students && <span>Up to {plan.max_students} students</span>}
                  </div>
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#a5b4fc" }}>
                  UGX {plan.price.toLocaleString()}
                </div>
              </button>
            );
          })}
          {!loading && plans.length === 0 && (
            <div style={{ textAlign: "center", padding: 16, color: "var(--muted)", fontSize: "0.85rem" }}>
              No plans available. Contact the platform admin.
            </div>
          )}
        </div>
      )}

      {selected && (
        <div style={{ marginTop: 12 }}>
          <div className="login-card-title" style={{ marginTop: 0 }}>
            <Smartphone size={18} />
            <div>
              <p>Payment</p>
              <h2>Payment Method</h2>
            </div>
          </div>
          <div className="login-form-fields">
            <label className="form-field">
              <span className="field-label">Method *</span>
              <select value={paymentMethod} onChange={onPaymentMethod} className="field-input">
                <option value="mobile_money">Mobile Money (MTN/Airtel)</option>
                <option value="bank_account">Bank Account</option>
              </select>
            </label>
            <label className="form-field">
              <span className="field-label">
                {paymentMethod === "mobile_money" ? "Mobile Money Number *" : "Bank Account Details *"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {paymentMethod === "mobile_money" ? <Smartphone size={16} style={{ color: "var(--muted)", flexShrink: 0 }} /> : <Landmark size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />}
                <input value={paymentDetails} onChange={onPaymentDetails}
                  placeholder={paymentMethod === "mobile_money" ? "e.g. 0700 000000 (MTN)" : "Bank name, account name, number"}
                  className="field-input" required />
              </div>
              <small style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 4, display: "block" }}>
                Payment details will be sent to the Novara team for verification.
              </small>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function StepKey({ successMsg }: { successMsg: string | null }) {
  return (
    <div>
      <div className="login-card-title">
        <KeyRound size={22} />
        <div>
          <p>Step 3</p>
          <h2>Get Your Registration Key</h2>
        </div>
      </div>

      {successMsg && (
        <div style={{
          padding: "12px 14px", background: "rgba(52,211,153,0.08)", borderRadius: 10,
          border: "1px solid rgba(52,211,153,0.2)", marginBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <CheckCircle2 size={18} style={{ color: "#34d399" }} />
            <strong style={{ color: "#34d399", fontSize: "0.9rem" }}>Registration Submitted!</strong>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
            {successMsg}
          </p>
        </div>
      )}

      <div style={{
        padding: "14px", background: "rgba(102,126,234,0.08)", borderRadius: 10,
        border: "1px solid rgba(102,126,234,0.15)", marginBottom: 12,
      }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#a5b4fc", marginBottom: 8 }}>
          What happens next?
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {[
            { step: "1", icon: Mail, title: "Check Your Email", desc: "Our team reviews your registration and sends a unique key to your email within 48 hours." },
            { step: "2", icon: KeyRound, title: "Receive Your Key", desc: "You'll get an alphanumeric key like A1B2C3D4E5F6G7H8 — keep it safe!" },
            { step: "3", icon: ChevronRight, title: "Return Here", desc: "Come back to this page and click 'Next' to activate your account with the key." },
          ].map(({ step: s, icon: Icon, title, desc }) => (
            <div key={s} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", background: "#667eea",
                display: "grid", placeItems: "center", flexShrink: 0,
                fontSize: "0.7rem", fontWeight: 700, color: "#fff",
              }}>{s}</div>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#f1f5f9" }}>{title}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        padding: "10px 14px", background: "rgba(251,191,36,0.08)", borderRadius: 10,
        border: "1px solid rgba(251,191,36,0.15)", display: "flex", gap: 8, alignItems: "flex-start",
      }}>
        <Info size={16} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>
          <strong style={{ color: "#fbbf24" }}>Already have a key?</strong> Click <strong>Next</strong> to proceed to account activation.
        </div>
      </div>
    </div>
  );
}

function StepActivate({
  form, setField, profilePhoto, onPhoto, showPw, onTogglePw,
}: {
  form: any; setField: (k: string) => any;
  profilePhoto: string; onPhoto: (p: string) => void;
  showPw: boolean; onTogglePw: () => void;
}) {
  const pw = form.password;
  const hasLen = pw.length >= 8;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const pwScore = [hasLen, hasUpper, hasLower, hasDigit].filter(Boolean).length;

  return (
    <div>
      <div className="login-card-title">
        <ShieldCheck size={22} />
        <div>
          <p>Step 4</p>
          <h2>Activate Your Account</h2>
        </div>
      </div>
      <div className="login-form-fields">
        <label className="form-field">
          <span className="field-label">Registration Key *</span>
          <input value={form.key} onChange={setField("key")} placeholder="e.g. A1B2C3D4E5F6G7H8" className="field-input" required />
          <small style={{ color: "var(--muted)", fontSize: "0.75rem" }}>The key sent to your email after registration approval.</small>
        </label>
        <label className="form-field">
          <span className="field-label">Email Address *</span>
          <input type="email" value={form.email} onChange={setField("email")} placeholder="Must match registration email" className="field-input" required />
        </label>
        <label className="form-field">
          <span className="field-label">Full Name *</span>
          <input value={form.full_name} onChange={setField("full_name")} placeholder="Your full legal name" className="field-input" required />
        </label>
        <label className="form-field">
          <span className="field-label">Phone</span>
          <input type="tel" value={form.phone} onChange={setField("phone")} placeholder="+256 700 000000" className="field-input" />
        </label>
        <label className="form-field">
          <span className="field-label">Password *</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type={showPw ? "text" : "password"} value={form.password} onChange={setField("password")} placeholder="Min 8 chars, upper, lower, digit" className="field-input" required />
            <button type="button" className="tool-button" style={{ minHeight: 38, minWidth: 38, padding: 0 }} onClick={onTogglePw}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {pw.length > 0 && (
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  flex: 1, height: 3, borderRadius: 2,
                  background: i < pwScore ? (pwScore <= 2 ? "#ef4444" : pwScore === 3 ? "#fbbf24" : "#34d399") : "rgba(255,255,255,0.08)",
                }} />
              ))}
            </div>
          )}
          {pw.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {[
                { ok: hasLen, label: "8+ chars" },
                { ok: hasUpper, label: "Uppercase" },
                { ok: hasLower, label: "Lowercase" },
                { ok: hasDigit, label: "Digit" },
              ].map(({ ok, label }) => (
                <span key={label} style={{
                  fontSize: "0.68rem", padding: "2px 8px", borderRadius: 6,
                  background: ok ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.05)",
                  color: ok ? "#34d399" : "var(--muted)",
                  border: `1px solid ${ok ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.08)"}`,
                }}>
                  {ok ? "✓ " : ""}{label}
                </span>
              ))}
            </div>
          )}
        </label>
        <label className="form-field">
          <span className="field-label">Confirm Password *</span>
          <input type="password" value={form.confirm} onChange={setField("confirm")} placeholder="Repeat password" className="field-input" required />
        </label>
        <div className="form-field">
          <span className="field-label">Passport Photo *</span>
          <PhotoCapture onPhoto={onPhoto} />
        </div>
      </div>
    </div>
  );
}

function StepSecurity({ successMsg }: { successMsg: string | null }) {
  const tips = [
    { icon: Lock, title: "Use a Strong Password", desc: "Minimum 8 characters with uppercase, lowercase, and numbers. Never share your password.", color: "#667eea" },
    { icon: ShieldCheck, title: "Enable Two-Factor Auth", desc: "Go to Profile → Security after login and set up 2FA with an authenticator app for extra protection.", color: "#34d399" },
    { icon: Camera, title: "Register Your Face", desc: "Set up face recognition in your profile for quick and secure login on trusted devices.", color: "#a78bfa" },
    { icon: AlertTriangle, title: "Never Share Your Key", desc: "Your registration key is one-time use. Keep it confidential and delete after activation.", color: "#fbbf24" },
    { icon: Users, title: "Assign Roles Carefully", desc: "Only give admin access to trusted staff. Use role-based permissions to limit access.", color: "#f472b6" },
    { icon: BookOpen, title: "Regular Backups", desc: "Export student and financial data regularly from the system settings page.", color: "#38bdf8" },
  ];

  return (
    <div>
      <div className="login-card-title">
        <Lock size={22} />
        <div>
          <p>Step 5</p>
          <h2>Security Best Practices</h2>
        </div>
      </div>

      {successMsg && (
        <div style={{
          padding: "12px 14px", background: "rgba(52,211,153,0.08)", borderRadius: 10,
          border: "1px solid rgba(52,211,153,0.2)", marginBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={18} style={{ color: "#34d399" }} />
            <strong style={{ color: "#34d399", fontSize: "0.9rem" }}>{successMsg}</strong>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {tips.map(({ icon: Icon, title, desc, color }) => (
          <div key={title} style={{
            display: "flex", gap: 10, padding: "10px 12px", borderRadius: 10,
            background: `${color}08`, border: `1px solid ${color}20`,
          }}>
            <Icon size={18} style={{ color, flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#f1f5f9" }}>{title}</div>
              <div style={{ fontSize: "0.73rem", color: "var(--muted)", lineHeight: 1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 14, padding: "10px 14px", background: "rgba(102,126,234,0.08)",
        borderRadius: 10, border: "1px solid rgba(102,126,234,0.15)",
        fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6,
      }}>
        <strong style={{ color: "#a5b4fc" }}>NOVARA SMS</strong> is built with security at its core — all data is encrypted, sessions expire automatically, and every action is audit-logged.
      </div>
    </div>
  );
}
