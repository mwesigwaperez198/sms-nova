import { useState } from "react";
import { X, CheckCircle2, Copy, Eye, EyeOff } from "lucide-react";
import { useData } from "../hooks/useData";
import { getPlans, createSchool } from "../api/services";

interface SchoolAddModalProps {
  onClose: () => void;
}

interface ProvisionResult {
  id: number;
  name: string;
  school_code: string;
  admin_email: string;
  temp_password: string | null;
  api_key: string | null;
  detail: string;
}

export function SchoolAddModal({ onClose }: SchoolAddModalProps) {
  const { data: plans } = useData(getPlans);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    country: "Uganda",
    timezone: "Africa/Kampala",
    plan_id: 0,
    admin_email: "",
    admin_name: "",
    send_email: true,
  });

  const update = (field: string, value: string | number | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleProvision = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form } as any;
      if (!payload.plan_id || payload.plan_id === 0) delete payload.plan_id;
      const res = await createSchool(payload);
      setResult(res as any);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <h3 className="text-sm font-medium">School Provisioned</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300">
              <X size={18} />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-emerald-400">
              {result.detail}
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
              <InfoRow label="School" value={result.name} />
              <InfoRow label="Code" value={result.school_code} onCopy={() => copyText(result.school_code, "code")} copied={copied === "code"} />
              <InfoRow label="Admin Email" value={result.admin_email} />
            </div>

            {result.temp_password && (
              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Credentials</div>
                <InfoRow label="Password" value={result.temp_password}
                  isPassword showPw={showPw} onTogglePw={() => setShowPw(!showPw)}
                  onCopy={() => copyText(result.temp_password!, "pw")} copied={copied === "pw"} />
              </div>
            )}

            {result.api_key && (
              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider">API Key</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-zinc-300 font-mono break-all flex-1">{result.api_key}</code>
                  <button onClick={() => copyText(result.api_key!, "key")} className="p-1 rounded text-zinc-500 hover:text-zinc-300 shrink-0">
                    {copied === "key" ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400/80">
              Save these credentials — the temp password and API key won't be shown again.
            </div>
          </div>
          <div className="px-5 py-4 border-t border-zinc-800 flex justify-end">
            <button onClick={onClose} className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg px-4 py-2 transition-colors">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-medium">Add School</h3>
            <p className="text-xs text-zinc-500">Step {step} of 4</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-1.5 mb-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${s <= step ? "bg-indigo-500" : "bg-zinc-800"}`}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Basic Information</h4>
              <Field label="School Name" value={form.name} onChange={(v) => update("name", v)} />
              <Field label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} />
              <Field label="Phone" value={form.phone} onChange={(v) => update("phone", v)} />
              <Field label="Address" value={form.address} onChange={(v) => update("address", v)} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Country" value={form.country} onChange={(v) => update("country", v)} />
                <Field label="Timezone" value={form.timezone} onChange={(v) => update("timezone", v)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Subscription Plan</h4>
              {plans && plans.length > 0 ? (
                <div className="space-y-2">
                  {plans.map((plan) => (
                    <label
                      key={plan.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        form.plan_id === plan.id
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        checked={form.plan_id === plan.id}
                        onChange={() => update("plan_id", plan.id)}
                        className="text-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{plan.name}</div>
                        <div className="text-xs text-zinc-500">
                          UGX {plan.price_ugx.toLocaleString()}/mo &middot; {plan.max_students ?? "∞"} students
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400">{plan.rate_limit} req/min</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-600">No plans configured yet</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Admin Account</h4>
              <Field label="Admin Name" value={form.admin_name} onChange={(v) => update("admin_name", v)} />
              <Field label="Admin Email" type="email" value={form.admin_email} onChange={(v) => update("admin_email", v)} />
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.send_email}
                  onChange={(e) => update("send_email", e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-indigo-500"
                />
                Send credentials & API key via email
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Review & Provision</h4>
              <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2 text-sm">
                <Row label="School" value={form.name} />
                <Row label="Email" value={form.email} />
                <Row label="Plan" value={plans?.find((p) => p.id === form.plan_id)?.name || "No plan selected"} />
                <Row label="Admin" value={`${form.admin_name} <${form.admin_email}>`} />
                <Row label="Send Email" value={form.send_email ? "Yes" : "No"} />
              </div>
              <p className="text-xs text-zinc-600">
                This will create the school, subscription, admin account, generate an API key, and email credentials to the admin.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2 text-xs text-indigo-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-800">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)}
            disabled={step === 1}
            className="text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>
          {step < 4 ? (
            <button
              onClick={() => setStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleProvision}
              disabled={saving}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {saving ? "Provisioning..." : "Provision School"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 text-right">{value}</span>
    </div>
  );
}

function InfoRow({ label, value, isPassword, showPw, onTogglePw, onCopy, copied }: {
  label: string; value: string; isPassword?: boolean; showPw?: boolean; onTogglePw?: () => void;
  onCopy?: () => void; copied?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="flex items-center gap-2">
        <code className="text-sm text-zinc-200 font-mono">
          {isPassword && !showPw ? "••••••••" : value}
        </code>
        {isPassword && (
          <button onClick={onTogglePw} className="p-0.5 text-zinc-500 hover:text-zinc-300">
            {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
        {onCopy && (
          <button onClick={onCopy} className="p-0.5 text-zinc-500 hover:text-zinc-300">
            {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
        )}
      </div>
    </div>
  );
}
