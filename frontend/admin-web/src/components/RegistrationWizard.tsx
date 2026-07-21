import { useEffect, useState } from "react";
import {
  Building2, ArrowLeft, ArrowRight, Smartphone, Landmark, CreditCard,
  Check, KeyRound, ShieldCheck, Mail, Users, BookOpen, Sparkles, Info,
} from "lucide-react";
import { registerSchool, fetchPlans, checkRegistrationEmail } from "../api";
import type { PlanItem } from "../api";
import { NovaraLogo } from "./NovaraLogo";

interface Props {
  onBack: () => void;
  onComplete: () => void;
}

const STEPS = [
  { id: "welcome", label: "Welcome", icon: Sparkles },
  { id: "school", label: "School Info", icon: Building2 },
  { id: "plan", label: "Choose Plan", icon: CreditCard },
  { id: "done", label: "Done", icon: Check },
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

  const canNext = () => {
    switch (step) {
      case 0: return true;
      case 1: return schoolForm.school_name && schoolForm.admin_name && schoolForm.admin_email && schoolForm.admin_phone;
      case 2: return schoolForm.plan_id !== null && schoolForm.payment_details;
      case 3: return true;
      default: return false;
    }
  };

  const [submitted, setSubmitted] = useState(false);

  const handleSubmitSchool = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const emailCheck = await checkRegistrationEmail(schoolForm.admin_email);
      if (emailCheck.registered) {
        if (emailCheck.status === "pending") {
          setError(`This email already has a pending registration (ID: ${emailCheck.request_id}) for "${emailCheck.school_name}". Contact the platform admin to approve it, or use a different email.`);
          setSubmitting(false);
          return;
        }
        if (emailCheck.status === "approved") {
          setError(`This email already has an approved registration (ID: ${emailCheck.request_id}) for "${emailCheck.school_name}". Use the "Activate Account" button on the login page with your registration key.`);
          setSubmitting(false);
          return;
        }
      }
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
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step === 2) { handleSubmitSchool(); return; }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
    setError(null);
  };
  const prev = () => { setStep(s => Math.max(s - 1, 0)); setError(null); };

  if (submitted) {
    return (
      <main className="login-screen">
        <div className="login-background-orb login-orb-1" />
        <div className="login-background-orb login-orb-2" />
        <section className="login-panel" style={{ maxWidth: 520 }}>
          <div className="login-brand">
            <NovaraLogo size={40} />
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
                <Check size={32} style={{ color: "#34d399" }} />
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
                  { num: "1", icon: ShieldCheck, title: "Admin Reviews", desc: "Our team reviews your registration and verifies payment within 24-48 hours." },
                  { num: "2", icon: Mail, title: "Credentials Emailed", desc: `Your login email and temporary password will be sent to ${schoolForm.admin_email}.` },
                  { num: "3", icon: KeyRound, title: "Log In & Start", desc: "Use the credentials from the email to log in. Change your password on first login." },
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
              <Info size={16} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>
                <strong style={{ color: "#fbbf24" }}>Already have a registration key?</strong> Go back to the login page and click <strong>"Activate Account"</strong>.
              </div>
            </div>

            <div className="login-actions" style={{ marginTop: 16, justifyContent: "center" }}>
              <button type="button" className="primary-button gradient-button" onClick={onBack}>
                <span><Check size={16} /> Back to Home</span>
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
            <NovaraLogo size={40} />
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
          {step === 3 && <StepDone successMsg={successMsg} />}

          {error && (
            <div style={{
              marginTop: 12, padding: "10px 14px", borderRadius: 10, fontSize: "0.8rem",
              background: "rgba(102,126,234,0.08)", border: "1px solid rgba(102,126,234,0.2)",
              color: "#a5b4fc", lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          <div className="login-actions" style={{ marginTop: 16 }}>
            {step > 0 && step < 3 ? (
              <button type="button" className="secondary-button" onClick={prev}>
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <button type="button" className="secondary-button" onClick={onBack}>
                <ArrowLeft size={16} /> Home
              </button>
            )}
            {step < 2 ? (
              <button type="button" className="primary-button gradient-button" disabled={!canNext() || submitting} onClick={next}>
                <span>Next <ArrowRight size={16} /></span>
              </button>
            ) : step === 2 ? (
              <button type="button" className="primary-button gradient-button" disabled={!canNext() || submitting} onClick={next}>
                {submitting ? (
                  <span className="button-with-spinner"><span className="spinner" /> Processing...</span>
                ) : (
                  <span><Check size={16} /> Submit Registration</span>
                )}
              </button>
            ) : (
              <button type="button" className="primary-button gradient-button" onClick={onComplete}>
                <span><Check size={16} /> Proceed to Login</span>
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
          <li>Wait for admin review (24-48 hours)</li>
          <li>Receive login credentials via email</li>
          <li>Log in and start managing your school!</li>
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
        </div>
      )}

      {selected && (
        <div style={{ marginTop: 12 }}>
          <div className="login-card-title" style={{ marginTop: 0 }}>
            <Smartphone size={18} />
            <div>
              <p>Payment</p>
              <h2>How to Pay</h2>
            </div>
          </div>

          <div style={{
            padding: "14px", background: "rgba(102,126,234,0.08)", borderRadius: 10,
            border: "1px solid rgba(102,126,234,0.15)", marginBottom: 12,
          }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#a5b4fc", marginBottom: 8 }}>
              NOVARA Payment Accounts
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{
                padding: "10px 12px", borderRadius: 8,
                background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.12)",
              }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#fbbf24", marginBottom: 4 }}>MTN Mobile Money</div>
                <div style={{ fontSize: "0.85rem", color: "#f1f5f9", fontFamily: "monospace" }}>0765 866 555</div>
                <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>Name: Novara System Software LTD</div>
              </div>
              <div style={{
                padding: "10px 12px", borderRadius: 8,
                background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)",
              }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#34d399", marginBottom: 4 }}>Airtel Money</div>
                <div style={{ fontSize: "0.85rem", color: "#f1f5f9", fontFamily: "monospace" }}>0765 866 555</div>
                <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>Name: Novara System Software LTD</div>
              </div>
              <div style={{
                padding: "10px 12px", borderRadius: 8,
                background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)",
              }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#818cf8", marginBottom: 4 }}>Bank Account</div>
                <div style={{ fontSize: "0.85rem", color: "#f1f5f9" }}>Centenary Bank — Kampala Road Branch</div>
                <div style={{ fontSize: "0.8rem", color: "#f1f5f9", fontFamily: "monospace", marginTop: 2 }}>A/C: 20012345678</div>
                <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>Name: Novara System Software LTD</div>
              </div>
            </div>
          </div>

          <div style={{
            padding: "10px 14px", background: "rgba(52,211,153,0.08)", borderRadius: 10,
            border: "1px solid rgba(52,211,153,0.15)", marginBottom: 12,
          }}>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>
              <strong style={{ color: "#34d399" }}>Steps:</strong> Send payment to any account above. Then enter your payment reference below so our team can verify.
            </div>
          </div>

          <div className="login-form-fields">
            <label className="form-field">
              <span className="field-label">Payment Method *</span>
              <select value={paymentMethod} onChange={onPaymentMethod} className="field-input">
                <option value="mobile_money">Mobile Money (MTN/Airtel)</option>
                <option value="bank_account">Bank Transfer</option>
              </select>
            </label>
            <label className="form-field">
              <span className="field-label">
                Your Payment Reference / Transaction ID *
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {paymentMethod === "mobile_money" ? <Smartphone size={16} style={{ color: "var(--muted)", flexShrink: 0 }} /> : <Landmark size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />}
                <input value={paymentDetails} onChange={onPaymentDetails}
                  placeholder={paymentMethod === "mobile_money" ? "e.g. MTN TXN: QK4XYZ1234 or your phone number" : "Bank slip number or deposit reference"}
                  className="field-input" required />
              </div>
              <small style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 4, display: "block" }}>
                Enter the transaction ID, receipt number, or phone number you paid from. Our team will verify before approving.
              </small>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function StepDone({ successMsg }: { successMsg: string | null }) {
  return (
    <div style={{ textAlign: "center", padding: "8px 0" }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%", background: "rgba(52,211,153,0.12)",
        border: "2px solid rgba(52,211,153,0.3)", display: "grid", placeItems: "center", margin: "0 auto 14px",
      }}>
        <Check size={32} style={{ color: "#34d399" }} />
      </div>
      <h2 style={{ fontSize: "1.15rem", color: "#f1f5f9", marginBottom: 6 }}>Registration Submitted!</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: 16 }}>
        {successMsg || "Your registration has been received. Our team will review it within 24-48 hours."}
      </p>
      <div style={{
        padding: "14px", background: "rgba(102,126,234,0.08)", borderRadius: 10,
        border: "1px solid rgba(102,126,234,0.15)", textAlign: "left",
      }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#a5b4fc", marginBottom: 8 }}>
          What happens next?
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {[
            { step: "1", icon: ShieldCheck, title: "Admin Reviews", desc: "Our team reviews your registration and verifies payment details." },
            { step: "2", icon: Mail, title: "Credentials Emailed", desc: "Login email and temporary password sent to your email." },
            { step: "3", icon: KeyRound, title: "Log In & Start", desc: "Use the credentials to log in and start managing your school." },
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
    </div>
  );
}
