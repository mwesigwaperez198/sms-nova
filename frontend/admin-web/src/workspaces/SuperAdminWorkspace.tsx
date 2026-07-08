import { useEffect, useState } from "react";
import { ShieldCheck, Server, AlertTriangle, CheckCircle, Clock, Activity, Settings, Ticket, Search, FileText, Key, CreditCard, Users, Eye, Ban, Check, X } from "lucide-react";
import type { AuditLogItem, KeyItem, PlanItem, PlatformStats, RegistrationRequestItem, SchoolAdminItem, PlatformUserItem } from "../api";
import {
  fetchPlatformStats, fetchPlatformSchools, toggleSchoolStatus,
  fetchRegistrations, approveRegistration,
  fetchPlans, createPlan,
  fetchKeys, generateKey,
  fetchPlatformAuditLogs, fetchPlatformUsers,
} from "../api";
import type { ConnectedData } from "../api";

interface SuperAdminWorkspaceProps {
  view: string;
  data: ConnectedData;
}

export function SuperAdminWorkspace({ view, data }: SuperAdminWorkspaceProps) {
  const [search, setSearch] = useState("");

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
    fetchPlatformStats().then(setStats).catch(() => {});
    fetchPlatformSchools().then(setSchools).catch(() => {});
    fetchRegistrations().then(setRegistrations).catch(() => {});
    fetchPlans().then(setPlans).catch(() => {});
    fetchKeys().then(setKeys).catch(() => {});
    fetchPlatformAuditLogs(100).then(setAuditLogs).catch(() => {});
    fetchPlatformUsers().then(setPlatformUsers).catch(() => {});
  }, []);

  const filteredSchools = schools.filter(s =>
    (!search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.school_code?.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || s.subscription_status === statusFilter)
  );

  const filteredAuditLogs = auditLogs.filter(l =>
    !search || l.action?.toLowerCase().includes(search.toLowerCase()) || l.actor_name?.toLowerCase().includes(search.toLowerCase())
  );

  const Metrics = () => {
    const s = stats;
    return (
      <div className="metric-grid">
        <div className="metric teal"><div className="metric-icon"><ShieldCheck size={22}/></div><div className="metric-body"><strong>{(s?.active_schools ?? data.systemSchools.filter(s => s.status === "Active").length)}</strong><span>Active Schools</span></div></div>
        <div className="metric green"><div className="metric-icon"><Activity size={22}/></div><div className="metric-body"><strong>{(s?.total_students ?? data.systemSchools.reduce((a, sc) => a + sc.students, 0)).toLocaleString()}</strong><span>Total Students</span></div></div>
        <div className="metric red"><div className="metric-icon"><AlertTriangle size={22}/></div><div className="metric-body"><strong>{s?.pending_registrations ?? data.systemAlerts.filter(a => a.severity === "critical").length}</strong><span>Pending Registrations</span></div></div>
        <div className="metric blue"><div className="metric-icon"><Key size={22}/></div><div className="metric-body"><strong>{s?.keys_generated_30d ?? 0}</strong><span>Keys (30d)</span></div></div>
      </div>
    );
  };

  // ===================== Dashboard =====================
  if (view === "Dashboard") {
    const s = stats;
    const health = [
      { name: "API Server", ok: true },
      { name: "Database", ok: true },
      { name: "SMS Gateway", ok: true },
      { name: "File Storage", ok: false },
    ];
    const perf = [
      ["Total Schools", String(s?.total_schools ?? 0)],
      ["Active Subscriptions", String(s?.active_subscriptions ?? 0)],
      ["Expired Subscriptions", String(s?.expired_subscriptions ?? 0)],
      ["Total Users", String(s?.total_users ?? 0)],
    ];
    return (
      <div className="content-grid">
        <Metrics />
        <div className="office-layout">
          <div className="list-panel">
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
          <div className="list-panel">
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
    return (
      <div className="content-grid">
        <Metrics />
        <div className="table-panel">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search school name or code…" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{padding:"4px 8px",borderRadius:4,background:"var(--surface)",color:"var(--text)",border:"1px solid var(--border)"}}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
            </select>
            <button className="tool-button" onClick={() => window.print()}><FileText size={15}/>Export</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Code</th><th>School Name</th><th>Contact</th><th>Students</th><th>Users</th><th>Status</th><th>Since</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredSchools.map(s => (
                  <tr key={s.id}>
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
        </div>
      </div>
    );
  }

  // ===================== Registrations =====================
  if (view === "Registrations") {
    const [regFilter, setRegFilter] = useState("");
    const [approving, setApproving] = useState<number | null>(null);
    const [regNotice, setRegNotice] = useState<string | null>(null);

    const filtered = registrations.filter(r => !regFilter || r.status === regFilter);

    const handleApprove = async (id: number) => {
      setApproving(id);
      try {
        const result = await approveRegistration(id);
        setRegNotice(result.message);
        fetchRegistrations().then(setRegistrations);
      } catch (e: any) {
        setRegNotice(e.message);
      } finally {
        setApproving(null);
      }
    };

    return (
      <div className="content-grid">
        <div className="table-panel">
          <div className="office-filters">
            <select value={regFilter} onChange={e => setRegFilter(e.target.value)} style={{padding:"4px 8px",borderRadius:4,background:"var(--surface)",color:"var(--text)",border:"1px solid var(--border)"}}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <span style={{fontSize:"0.85rem",color:"var(--muted)"}}>{filtered.length} registration(s)</span>
          </div>
          {regNotice && <div className="notice">{regNotice}</div>}
          <div className="table-wrap">
            <table>
              <thead><tr><th>School</th><th>Admin</th><th>Email</th><th>Phone</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.school_name}</strong></td>
                    <td>{r.admin_name}</td>
                    <td>{r.admin_email}</td>
                    <td>{r.admin_phone}</td>
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
                {filtered.length === 0 && <tr><td colSpan={8} className="empty-state">No registrations</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
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
        setShowGenerate(false);
        fetchKeys().then(setKeys);
      } catch (e: any) {
        setKeyNotice(e.message);
      }
    };

    return (
      <div className="content-grid">
        <div className="table-panel">
          <div className="office-filters">
            <select value={keyFilter} onChange={e => setKeyFilter(e.target.value)} style={{padding:"4px 8px",borderRadius:4,background:"var(--surface)",color:"var(--text)",border:"1px solid var(--border)"}}>
              <option value="">All Keys</option>
              <option value="unused">Unused</option>
              <option value="used">Used</option>
            </select>
            <button className="tool-button primary" onClick={() => setShowGenerate(!showGenerate)}><Key size={15}/>Generate Key</button>
          </div>
          {keyNotice && <div className="notice">{keyNotice}</div>}

          {showGenerate && (
            <div className="panel" style={{padding:16,marginBottom:16,display:"grid",gap:12}}>
              <strong>Generate New Key</strong>
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
        <div className="table-panel">
          <div className="office-filters">
            <strong style={{fontSize:"0.95rem"}}>Subscription Plans</strong>
            <button className="tool-button primary" onClick={() => setShowCreate(!showCreate)}><CreditCard size={15}/>Create Plan</button>
          </div>
          {planNotice && <div className="notice">{planNotice}</div>}

          {showCreate && (
            <div className="panel" style={{padding:16,marginBottom:16,display:"grid",gap:12}}>
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
        <div className="table-panel">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search action, actor…" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <button className="tool-button" onClick={() => window.print()}><FileText size={15}/>Export</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Action</th><th>Actor</th><th>Entity</th><th>Detail</th><th>Timestamp</th></tr></thead>
              <tbody>
                {filteredAuditLogs.map(l => (
                  <tr key={l.id}>
                    <td><code style={{fontSize:"0.75rem"}}>{l.id}</code></td>
                    <td><strong style={{fontSize:"0.85rem"}}>{l.action}</strong></td>
                    <td>{l.actor_name ?? "—"}</td>
                    <td><code style={{fontSize:"0.75rem"}}>{l.entity ?? "—"}</code></td>
                    <td style={{fontSize:"0.82rem"}}>{l.detail ?? "—"}</td>
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
        <div className="table-panel">
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
    return (
      <div className="content-grid">
        <Metrics />
        <div className="stack-list list-panel">
          {data.systemAlerts.map(a => (
            <div key={a.id} className="list-row">
              <AlertTriangle size={16} style={{color: a.severity==="critical" ? "#ef4444" : "#f59e0b", flexShrink:0}}/>
              <div>
                <strong style={{fontSize:"0.9rem"}}>{a.type}</strong>
                <br/><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{a.message}</span>
                {a.school && <span style={{fontSize:"0.78rem",color:"var(--muted)"}}> · {a.school}</span>}
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                <span className={`badge ${a.severity==="critical" ? "error" : "warning"}`}>{a.severity}</span>
                <span style={{fontSize:"0.75rem",color:"var(--muted)"}}>{a.time}</span>
              </div>
            </div>
          ))}
          {data.systemAlerts.length === 0 && <p className="empty-state">No alerts</p>}
        </div>
      </div>
    );
  }

  // ===================== Support =====================
  if (view === "Support") {
    return (
      <div className="content-grid">
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {(
            [
              [Ticket,"Open Tickets","12 pending support requests from schools"],
              [Settings,"DB Migrations","Manage schema updates and rollbacks"],
              [Activity,"Runtime Logs","Monitor active processes and errors"],
            ] as [typeof Ticket, string, string][]
          ).map(([Icon, title, desc]) => (
            <div key={title} className="detail-panel" style={{padding:20,display:"grid",gap:10}}>
              <Icon size={28} style={{color:"var(--primary)"}}/>
              <strong>{title}</strong>
              <span style={{fontSize:"0.82rem",color:"var(--muted)"}}>{desc}</span>
              <button className="tool-button primary"><Activity size={14}/>Open</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="content-grid">
      <Metrics />
      <div className="notice-strip">Select a view — Dashboard, Schools, Registrations, Keys, Plans, Audit Log, Users, System Alerts, or Support.</div>
    </div>
  );
}
