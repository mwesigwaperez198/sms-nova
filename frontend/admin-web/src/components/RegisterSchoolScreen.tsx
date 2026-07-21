import { useEffect, useState } from "react";
import { Building2, ArrowLeft, Smartphone, Landmark, CreditCard, Check } from "lucide-react";
import { registerSchool, fetchPlans } from "../api";
import type { PlanItem } from "../api";
import { NovaraLogo } from "./NovaraLogo";

interface RegisterSchoolScreenProps {
  onBack: () => void;
}

export function RegisterSchoolScreen({ onBack }: RegisterSchoolScreenProps) {
  const [form, setForm] = useState({
    school_name: "",
    admin_name: "",
    admin_email: "",
    admin_phone: "",
    address: "",
    plan_id: null as number | null,
    payment_method: "mobile_money" as "mobile_money" | "bank_account",
    payment_details: "",
  });
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans()
      .then(setPlans)
      .catch((e) => { setError("Failed to load plans: " + e.message); })
      .finally(() => setPlansLoading(false));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plan_id) { setError("Please select a subscription plan"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await registerSchool({ ...form, plan_id: form.plan_id });
      setResult(res.message);
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
            <NovaraLogo size={40} />
            <div>
              <p>Smart School Management</p>
              <h1>Registration Submitted</h1>
            </div>
          </div>
          <div className="login-card">
            <div className="notice" style={{textAlign:"center",padding:24}}>
              <Building2 size={40} style={{margin:"0 auto 12px",display:"block"}} />
              <strong style={{fontSize:"1.1rem"}}>{result}</strong>
              <p style={{marginTop:12,color:"var(--muted)",fontSize:"0.9rem"}}>
                Once verified, you will receive a registration key via email to complete your sign up.
              </p>
            </div>
            <button className="primary-button gradient-button" onClick={onBack}>
              Back to Home
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
            <NovaraLogo size={40} />
            <div>
              <p>Smart School Management</p>
              <h1>Register Your School</h1>
          </div>
        </div>
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-card-title">
            <Building2 size={22} />
            <div>
              <p>New school registration</p>
              <h2>School & Admin Details</h2>
            </div>
          </div>

          <div className="login-form-fields">
            <label className="form-field">
              <span className="field-label">School Name *</span>
              <input value={form.school_name} onChange={set("school_name")} placeholder="e.g. Kampala High School" className="field-input" required />
            </label>
            <label className="form-field">
              <span className="field-label">Admin Full Name *</span>
              <input value={form.admin_name} onChange={set("admin_name")} placeholder="Your full name" className="field-input" required />
            </label>
            <label className="form-field">
              <span className="field-label">Admin Email *</span>
              <input type="email" value={form.admin_email} onChange={set("admin_email")} placeholder="you@school.com" className="field-input" required />
            </label>
            <label className="form-field">
              <span className="field-label">Admin Phone *</span>
              <input type="tel" value={form.admin_phone} onChange={set("admin_phone")} placeholder="+256 700 000000" className="field-input" required />
            </label>
            <label className="form-field">
              <span className="field-label">School Address</span>
              <textarea value={form.address} onChange={set("address")} placeholder="P.O. Box, district, location" className="field-input" rows={2} />
            </label>
          </div>

          <div className="login-card-title" style={{marginTop:16}}>
            <CreditCard size={22} />
            <div>
              <p>Choose your plan</p>
              <h2>Subscription Plan</h2>
            </div>
          </div>

          {plansLoading ? (
            <div style={{textAlign:"center",padding:20,color:"var(--muted)"}}>
              <span className="spinner" /> Loading plans...
            </div>
          ) : (
            <div style={{display:"grid",gap:10,marginTop:8}}>
              {plans.map(plan => {
                const selected = form.plan_id === plan.id;
                return (
                  <button
                    type="button"
                    key={plan.id}
                    onClick={() => setForm(p => ({ ...p, plan_id: plan.id }))}
                    style={{
                      display:"grid",
                      gridTemplateColumns:"auto 1fr auto",
                      gap:14,
                      alignItems:"center",
                      padding:"14px 16px",
                      border: `2px solid ${selected ? "rgba(102,126,234,0.6)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius:12,
                      background: selected ? "rgba(102,126,234,0.1)" : "rgba(30,41,59,0.5)",
                      color:"#f1f5f9",
                      cursor:"pointer",
                      textAlign:"left",
                      transition:"all 0.2s",
                    }}
                  >
                    <div style={{
                      width:22,height:22,borderRadius:"50%",
                      border: `2px solid ${selected ? "#667eea" : "rgba(255,255,255,0.2)"}`,
                      display:"grid",placeItems:"center",
                      background: selected ? "#667eea" : "transparent",
                    }}>
                      {selected && <Check size={14} style={{color:"#fff"}} />}
                    </div>
                    <div>
                      <strong style={{fontSize:"0.95rem"}}>{plan.name}</strong>
                      <div style={{display:"flex",gap:12,fontSize:"0.8rem",color:"var(--muted)",marginTop:2}}>
                        <span>UGX {plan.price.toLocaleString()}</span>
                        <span>{plan.duration_days}d</span>
                        {plan.max_students && <span>Up to {plan.max_students} students</span>}
                      </div>
                    </div>
                    <div style={{fontSize:"0.9rem",fontWeight:700,color:"#a5b4fc"}}>
                      UGX {plan.price.toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="login-card-title" style={{marginTop:16}}>
            <Smartphone size={22} />
            <div>
              <p>Payment details</p>
              <h2>Payment Method</h2>
            </div>
          </div>

          <div className="login-form-fields">
            <label className="form-field">
              <span className="field-label">Payment Method *</span>
              <select value={form.payment_method} onChange={set("payment_method")} className="field-input">
                <option value="mobile_money">Mobile Money (MTN/Airtel)</option>
                <option value="bank_account">Bank Account</option>
              </select>
            </label>
            <label className="form-field">
              <span className="field-label">
                {form.payment_method === "mobile_money" ? "Mobile Money Number *" : "Bank Account Details *"}
              </span>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {form.payment_method === "mobile_money" ? <Smartphone size={18} style={{color:"var(--muted)",flexShrink:0}} /> : <Landmark size={18} style={{color:"var(--muted)",flexShrink:0}} />}
                <input value={form.payment_details} onChange={set("payment_details")}
                  placeholder={form.payment_method === "mobile_money" ? "e.g. 256 700 000000 (MTN)" : "Bank name, account name, account number"}
                  className="field-input" required />
              </div>
              <small style={{color:"var(--muted)",fontSize:"0.78rem",marginTop:4,display:"block"}}>
                Your payment info will be sent to the Novara team for verification along with your plan selection.
              </small>
            </label>
          </div>

          {error && <div className="login-error"><span className="error-icon">⚠</span>{error}</div>}
          <div className="login-actions">
            <button type="button" className="secondary-button" onClick={onBack}>
              <ArrowLeft size={16}/> Back
            </button>
            <button type="submit" className="primary-button gradient-button" disabled={submitting || !form.plan_id}>
              {submitting ? <span className="button-with-spinner"><span className="spinner" /> Submitting...</span> : "Submit Registration"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
