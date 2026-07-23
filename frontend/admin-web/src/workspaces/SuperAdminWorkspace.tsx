import { useEffect, useState, useRef } from "react";
import { ShieldCheck, Server, AlertTriangle, CheckCircle, Clock, Activity, Settings, Ticket, Search, FileText, Key, CreditCard, Users, Eye, Ban, Check, X, Plus, RefreshCw, Trash2, Globe, Mail, Phone as PhoneIcon, Copy, ClipboardCheck, Building2, User, Calendar } from "lucide-react";
import type { AuditLogItem, KeyItem, PlanItem, PlatformStats, RegistrationRequestItem, SchoolAdminItem, SchoolDetail, PlatformUserItem, ApiKeyItem, SystemCheckItem, AddSchoolPayload } from "../api";
import { printElement, exportAsCSV } from "../utils/exportUtils";
import {
  fetchPlatformStats, fetchPlatformSchools, fetchSchoolDetail, toggleSchoolStatus,
  fetchRegistrations, approveRegistration,
  fetchPlans, createPlan,
  fetchKeys, generateKey,
  fetchPlatformAuditLogs, fetchPlatformUsers,
  fetchApiKeys, generateApiKey, revokeApiKey,
  triggerSystemCheck, fetchSystemChecks,
  addSchool,
} from "../api";
import type { ConnectedData } from "../api";

function copyToClipboard(text: string, onSuccess?: () => void) {
  navigator.clipboard.writeText(text).then(() => onSuccess?.()).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    onSuccess?.();
  });
}

interface SuperAdminWorkspaceProps {
  view: string;
  data: ConnectedData;
  onViewChange?: (view: string) => void;
}

export function SuperAdminWorkspace({ view, data, onViewChange }: SuperAdminWorkspaceProps) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Real data states
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [schools, setSchools] = useState<SchoolAdminItem[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRequestItem[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [platformUsers, setPlatformUsers] = useState<PlatformUserItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    Promise.allSettled([
      fetchPlatformStats().then(setStats),
      fetchPlatformSchools().then(setSchools),
      fetchRegistrations().then(setRegistrations),
      fetchPlans().then(setPlans),
      fetchKeys().then(setKeys),
      fetchPlatformAuditLogs(100).then(setAuditLogs),
      fetchPlatformUsers().then(setPlatformUsers),
    ]).then(results => {
      const failures = results.filter(r => r.status === "rejected");
      if (failures.length === results.length) {
        setLoadError("Failed to load data. Check your login session and try again.");
      } else if (failures.length > 0) {
        setLoadError(`Some data failed to load (${failures.length} of ${results.length}). Showing partial data.`);
      }
    }).finally(() => setLoading(false));
  }, []);

  const filteredSchools = schools.filter(s =>
    (!search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.school_code?.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || s.subscription_status === statusFilter)
  );

  const filteredAuditLogs = auditLogs.filter(l =>
    !search || l.action?.toLowerCase().includes(search.toLowerCase()) || l.actor_name?.toLowerCase().includes(search.toLowerCase())
  );

  const LoadingBanner = () => loading ? (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 12, background: "rgba(102,126,234,0.08)", borderRadius: 8, border: "1px solid rgba(102,126,234,0.15)" }}>
      <span className="spinner" />
      <span style={{ fontSize: "0.82rem", color: "#a5b4fc" }}>Loading platform data...</span>
    </div>
  ) : null;

  const ErrorBanner = () => loadError ? (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 12, background: "rgba(239,68,68,0.08)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.15)" }}>
      <AlertTriangle size={16} style={{ color: "#ef4444", flexShrink: 0 }} />
      <span style={{ fontSize: "0.82rem", color: "#fca5a5" }}>{loadError}</span>
      <button onClick={() => { setLoading(true); setLoadError(null); Promise.allSettled([
        fetchPlatformStats().then(setStats),
        fetchPlatformSchools().then(setSchools),
        fetchRegistrations().then(setRegistrations),
        fetchPlans().then(setPlans),
        fetchKeys().then(setKeys),
        fetchPlatformAuditLogs(100).then(setAuditLogs),
        fetchPlatformUsers().then(setPlatformUsers),
      ]).then(r => { const f = r.filter(x => x.status === "rejected"); if (f.length === r.length) setLoadError("Failed to load data."); }).finally(() => setLoading(false)); }}
        style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#fca5a5", fontSize: "0.75rem", cursor: "pointer" }}>
        Retry
      </button>
    </div>
  ) : null;

  const Metrics = () => {
    const s = stats;
    return (
      <>
        <LoadingBanner />
        <ErrorBanner />
        <div className="metric-grid">
          <div className="metric teal"><div className="metric-icon"><ShieldCheck size={22}/></div><div className="metric-body"><strong>{(s?.active_schools ?? 0)}</strong><span>Active Schools</span></div></div>
          <div className="metric green"><div className="metric-icon"><Activity size={22}/></div><div className="metric-body"><strong>{(s?.total_students ?? 0).toLocaleString()}</strong><span>Total Students</span></div></div>
          <div className="metric red" style={{cursor:"pointer"}} onClick={() => onViewChange?.("System Alerts")}><div className="metric-icon"><AlertTriangle size={22}/></div><div className="metric-body"><strong>{s?.pending_registrations ?? 0}</strong><span>Pending Registrations</span></div></div>
          <div className="metric blue"><div className="metric-icon"><Key size={22}/></div><div className="metric-body"><strong>{s?.keys_generated_30d ?? 0}</strong><span>Keys (30d)</span></div></div>
        </div>
      </>
    );
  };

  // ===================== Dashboard =====================
  if (view === "Dashboard") {
    const s = stats;
    const health = [
      { name: "API Server", ok: !!s },
      { name: "Database", ok: !!s },
      { name: "Subscriptions", ok: (s?.active_subscriptions ?? 0) > 0 },
      { name: "Schools Registered", ok: (s?.total_schools ?? 0) > 0 },
    ];
    const perf = [
      ["Total Schools", String(s?.total_schools ?? 0)],
      ["Active Subscriptions", String(s?.active_subscriptions ?? 0)],
      ["Expired Subscriptions", String(s?.expired_subscriptions ?? 0)],
      ["Total Users", String(s?.total_users ?? 0)],
    ];
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Platform Overview</h2>
          <p>Manage schools, subscriptions, and system health across the entire Nova platform.</p>
        </div>
        <Metrics />
        <div className="office-layout">
          <div className="list-panel glass-card">
            <div className="panel-title"><strong style={{fontSize:"0.9rem"}}>System Health</strong></div>
            <div className="stack-list">
              {health.map(h => (
                <div key={h.name} className="list-row">
                  {h.ok ? <CheckCircle size={16} style={{color:"#10b981",flexShrink:0}}/> : <Clock size={16} style={{color:"#f59e0b",flexShrink:0}}/>}
                  <strong style={{fontSize:"0.9rem"}}>{h.name}</strong>
                  <span className={`badge ${h.ok ? "success" : "warning"}`}>{h.ok ? "Operational" : "Degraded"}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="list-panel glass-card">
            <div className="panel-title"><strong style={{fontSize:"0.9rem"}}>Platform Overview</strong></div>
            <div className="stack-list">
              {perf.map(([label, val]) => (
                <div key={label} className="list-row">
                  <div className="dot"/>
                  <span style={{fontSize:"0.88rem"}}>{label}</span>
                  <strong style={{fontSize:"0.9rem"}}>{val}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================== Schools =====================
  if (view === "Schools") {
    const [showAddSchool, setShowAddSchool] = useState(false);
    const [addSchoolPayload, setAddSchoolPayload] = useState<Partial<AddSchoolPayload>>({});
    const [addSchoolNotice, setAddSchoolNotice] = useState<string | null>(null);
    const [addingSchool, setAddingSchool] = useState(false);
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; school: SchoolAdminItem } | null>(null);
    const [schoolDetail, setSchoolDetail] = useState<SchoolDetail | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [showKeyGen, setShowKeyGen] = useState(false);
    const [keyGenSchool, setKeyGenSchool] = useState<SchoolAdminItem | null>(null);
    const [keyGenPlan, setKeyGenPlan] = useState<number>(0);
    const [keyGenResult, setKeyGenResult] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const ctxRef = useRef<HTMLDivElement>(null);

    const handleAddSchool = async () => {
      if (!addSchoolPayload.name || !addSchoolPayload.admin_email || !addSchoolPayload.admin_name || !addSchoolPayload.plan_id) {
        setAddSchoolNotice("Please fill in all required fields");
        return;
      }
      setAddingSchool(true);
      try {
        const result = await addSchool(addSchoolPayload as AddSchoolPayload);
        setAddSchoolNotice(result.message);
        setShowAddSchool(false);
        setAddSchoolPayload({});
        fetchPlatformSchools().then(setSchools);
      } catch (e: any) {
        setAddSchoolNotice(e.message);
      } finally {
        setAddingSchool(false);
      }
    };

    useEffect(() => {
      const close = (e: MouseEvent) => {
        if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null);
      };
      if (ctxMenu) document.addEventListener("mousedown", close);
      return () => document.removeEventListener("mousedown", close);
    }, [ctxMenu]);

    const handleViewDetail = async (s: SchoolAdminItem) => {
      setCtxMenu(null);
      try {
        const detail = await fetchSchoolDetail(s.id);
        setSchoolDetail(detail);
        setShowDetail(true);
      } catch (e: any) {
        alert(e.message);
      }
    };

    const handleCopyCode = (code: string) => {
      setCtxMenu(null);
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleGenKey = (s: SchoolAdminItem) => {
      setCtxMenu(null);
      setKeyGenSchool(s);
      setKeyGenPlan(0);
      setKeyGenResult(null);
      setShowKeyGen(true);
    };

    const handleGenKeySubmit = async () => {
      if (!keyGenSchool || !keyGenPlan) return;
      setGenerating(true);
      try {
        const result = await generateKey(keyGenSchool.id, keyGenPlan);
        setKeyGenResult(result.product_key);
        fetchPlatformSchools().then(setSchools);
      } catch (e: any) {
        setKeyGenResult("Error: " + e.message);
      } finally {
        setGenerating(false);
      }
    };

    return (
      <div className="content-grid">
        <Metrics />
        <div className="table-panel glass-card">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search school name or code…" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{padding:"4px 8px",borderRadius:4,background:"var(--surface)",color:"var(--text)",border:"1px solid var(--border)"}}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
            </select>
            <button className="tool-button" onClick={() => setShowAddSchool(true)}><Plus size={15}/>Add School</button>
            <button className="tool-button" onClick={() => printElement("export-super-admin-schools")}><FileText size={15}/>Export</button>
          </div>

          {showAddSchool && (
            <div className="panel glass-card" style={{padding:20,marginBottom:16,display:"grid",gap:14}}>
              <div className="panel-title"><strong>Add New School</strong></div>
              {addSchoolNotice && <div className="notice">{addSchoolNotice}</div>}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
                <label className="form-label">School Name * <input value={addSchoolPayload.name ?? ""} onChange={e => setAddSchoolPayload(p => ({...p,name:e.target.value}))} placeholder="e.g. Kampala High School" /></label>
                <label className="form-label">School Email * <input value={addSchoolPayload.email ?? ""} onChange={e => setAddSchoolPayload(p => ({...p,email:e.target.value}))} placeholder="info@school.com" /></label>
                <label className="form-label">School Phone <input value={addSchoolPayload.phone ?? ""} onChange={e => setAddSchoolPayload(p => ({...p,phone:e.target.value}))} placeholder="+256 700 000000" /></label>
                <label className="form-label">Address <input value={addSchoolPayload.address ?? ""} onChange={e => setAddSchoolPayload(p => ({...p,address:e.target.value}))} placeholder="Kampala, Uganda" /></label>
                <label className="form-label">Admin Name * <input value={addSchoolPayload.admin_name ?? ""} onChange={e => setAddSchoolPayload(p => ({...p,admin_name:e.target.value}))} placeholder="Headteacher name" /></label>
                <label className="form-label">Admin Email * <input value={addSchoolPayload.admin_email ?? ""} onChange={e => setAddSchoolPayload(p => ({...p,admin_email:e.target.value}))} placeholder="admin@school.com" /></label>
                <label className="form-label">Admin Password <input value={addSchoolPayload.admin_password ?? ""} onChange={e => setAddSchoolPayload(p => ({...p,admin_password:e.target.value}))} placeholder="Default: changeme2026" /></label>
                <label className="form-label">Plan * <select value={addSchoolPayload.plan_id ?? ""} onChange={e => setAddSchoolPayload(p => ({...p,plan_id:Number(e.target.value)}))}>
                  <option value="">Select plan</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} - UGX {p.price.toLocaleString()} ({p.duration_days}d)</option>)}
                </select></label>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="tool-button primary" disabled={addingSchool} onClick={handleAddSchool}>{addingSchool ? "Creating..." : "Create School"}</button>
                <button className="tool-button" onClick={() => { setShowAddSchool(false); setAddSchoolNotice(null); }}>Cancel</button>
              </div>
            </div>
          )}
          <div id="export-super-admin-schools" className="table-wrap">
            <table>
              <thead><tr><th>Code</th><th>School Name</th><th>Contact</th><th>Students</th><th>Users</th><th>Status</th><th>Since</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredSchools.map(s => (
                  <tr key={s.id} onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, school: s }); }} style={{cursor:"context-menu"}}>
                    <td><code>{s.school_code}</code></td>
                    <td><strong>{s.name}</strong></td>
                    <td style={{fontSize:"0.82rem"}}>{s.email ?? "—"}</td>
                    <td>{s.student_count}</td>
                    <td>{s.user_count}</td>
                    <td><span className={`badge ${s.subscription_status==="active" ? "success" : s.subscription_status==="trial" ? "info" : s.subscription_status==="suspended" ? "error" : "muted"}`}>{s.subscription_status}</span></td>
                    <td style={{fontSize:"0.82rem"}}>{new Date(s.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{display:"flex",gap:4}}>
                        {s.subscription_status !== "suspended" ? (
                          <button className="tool-button" style={{color:"var(--danger)"}} onClick={() => toggleSchoolStatus(s.id, "suspended").then(() => fetchPlatformSchools().then(setSchools))} title="Suspend"><Ban size={14}/></button>
                        ) : (
                          <button className="tool-button" style={{color:"#10b981"}} onClick={() => toggleSchoolStatus(s.id, "active").then(() => fetchPlatformSchools().then(setSchools))} title="Reactivate"><Check size={14}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSchools.length === 0 && <tr><td colSpan={8} className="empty-state">No schools found</td></tr>}
              </tbody>
            </table>
          </div>

          {ctxMenu && (
            <div ref={ctxRef} style={{position:"fixed",left:ctxMenu.x,top:ctxMenu.y,zIndex:1000,background:"var(--surface, #1e1e2e)",border:"1px solid var(--border, #333)",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.4)",padding:4,minWidth:180}}>
              <div style={{padding:"6px 12px",fontSize:"0.75rem",color:"var(--muted,#888)",borderBottom:"1px solid var(--border,#333)",marginBottom:4}}>
                <strong>{ctxMenu.school.name}</strong>
              </div>
              <button className="tool-button" style={{width:"100%",justifyContent:"flex-start",gap:8,padding:"7px 12px"}} onClick={() => handleViewDetail(ctxMenu.school)}>
                <Eye size={14}/> View Details
              </button>
              {ctxMenu.school.subscription_status !== "suspended" ? (
                <button className="tool-button" style={{width:"100%",justifyContent:"flex-start",gap:8,padding:"7px 12px",color:"var(--danger)"}} onClick={() => { setCtxMenu(null); toggleSchoolStatus(ctxMenu.school.id, "suspended").then(() => fetchPlatformSchools().then(setSchools)); }}>
                  <Ban size={14}/> Suspend School
                </button>
              ) : (
                <button className="tool-button" style={{width:"100%",justifyContent:"flex-start",gap:8,padding:"7px 12px",color:"#10b981"}} onClick={() => { setCtxMenu(null); toggleSchoolStatus(ctxMenu.school.id, "active").then(() => fetchPlatformSchools().then(setSchools)); }}>
                  <Check size={14}/> Reactivate School
                </button>
              )}
              <button className="tool-button" style={{width:"100%",justifyContent:"flex-start",gap:8,padding:"7px 12px"}} onClick={() => handleGenKey(ctxMenu.school)}>
                <Key size={14}/> Generate Key
              </button>
              <button className="tool-button" style={{width:"100%",justifyContent:"flex-start",gap:8,padding:"7px 12px"}} onClick={() => handleCopyCode(ctxMenu.school.school_code)}>
                {copiedCode ? <ClipboardCheck size={14} style={{color:"#10b981"}}/> : <Copy size={14}/>} Copy School Code
              </button>
            </div>
          )}

          {showDetail && schoolDetail && (
            <div className="modal-overlay" onClick={() => setShowDetail(false)}>
              <div className="modal-panel glass-card" onClick={e => e.stopPropagation()} style={{maxWidth:480,padding:24}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <strong style={{fontSize:"1.1rem"}}>{schoolDetail.name}</strong>
                  <button className="tool-button" onClick={() => setShowDetail(false)}><X size={16}/></button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,fontSize:"0.85rem"}}>
                  <div><span style={{color:"var(--muted)"}}>School Code</span><br/><code>{schoolDetail.school_code}</code></div>
                  <div><span style={{color:"var(--muted)"}}>Status</span><br/><span className={`badge ${schoolDetail.subscription_status==="active" ? "success" : schoolDetail.subscription_status==="trial" ? "info" : "muted"}`}>{schoolDetail.subscription_status}</span></div>
                  <div><span style={{color:"var(--muted)"}}>Email</span><br/>{schoolDetail.email || "—"}</div>
                  <div><span style={{color:"var(--muted)"}}>Phone</span><br/>{schoolDetail.phone || "—"}</div>
                  <div><span style={{color:"var(--muted)"}}>Address</span><br/>{schoolDetail.address || "—"}</div>
                  <div><span style={{color:"var(--muted)"}}>Country</span><br/>{schoolDetail.country || "—"}</div>
                  <div><span style={{color:"var(--muted)"}}>Admin</span><br/>{schoolDetail.admin_name || "—"}</div>
                  <div><span style={{color:"var(--muted)"}}>Admin Email</span><br/>{schoolDetail.admin_email || "—"}</div>
                  <div><span style={{color:"var(--muted)"}}>Students</span><br/>{schoolDetail.student_count}</div>
                  <div><span style={{color:"var(--muted)"}}>Users</span><br/>{schoolDetail.user_count}</div>
                  <div style={{gridColumn:"span 2"}}><span style={{color:"var(--muted)"}}>Created</span><br/>{new Date(schoolDetail.created_at).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {showKeyGen && keyGenSchool && (
            <div className="modal-overlay" onClick={() => setShowKeyGen(false)}>
              <div className="modal-panel glass-card" onClick={e => e.stopPropagation()} style={{maxWidth:420,padding:24}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <strong>Generate Key — {keyGenSchool.name}</strong>
                  <button className="tool-button" onClick={() => setShowKeyGen(false)}><X size={16}/></button>
                </div>
                {!keyGenResult ? (
                  <div style={{display:"grid",gap:12}}>
                    <label className="form-label">Plan
                      <select value={keyGenPlan} onChange={e => setKeyGenPlan(Number(e.target.value))}>
                        <option value={0}>Select plan</option>
                        {plans.map(p => <option key={p.id} value={p.id}>{p.name} — UGX {p.price.toLocaleString()}</option>)}
                      </select>
                    </label>
                    <button className="tool-button primary" disabled={!keyGenPlan || generating} onClick={handleGenKeySubmit}>{generating ? "Generating..." : "Generate Key"}</button>
                  </div>
                ) : (
                  <div style={{display:"grid",gap:12}}>
                    {keyGenResult.startsWith("Error") ? (
                      <div style={{color:"var(--danger)",fontSize:"0.85rem"}}>{keyGenResult}</div>
                    ) : (
                      <>
                        <div style={{padding:12,borderRadius:8,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)"}}>
                          <div style={{fontSize:"0.75rem",color:"var(--muted)",marginBottom:4}}>Registration Key</div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <code style={{fontSize:"0.9rem",wordBreak:"break-all",flex:1}}>{keyGenResult}</code>
                            <button className="tool-button" onClick={() => { navigator.clipboard.writeText(keyGenResult); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }}>
                              {copiedCode ? <ClipboardCheck size={14} style={{color:"#10b981"}}/> : <Copy size={14}/>}
                            </button>
                          </div>
                        </div>
                        <button className="tool-button" onClick={() => setShowKeyGen(false)}>Done</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===================== Registrations =====================
  if (view === "Registrations") {
    const [regFilter, setRegFilter] = useState<"">("");
    const [approving, setApproving] = useState<number | null>(null);
    const [regNotice, setRegNotice] = useState<string | null>(null);
    const [regTab, setRegTab] = useState<"pending" | "all">("pending");
    const [selectedReg, setSelectedReg] = useState<RegistrationRequestItem | null>(null);
    const [approvedResult, setApprovedResult] = useState<{ key: string; password: string; apiKey: string; schoolName: string } | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const pendingRegs = registrations.filter(r => r.status === "pending");
    const filtered = regTab === "pending" ? pendingRegs : registrations;

    const planName = (pid: number | null) => {
      if (!pid) return "—";
      const p = plans.find(p => p.id === pid);
      return p ? p.name : `Plan #${pid}`;
    };

    const daysWaiting = (dateStr: string) => {
      const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
      return diff;
    };

    const handleApprove = async (id: number) => {
      setApproving(id);
      try {
        const result = await approveRegistration(id);
        setRegNotice(result.message);
        const reg = registrations.find(r => r.id === id);
        setApprovedResult({
          key: result.product_key,
          password: "Check email for password",
          apiKey: "Check email for API key",
          schoolName: reg?.school_name ?? "School"
        });
        fetchRegistrations().then(setRegistrations);
      } catch (e: any) {
        setRegNotice(e.message);
      } finally {
        setApproving(null);
      }
    };

    const handleCopy = (text: string, label: string) => {
      copyToClipboard(text, () => {
        setCopied(label);
        setTimeout(() => setCopied(null), 1500);
      });
    };

    return (
      <div className="content-grid">
        {approvedResult && (
          <div className="panel glass-card" style={{padding:20,marginBottom:16,borderLeft:"4px solid #10b981"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <CheckCircle size={20} style={{color:"#10b981"}} />
                <strong style={{fontSize:"1rem"}}>{approvedResult.schoolName} — Provisioned</strong>
              </div>
              <button className="tool-button" onClick={() => setApprovedResult(null)}><X size={14}/></button>
            </div>
            <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:0}}>School created and credentials sent via email. Copy the key below:</p>
            <div style={{display:"grid",gap:10,marginTop:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"rgba(255,255,255,0.04)",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)"}}>
                <Key size={15} style={{color:"var(--primary)",flexShrink:0}} />
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"0.75rem",color:"var(--muted)"}}>Registration Key</div>
                  <code style={{fontSize:"0.85rem",wordBreak:"break-all"}}>{approvedResult.key}</code>
                </div>
                <button className="tool-button" onClick={() => handleCopy(approvedResult.key, "key")} style={{flexShrink:0}}>
                  {copied === "key" ? <ClipboardCheck size={14} style={{color:"#10b981"}}/> : <Copy size={14}/>}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="table-panel glass-card">
          <div className="office-filters">
            <div style={{display:"flex",gap:4}}>
              <button className={`tool-button ${regTab === "pending" ? "primary" : ""}`} onClick={() => setRegTab("pending")}>
                Pending <span className="badge warning" style={{marginLeft:4}}>{pendingRegs.length}</span>
              </button>
              <button className={`tool-button ${regTab === "all" ? "primary" : ""}`} onClick={() => setRegTab("all")}>All Registrations</button>
            </div>
            <span style={{fontSize:"0.85rem",color:"var(--muted)"}}>{filtered.length} registration(s)</span>
          </div>
          {regNotice && <div className="notice">{regNotice}</div>}

          {regTab === "pending" && pendingRegs.length > 0 && (
            <div style={{display:"grid",gap:12,padding:"12px 0"}}>
              {pendingRegs.map(r => {
                const days = daysWaiting(r.created_at);
                return (
                  <div key={r.id} style={{padding:"16px 18px",background:"rgba(255,255,255,0.03)",borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"flex-start",gap:14,cursor:"pointer"}} onClick={() => setSelectedReg(r)}>
                    <div style={{width:44,height:44,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <Building2 size={22} style={{color:"#fff"}} />
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <strong style={{fontSize:"0.95rem"}}>{r.school_name}</strong>
                        {days >= 2 && <span style={{fontSize:"0.7rem",padding:"2px 8px",borderRadius:10,background:"rgba(239,68,68,0.15)",color:"#fca5a5",fontWeight:600}}>{days}d waiting</span>}
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:12,fontSize:"0.82rem",color:"var(--muted)"}}>
                        <span style={{display:"flex",alignItems:"center",gap:4}}><User size={13}/> {r.admin_name}</span>
                        <span style={{display:"flex",alignItems:"center",gap:4}}><Mail size={13}/> {r.admin_email}</span>
                        <span style={{display:"flex",alignItems:"center",gap:4}}><CreditCard size={13}/> {r.payment_method}</span>
                        <span style={{display:"flex",alignItems:"center",gap:4}}><Calendar size={13}/> {planName(r.plan_id)}</span>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}} onClick={e => e.stopPropagation()}>
                      <button className="tool-button primary" disabled={approving === r.id} onClick={() => handleApprove(r.id)}>
                        {approving === r.id ? "Approving..." : <><Check size={14}/>Approve</>}
                      </button>
                      <button className="tool-button" style={{color:"var(--danger)"}} onClick={() => {}}>
                        <X size={14}/>Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {regTab === "pending" && pendingRegs.length === 0 && (
            <div style={{padding:40,textAlign:"center"}}>
              <CheckCircle size={40} style={{color:"#10b981",marginBottom:10}} />
              <p style={{fontSize:"0.95rem",fontWeight:600}}>All clear</p>
              <p style={{fontSize:"0.85rem",color:"var(--muted)"}}>No pending registrations</p>
            </div>
          )}

          {regTab === "all" && (
            <div className="table-wrap">
              <table>
                <thead><tr><th>School</th><th>Admin</th><th>Plan</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.school_name}</strong></td>
                      <td>{r.admin_name}</td>
                      <td style={{fontSize:"0.82rem"}}>{planName(r.plan_id)}</td>
                      <td style={{fontSize:"0.82rem"}}>{r.payment_method}</td>
                      <td><span className={`badge ${r.status==="approved" ? "success" : r.status==="pending" ? "warning" : "error"}`}>{r.status}</span></td>
                      <td style={{fontSize:"0.82rem"}}>{new Date(r.created_at).toLocaleDateString()}</td>
                      <td>
                        {r.status === "pending" && (
                          <button className="tool-button primary" disabled={approving === r.id} onClick={() => handleApprove(r.id)}>
                            {approving === r.id ? "Approving..." : "Approve"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={7} className="empty-state">No registrations</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedReg && (
          <div className="modal-overlay" onClick={() => setSelectedReg(null)}>
            <div className="modal-panel" onClick={e => e.stopPropagation()} style={{maxWidth:480}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <strong style={{fontSize:"1.05rem"}}>Registration Details</strong>
                <button className="tool-button" onClick={() => setSelectedReg(null)}><X size={14}/></button>
              </div>
              <div style={{display:"grid",gap:10}}>
                {[
                  ["School", selectedReg.school_name],
                  ["Admin", selectedReg.admin_name],
                  ["Email", selectedReg.admin_email],
                  ["Phone", selectedReg.admin_phone],
                  ["Plan", planName(selectedReg.plan_id)],
                  ["Payment", selectedReg.payment_method],
                  ["Status", selectedReg.status],
                  ["Submitted", new Date(selectedReg.created_at).toLocaleString()],
                ].map(([label, val]) => (
                  <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                    <span style={{fontSize:"0.82rem",color:"var(--muted)"}}>{label}</span>
                    <span style={{fontSize:"0.88rem",fontWeight:500}}>{val}</span>
                  </div>
                ))}
              </div>
              {selectedReg.status === "pending" && (
                <div style={{display:"flex",gap:8,marginTop:18}}>
                  <button className="primary-button" disabled={approving === selectedReg.id} onClick={() => { handleApprove(selectedReg.id); setSelectedReg(null); }}>
                    {approving === selectedReg.id ? "Approving..." : "Approve & Provision"}
                  </button>
                  <button className="secondary-button" onClick={() => setSelectedReg(null)}>Close</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===================== Keys =====================
  if (view === "Keys") {
    const [showGenerate, setShowGenerate] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState("");
    const [selectedPlan, setSelectedPlan] = useState("");
    const [keyNotice, setKeyNotice] = useState<string | null>(null);
    const [keyFilter, setKeyFilter] = useState<string>("");
    const [keyTab, setKeyTab] = useState<"product" | "api">("product");
    const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
    const [showApiGenerate, setShowApiGenerate] = useState(false);
    const [apiSelectedSchool, setApiSelectedSchool] = useState("");
    const [apiKeyDesc, setApiKeyDesc] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [lastGeneratedKey, setLastGeneratedKey] = useState<string | null>(null);
    const [lastGeneratedApiKey, setLastGeneratedApiKey] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const filteredKeys = keys.filter(k => {
      if (keyFilter === "used") return k.is_used;
      if (keyFilter === "unused") return !k.is_used;
      return true;
    });

    const handleGenerate = async () => {
      if (!selectedSchool || !selectedPlan) return;
      try {
        const result = await generateKey(Number(selectedSchool), Number(selectedPlan));
        setKeyNotice(result.message);
        setLastGeneratedKey(result.product_key);
        setShowGenerate(false);
        fetchKeys().then(setKeys);
      } catch (e: any) {
        setKeyNotice(e.message);
      }
    };

    const loadApiKeys = async () => {
      try { setApiKeys(await fetchApiKeys()); } catch { setApiKeys([]); }
    };

    const handleApiGenerate = async () => {
      if (!apiSelectedSchool) return;
      setIsGenerating(true);
      try {
        const result = await generateApiKey(Number(apiSelectedSchool), apiKeyDesc || undefined);
        setKeyNotice(result.message);
        setLastGeneratedApiKey(result.api_key);
        setShowApiGenerate(false);
        setApiKeyDesc("");
        loadApiKeys();
      } catch (e: any) {
        setKeyNotice(e.message);
      } finally {
        setIsGenerating(false);
      }
    };

    const handleCopyKey = (text: string, label: string) => {
      copyToClipboard(text, () => {
        setCopiedKey(label);
        setTimeout(() => setCopiedKey(null), 1500);
      });
    };

    const handleRevoke = async (id: number) => {
      try {
        await revokeApiKey(id);
        setKeyNotice("API key revoked");
        loadApiKeys();
      } catch (e: any) {
        setKeyNotice(e.message);
      }
    };

    useEffect(() => { if (view === "Keys") loadApiKeys(); }, [view]);

    return (
      <div className="content-grid">
        <div className="table-panel glass-card">
          <div className="office-filters">
            <div style={{display:"flex",gap:4}}>
              <button className={`tool-button ${keyTab === "product" ? "primary" : ""}`} onClick={() => setKeyTab("product")}>Product Keys</button>
              <button className={`tool-button ${keyTab === "api" ? "primary" : ""}`} onClick={() => { setKeyTab("api"); loadApiKeys(); }}>API Keys</button>
            </div>
          </div>
          {keyNotice && <div className="notice">{keyNotice}</div>}

          {lastGeneratedKey && (
            <div className="panel glass-card" style={{padding:14,marginBottom:16,borderLeft:"4px solid #10b981",display:"flex",alignItems:"center",gap:10}}>
              <Key size={16} style={{color:"#10b981",flexShrink:0}} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"0.75rem",color:"var(--muted)"}}>Generated Product Key</div>
                <code style={{fontSize:"0.88rem",wordBreak:"break-all"}}>{lastGeneratedKey}</code>
              </div>
              <button className="tool-button" onClick={() => handleCopyKey(lastGeneratedKey, "product")} style={{flexShrink:0}}>
                {copiedKey === "product" ? <ClipboardCheck size={14} style={{color:"#10b981"}}/> : <Copy size={14}/>}
              </button>
              <button className="tool-button" onClick={() => setLastGeneratedKey(null)} style={{flexShrink:0}}><X size={14}/></button>
            </div>
          )}

          {keyTab === "product" && (
            <>
              <div className="office-filters">
                <select value={keyFilter} onChange={e => setKeyFilter(e.target.value)} style={{padding:"4px 8px",borderRadius:4,background:"var(--surface)",color:"var(--text)",border:"1px solid var(--border)"}}>
                  <option value="">All Keys</option>
                  <option value="unused">Unused</option>
                  <option value="used">Used</option>
                </select>
                <button className="tool-button primary" onClick={() => setShowGenerate(!showGenerate)}><Key size={15}/>Generate Key</button>
              </div>

              {showGenerate && (
                <div className="panel glass-card" style={{padding:16,marginBottom:16,display:"grid",gap:12}}>
                  <strong>Generate New Product Key</strong>
                  <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)} style={{padding:"6px 10px",borderRadius:4,background:"var(--surface)",color:"var(--text)",border:"1px solid var(--border)"}}>
                    <option value="">Select school</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name} ({s.school_code})</option>)}
                  </select>
                  <select value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)} style={{padding:"6px 10px",borderRadius:4,background:"var(--surface)",color:"var(--text)",border:"1px solid var(--border)"}}>
                    <option value="">Select plan</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name} - UGX {p.price.toLocaleString()} ({p.duration_days}d)</option>)}
                  </select>
                  <div style={{display:"flex",gap:8}}>
                    <button className="primary-button" disabled={!selectedSchool || !selectedPlan} onClick={handleGenerate}>Generate</button>
                    <button className="secondary-button" onClick={() => setShowGenerate(false)}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>School</th><th>Plan</th><th>Used</th><th>Expires</th><th>Created</th></tr></thead>
                  <tbody>
                    {filteredKeys.map(k => (
                      <tr key={k.id}>
                        <td><code style={{fontSize:"0.75rem"}}>#{k.id}</code></td>
                        <td>{k.school_name ?? "—"}</td>
                        <td>{k.plan_name ?? "—"}</td>
                        <td><span className={`badge ${k.is_used ? "muted" : "success"}`}>{k.is_used ? "Used" : "Active"}</span></td>
                        <td style={{fontSize:"0.82rem"}}>{new Date(k.expires_at).toLocaleDateString()}</td>
                        <td style={{fontSize:"0.82rem"}}>{new Date(k.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {filteredKeys.length === 0 && <tr><td colSpan={6} className="empty-state">No keys found</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {keyTab === "api" && (
            <>
              <div className="office-filters">
                <button className="tool-button primary" onClick={() => setShowApiGenerate(!showApiGenerate)}><Key size={15}/>Generate API Key</button>
              </div>

              {showApiGenerate && (
                <div className="panel glass-card" style={{padding:16,marginBottom:16,display:"grid",gap:12}}>
                  <strong>Generate New API Key</strong>
                  <select value={apiSelectedSchool} onChange={e => setApiSelectedSchool(e.target.value)} style={{padding:"6px 10px",borderRadius:4,background:"var(--surface)",color:"var(--text)",border:"1px solid var(--border)"}}>
                    <option value="">Select school</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name} ({s.school_code})</option>)}
                  </select>
                  <input placeholder="Description (optional)" value={apiKeyDesc} onChange={e => setApiKeyDesc(e.target.value)} style={{padding:"6px 10px",borderRadius:4,background:"var(--surface)",color:"var(--text)",border:"1px solid var(--border)"}} />
                  <div style={{display:"flex",gap:8}}>
                    <button className="primary-button" disabled={!apiSelectedSchool || isGenerating} onClick={handleApiGenerate}>{isGenerating ? "Generating..." : "Generate"}</button>
                    <button className="secondary-button" onClick={() => setShowApiGenerate(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {lastGeneratedApiKey && (
                <div className="panel glass-card" style={{padding:14,marginBottom:16,borderLeft:"4px solid #10b981",display:"flex",alignItems:"center",gap:10}}>
                  <Key size={16} style={{color:"#10b981",flexShrink:0}} />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"0.75rem",color:"var(--muted)"}}>Generated API Key</div>
                    <code style={{fontSize:"0.88rem",wordBreak:"break-all"}}>{lastGeneratedApiKey}</code>
                  </div>
                  <button className="tool-button" onClick={() => handleCopyKey(lastGeneratedApiKey, "api")} style={{flexShrink:0}}>
                    {copiedKey === "api" ? <ClipboardCheck size={14} style={{color:"#10b981"}}/> : <Copy size={14}/>}
                  </button>
                  <button className="tool-button" onClick={() => setLastGeneratedApiKey(null)} style={{flexShrink:0}}><X size={14}/></button>
                </div>
              )}

              <div className="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>Prefix</th><th>Description</th><th>Status</th><th>Last Used</th><th>Expires</th><th>Created</th><th>Actions</th></tr></thead>
                  <tbody>
                    {apiKeys.map(k => (
                      <tr key={k.id}>
                        <td><code style={{fontSize:"0.75rem"}}>#{k.id}</code></td>
                        <td><code>{k.key_prefix}...</code></td>
                        <td style={{fontSize:"0.85rem"}}>{k.description ?? "—"}</td>
                        <td><span className={`badge ${k.is_active ? "success" : "muted"}`}>{k.is_active ? "Active" : "Revoked"}</span></td>
                        <td style={{fontSize:"0.82rem"}}>{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}</td>
                        <td style={{fontSize:"0.82rem"}}>{k.expires_at ? new Date(k.expires_at).toLocaleDateString() : "Never"}</td>
                        <td style={{fontSize:"0.82rem"}}>{new Date(k.created_at).toLocaleDateString()}</td>
                        <td>
                          {k.is_active && <button className="tool-button" style={{color:"var(--danger)"}} onClick={() => handleRevoke(k.id)} title="Revoke"><Trash2 size={14}/></button>}
                        </td>
                      </tr>
                    ))}
                    {apiKeys.length === 0 && <tr><td colSpan={8} className="empty-state">No API keys generated</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ===================== Plans =====================
  if (view === "Plans") {
    const [showCreate, setShowCreate] = useState(false);
    const [planNotice, setPlanNotice] = useState<string | null>(null);
    const [newPlan, setNewPlan] = useState<{ name: string; price: number; duration_days: number; max_students: number | null; max_staff: number | null }>({ name: "", price: 0, duration_days: 30, max_students: 100, max_staff: 20 });

    const handleCreate = async () => {
      if (!newPlan.name) return;
      try {
        await createPlan(newPlan);
        setPlanNotice(`Plan "${newPlan.name}" created`);
        setShowCreate(false);
        fetchPlans().then(setPlans);
      } catch (e: any) {
        setPlanNotice(e.message);
      }
    };

    return (
      <div className="content-grid">
        <div className="table-panel glass-card">
          <div className="office-filters">
            <strong style={{fontSize:"0.95rem"}}>Subscription Plans</strong>
            <button className="tool-button primary" onClick={() => setShowCreate(!showCreate)}><CreditCard size={15}/>Create Plan</button>
          </div>
          {planNotice && <div className="notice">{planNotice}</div>}

          {showCreate && (
            <div className="panel glass-card" style={{padding:16,marginBottom:16,display:"grid",gap:12}}>
              <strong>New Plan</strong>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8}}>
                <label className="form-label">Name <input value={newPlan.name} onChange={e => setNewPlan(p => ({...p,name:e.target.value}))} /></label>
                <label className="form-label">Price (UGX) <input type="number" value={newPlan.price} onChange={e => setNewPlan(p => ({...p,price:Number(e.target.value)}))} /></label>
                <label className="form-label">Duration (days) <input type="number" value={newPlan.duration_days} onChange={e => setNewPlan(p => ({...p,duration_days:Number(e.target.value)}))} /></label>
                <label className="form-label">Max Students <input type="number" value={newPlan.max_students ?? ""} onChange={e => setNewPlan(p => ({...p,max_students:Number(e.target.value)||null}))} /></label>
                <label className="form-label">Max Staff <input type="number" value={newPlan.max_staff ?? ""} onChange={e => setNewPlan(p => ({...p,max_staff:Number(e.target.value)||null}))} /></label>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="primary-button" onClick={handleCreate}>Create</button>
                <button className="secondary-button" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Price</th><th>Duration</th><th>Max Students</th><th>Max Staff</th><th>Features</th><th>Status</th></tr></thead>
              <tbody>
                {plans.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.currency_code} {p.price.toLocaleString()}</td>
                    <td>{p.duration_days}d</td>
                    <td>{p.max_students ?? "∞"}</td>
                    <td>{p.max_staff ?? "∞"}</td>
                    <td style={{fontSize:"0.8rem"}}>{Object.entries(p.features).filter(([,v]) => v).map(([k]) => k).join(", ")}</td>
                    <td><span className={`badge ${p.is_active ? "success" : "muted"}`}>{p.is_active ? "Active" : "Inactive"}</span></td>
                  </tr>
                ))}
                {plans.length === 0 && <tr><td colSpan={7} className="empty-state">No plans defined</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ===================== Audit Log =====================
  if (view === "Audit Log") {
    return (
      <div className="content-grid">
        <div className="table-panel glass-card">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search action, actor…" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <button className="tool-button" onClick={() => printElement("export-audit-log")}><FileText size={15}/>Export</button>
          </div>
          <div id="export-audit-log" className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Action</th><th>Actor</th><th>Entity</th><th>Detail</th><th>Timestamp</th></tr></thead>
              <tbody>
                {filteredAuditLogs.map(l => (
                  <tr key={l.id}>
                    <td><code style={{fontSize:"0.75rem"}}>{l.id}</code></td>
                    <td><strong style={{fontSize:"0.85rem"}}>{l.action}</strong></td>
                    <td>{l.actor_name ?? "—"}</td>
                    <td><code style={{fontSize:"0.75rem"}}>{l.entity_type ?? l.entity ?? "—"}</code></td>
                    <td style={{fontSize:"0.82rem"}}>{l.entity_id ? `#${l.entity_id}` : (l.detail ?? "—")}</td>
                    <td style={{fontSize:"0.82rem"}}>{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {filteredAuditLogs.length === 0 && <tr><td colSpan={6} className="empty-state">No logs found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ===================== Users =====================
  if (view === "Users") {
    const [userSearch, setUserSearch] = useState("");
    const filteredUsers = platformUsers.filter(u =>
      !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );

    return (
      <div className="content-grid">
        <div className="table-panel glass-card">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search name, email…" value={userSearch} onChange={e => setUserSearch(e.target.value)} /></label>
            <span style={{fontSize:"0.85rem",color:"var(--muted)"}}>{filteredUsers.length} user(s)</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>School</th><th>2FA</th><th>Active</th><th>Last Login</th><th>Created</th></tr></thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>{u.role ?? "—"}</td>
                    <td style={{fontSize:"0.82rem"}}>{u.school ?? "Platform"}</td>
                    <td><span className={`badge ${u.is_2fa_enabled ? "success" : "muted"}`}>{u.is_2fa_enabled ? "On" : "Off"}</span></td>
                    <td><span className={`badge ${u.is_active ? "success" : "muted"}`}>{u.is_active ? "Yes" : "No"}</span></td>
                    <td style={{fontSize:"0.82rem"}}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : "—"}</td>
                    <td style={{fontSize:"0.82rem"}}>{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && <tr><td colSpan={8} className="empty-state">No users found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ===================== System Alerts =====================
  if (view === "System Alerts") {
    const recentLogs = auditLogs.slice(0, 50);
    const pendingRegs = registrations.filter(r => r.status === "pending");
    return (
      <div className="content-grid">
        <Metrics />
        {pendingRegs.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fbbf24", marginBottom: 8 }}>Pending Registrations ({pendingRegs.length})</div>
            {pendingRegs.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(251,191,36,0.08)", borderRadius: 8, border: "1px solid rgba(251,191,36,0.15)", marginBottom: 6 }}>
                <AlertTriangle size={15} style={{ color: "#fbbf24", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: "0.85rem" }}>{r.school_name}</strong>
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}> — {r.admin_name} ({r.admin_email})</span>
                </div>
                <span className="badge warning">pending</span>
              </div>
            ))}
          </div>
        )}
        <div className="stack-list list-panel">
          <div className="panel-title"><strong style={{ fontSize: "0.9rem" }}>Recent Activity</strong></div>
          {recentLogs.map(a => (
            <div key={a.id} className="list-row">
              <Activity size={15} style={{ color: "var(--primary)", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: "0.85rem" }}>{a.action}</strong>
                <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{a.actor_name} · {a.entity_type} {a.entity_id ? `#${a.entity_id}` : ""}</span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{a.created_at ? new Date(a.created_at).toLocaleDateString() : ""}</span>
            </div>
          ))}
          {recentLogs.length === 0 && pendingRegs.length === 0 && (
            <p className="empty-state">No alerts or recent activity</p>
          )}
        </div>
      </div>
    );
  }

  // ===================== System Check =====================
  if (view === "System Check") {
    const [scHistory, setScHistory] = useState<SystemCheckItem[]>([]);
    const [scNotice, setScNotice] = useState<string | null>(null);
    const [scTriggering, setScTriggering] = useState(false);

    const loadScHistory = () => fetchSystemChecks(10).then(setScHistory).catch(() => {});

    const handleTriggerSc = async () => {
      setScTriggering(true);
      try {
        const result = await triggerSystemCheck();
        setScNotice(result.message);
        loadScHistory();
      } catch (e: any) {
        setScNotice(e.message);
      } finally {
        setScTriggering(false);
      }
    };

    useEffect(() => { if (view === "System Check") loadScHistory(); }, [view]);

    return (
      <div className="content-grid">
        <Metrics />
        <div className="panel glass-card" style={{padding:20,display:"grid",gap:16,marginBottom:16}}>
          <div className="panel-title"><ShieldCheck size={20} style={{color:"var(--primary)"}}/><strong>System Check</strong></div>
          <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:0}}>Trigger a comprehensive system-wide check. The check will run at midnight and notify all school administrators. During maintenance, the system will be temporarily unavailable.</p>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button className="tool-button primary" disabled={scTriggering} onClick={handleTriggerSc}>
              {scTriggering ? "Scheduling..." : <><RefreshCw size={15}/> Run System Check</>}
            </button>
            <span style={{fontSize:"0.8rem",color:"var(--info)"}}>Runs automatically at midnight</span>
          </div>
          {scNotice && <div className="notice">{scNotice}</div>}
        </div>

        <div className="table-panel glass-card">
          <div className="panel-title" style={{padding:"12px 16px"}}><strong>Check History</strong></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Triggered By</th><th>Status</th><th>Scheduled</th><th>Started</th><th>Completed</th><th>Summary</th></tr></thead>
              <tbody>
                {scHistory.map(c => (
                  <tr key={c.id}>
                    <td><code style={{fontSize:"0.75rem"}}>#{c.id}</code></td>
                    <td>{c.triggered_by_name ?? "—"}</td>
                    <td><span className={`badge ${c.status === "completed" ? "success" : c.status === "running" ? "info" : c.status === "failed" ? "error" : "warning"}`}>{c.status}</span></td>
                    <td style={{fontSize:"0.82rem"}}>{new Date(c.scheduled_for).toLocaleString()}</td>
                    <td style={{fontSize:"0.82rem"}}>{c.started_at ? new Date(c.started_at).toLocaleString() : "—"}</td>
                    <td style={{fontSize:"0.82rem"}}>{c.completed_at ? new Date(c.completed_at).toLocaleString() : "—"}</td>
                    <td style={{fontSize:"0.82rem"}}>{c.summary ?? c.error ?? "—"}</td>
                  </tr>
                ))}
                {scHistory.length === 0 && <tr><td colSpan={7} className="empty-state">No system checks yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ===================== Support =====================
  if (view === "Support") {
    const s = stats;
    return (
      <div className="content-grid">
        <Metrics />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <div className="detail-panel glass-card" style={{ padding: 20, display: "grid", gap: 10 }}>
            <Users size={28} style={{ color: "var(--primary)" }} />
            <strong>Users</strong>
            <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>{s?.total_users ?? 0}</span>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>registered across all schools</span>
          </div>
          <div className="detail-panel glass-card" style={{ padding: 20, display: "grid", gap: 10 }}>
            <Key size={28} style={{ color: "var(--primary)" }} />
            <strong>Keys Generated</strong>
            <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>{s?.keys_generated_30d ?? 0}</span>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>in the last 30 days</span>
          </div>
          <div className="detail-panel glass-card" style={{ padding: 20, display: "grid", gap: 10 }}>
            <Globe size={28} style={{ color: "var(--primary)" }} />
            <strong>Schools</strong>
            <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>{s?.total_schools ?? 0}</span>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{s?.active_subscriptions ?? 0} active subscriptions</span>
          </div>
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="content-grid">
      <div className="welcome-banner">
        <h2>Platform Control</h2>
        <p>Manage schools, registrations, keys, and system settings.</p>
      </div>
      <Metrics />
      <div className="glass-card" style={{ padding: 16 }}>
        <p className="eyebrow" style={{ marginBottom: 10 }}>Quick Navigation</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["Dashboard", "Schools", "Registrations", "Keys", "Plans", "Audit Log", "Users", "System Alerts", "System Check", "Support"].map(v => (
            <button key={v} className="tool-button" onClick={() => onViewChange?.(v)}>{v}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
