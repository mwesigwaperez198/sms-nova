import { useState, useEffect } from "react";
import { Activity, Database, HardDrive, Users, Wifi, Shield, RefreshCw, Server, Monitor, CheckCircle, AlertTriangle, XCircle, Smartphone, Bell, UserCheck, UserX, School, Search, Key } from "lucide-react";
import type { ConnectedData } from "../api";
import type { AdminNotification, ICTSystemHealth } from "../types";
import { fetchICTSystemHealth, apiRequest } from "../api";

interface ICTWorkspaceProps {
  view: string;
  data: ConnectedData;
  onViewChange: (view: string) => void;
}

const FALLBACK_ALERTS: any[] = [];

function buildHealthCards(api: ICTSystemHealth | null) {
  if (!api) {
    return [
      { label: "Database", value: "Loading…", status: "warning" as const, icon: Database },
      { label: "API Server", value: "Loading…", status: "warning" as const, icon: Server },
      { label: "Users", value: "—", status: "warning" as const, icon: Users },
      { label: "Locked Accounts", value: "—", status: "warning" as const, icon: Shield },
      { label: "2FA Enabled", value: "—", status: "warning" as const, icon: Shield },
      { label: "Recent Logins (24h)", value: "—", status: "warning" as const, icon: Activity },
      { label: "Active API Keys", value: "—", status: "warning" as const, icon: Key },
    ];
  }

  const dbOk = api.database === "ok";
  const apiOk = api.api_server === "ok";
  const lockedWarn = api.locked_accounts > 0;

  return [
    {
      label: "Database",
      value: dbOk ? "Operational" : "Down",
      status: dbOk ? "success" as const : "error" as const,
      icon: Database,
    },
    {
      label: "API Server",
      value: apiOk ? "All endpoints OK" : "Degraded",
      status: apiOk ? "success" as const : "error" as const,
      icon: Server,
    },
    {
      label: "Users",
      value: `${api.active_users} / ${api.total_users}`,
      status: "success" as const,
      icon: Users,
    },
    {
      label: "Locked Accounts",
      value: String(api.locked_accounts),
      status: lockedWarn ? "warning" as const : "success" as const,
      icon: lockedWarn ? AlertTriangle : Shield,
    },
    {
      label: "2FA Enabled",
      value: String(api.two_fa_enabled),
      status: "success" as const,
      icon: Shield,
    },
    {
      label: "Recent Logins (24h)",
      value: String(api.recent_logins_24h),
      status: "success" as const,
      icon: Activity,
    },
    {
      label: "Active API Keys",
      value: String(api.api_keys_active),
      status: "success" as const,
      icon: Key,
    },
  ];
}

export function ICTWorkspace({ view, data, onViewChange }: ICTWorkspaceProps) {
  const [userVerifySearch, setUserVerifySearch] = useState("");
  const [systemHealth, setSystemHealth] = useState<ICTSystemHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHealthLoading(true);
    fetchICTSystemHealth()
      .then(res => { if (!cancelled) { setSystemHealth(res); setHealthLoading(false); } })
      .catch(err => { if (!cancelled) { setHealthError(err?.message ?? "Failed to load"); setHealthLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const schoolName = data.school.name;
  const students = data.students;
  const staff = data.staff;
  const activeStudents = students.filter(s => s.status === "Active");
  const activeStaff = staff.filter(s => s.status === "Active");

  const totalUsers = systemHealth ? systemHealth.total_users : activeStudents.length + activeStaff.length;
  const totalStudents = systemHealth ? systemHealth.total_students : students.length;

  const unverifiedUsers = students.filter(s => s.status === "Pending");
  const filteredVerify = unverifiedUsers.filter(s =>
    !userVerifySearch || s.name.toLowerCase().includes(userVerifySearch.toLowerCase()) || s.admissionNo.toLowerCase().includes(userVerifySearch.toLowerCase())
  );

  if (view === "Dashboard") {
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>System Maintenance</h2>
          <p>Monitor system health, manage approvals, and oversee technical operations.</p>
        </div>
        <div className="notice-strip" style={{fontWeight:600,fontSize:"1.1rem"}}>
          <School size={18} /> {schoolName} — ICT Overview
        </div>
        <div className="metric-grid">
          <div className="metric teal"><div className="metric-icon"><Server size={22} /></div><div className="metric-body"><strong>{totalUsers}</strong><span>Total Users</span></div></div>
          <div className="metric green"><div className="metric-icon"><Users size={22} /></div><div className="metric-body"><strong>{totalStudents}</strong><span>Students</span></div></div>
          <div className="metric amber"><div className="metric-icon"><UserCheck size={22} /></div><div className="metric-body"><strong>{activeStaff.length}</strong><span>Staff</span></div></div>
          <div className="metric red"><div className="metric-icon"><AlertTriangle size={22} /></div><div className="metric-body"><strong>{unverifiedUsers.length}</strong><span>Pending Verification</span></div></div>
        </div>
        <div className="office-layout">
          <div className="list-panel glass-card">
            <div className="panel-title"><strong>School Details</strong></div>
            <div style={{display:"grid",gap:10,padding:"8px 0"}}>
              <div><span style={{color:"var(--muted)",fontSize:"0.82rem"}}>School Name</span><br/>{schoolName}</div>
              <div><span style={{color:"var(--muted)",fontSize:"0.82rem"}}>Term</span><br/>{data.school.term} — {data.school.academic_year}</div>
              <div><span style={{color:"var(--muted)",fontSize:"0.82rem"}}>Total Students</span><br/>{students.length}</div>
              <div><span style={{color:"var(--muted)",fontSize:"0.82rem"}}>Total Staff</span><br/>{staff.length}</div>
              {systemHealth && (
                <>
                  <div><span style={{color:"var(--muted)",fontSize:"0.82rem"}}>Recent Logins (24h)</span><br/>{systemHealth.recent_logins_24h}</div>
                  <div><span style={{color:"var(--muted)",fontSize:"0.82rem"}}>Active API Keys</span><br/>{systemHealth.api_keys_active}</div>
                </>
              )}
            </div>
          </div>
          <div className="list-panel glass-card">
            <div className="panel-title"><strong>Quick Actions</strong></div>
            <div style={{display:"grid",gap:8,padding:"8px 0"}}>
              <button className="tool-button primary" onClick={() => onViewChange("User Verification")}><UserCheck size={15} />Verify Users ({unverifiedUsers.length})</button>
              <button className="tool-button" onClick={() => onViewChange("System Health")}><Server size={15} />System Health</button>
              <button className="tool-button" onClick={() => onViewChange("Notifications")}><Bell size={15} />Notifications</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "User Verification") {
    return (
      <div className="content-grid">
        <div className="panel-title list-panel">
          <div className="panel-title-left"><p className="eyebrow">{schoolName}</p><strong>User Verification</strong></div>
          <span className="badge warning">{unverifiedUsers.length} Pending</span>
        </div>
        <div className="office-filters" style={{padding:"0 0 8px"}}>
          <label><Search size={15} /><input placeholder="Search by name or admission number…" value={userVerifySearch} onChange={e => setUserVerifySearch(e.target.value)} /></label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Admission No</th><th>Name</th><th>Class</th><th>Guardian</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filteredVerify.map(s => (
                <tr key={s.admissionNo}>
                  <td><code>{s.admissionNo}</code></td>
                  <td>{s.name}</td>
                  <td>{s.className} {s.stream}</td>
                  <td>{s.guardian}</td>
                  <td><span className="badge warning">{s.status}</span></td>
                  <td>
                    <div style={{display:"flex",gap:4}}>
                      <button className="tool-button primary" style={{minHeight:26,fontSize:"0.78rem"}} onClick={() => apiRequest(`/api/v1/users/${s.admissionNo}`, { method: "PATCH", body: JSON.stringify({ is_active: true }) }).then(() => window.location.reload())}><CheckCircle size={12} />Approve</button>
                      <button className="tool-button" style={{minHeight:26,fontSize:"0.78rem"}} onClick={() => apiRequest(`/api/v1/users/${s.admissionNo}`, { method: "DELETE" }).then(() => window.location.reload())}><UserX size={12} />Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredVerify.length === 0 && <tr><td colSpan={6} className="empty-state">All users verified</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="panel-title list-panel" style={{marginTop:12}}>
          <div className="panel-title-left"><p className="eyebrow">Active</p><strong>Verified Users</strong></div>
          <span className="badge success">{activeStudents.length + activeStaff.length} Active</span>
        </div>
        <div className="stack-list list-panel">
          {activeStudents.slice(0, 10).map(s => (
            <div key={s.admissionNo} className="list-row">
              <div className="dot" style={{background:"#10b981"}} />
              <div><strong style={{fontSize:"0.88rem"}}>{s.name}</strong><br /><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{s.admissionNo} · {s.className} {s.stream}</span></div>
              <span className="badge success">Student</span>
            </div>
          ))}
          {activeStaff.slice(0, 5).map(s => (
            <div key={s.staffNo} className="list-row">
              <div className="dot" style={{background:"#3b82f6"}} />
              <div><strong style={{fontSize:"0.88rem"}}>{s.name}</strong><br /><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{s.staffNo} · {s.role} · {s.department}</span></div>
              <span className="badge info">Staff</span>
            </div>
          ))}
          {activeStudents.length === 0 && activeStaff.length === 0 && <p className="empty-state">No verified users</p>}
        </div>
      </div>
    );
  }

  if (view === "System Health") {
    const healthCards = buildHealthCards(systemHealth);

    return (
      <div className="content-grid">
        <div className="notice-strip">
          <Monitor size={15} /> {schoolName} — Service Status
        </div>
        {healthError && (
          <div className="notice-strip" style={{color:"var(--danger,#ef4444)"}}>
            <AlertTriangle size={15} /> {healthError}
          </div>
        )}
        <div className="metric-grid">
          {healthCards.map((h, i) => {
            const Icon = h.icon;
            return (
              <div key={i} className={`metric ${h.status === "success" ? "green" : h.status === "error" ? "red" : "amber"}`}>
                <div className="metric-icon"><Icon size={22} /></div>
                <div className="metric-body"><strong>{h.value}</strong><span>{h.label}</span></div>
              </div>
            );
          })}
        </div>

        <div className="list-panel glass-card">
          <div className="panel-title">
            <strong>Recent Activity</strong>
            {healthLoading && <RefreshCw size={14} style={{animation:"spin 1s linear infinite",marginLeft:8}} />}
          </div>
          <div className="stack-list">
            <p className="empty-state">Activity log coming soon</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Notifications") {
    return (
      <div className="content-grid">
        <div className="panel-title list-panel">
          <div className="panel-title-left"><p className="eyebrow">{schoolName}</p><strong>Notifications</strong></div>
          <Bell size={18} />
        </div>
        <div className="stack-list list-panel">
          {data.notifications.length === 0 && FALLBACK_ALERTS.length === 0 ? (
            <p className="empty-state">No notifications</p>
          ) : (
            (data.notifications.length > 0 ? data.notifications : FALLBACK_ALERTS.map((a, i) => ({ id: String(i), title: a.message, message: a.message, type: "system" as const, severity: a.severity, status: "Unread" as const })) as AdminNotification[]).map((n, i) => (
              <div key={i} className="list-row">
                <div className="dot" style={{background: n.severity === "critical" ? "#ef4444" : n.severity === "warning" ? "#f59e0b" : "#10b981"}} />
                <div>
                  <strong style={{fontSize:"0.9rem"}}>{n.title}</strong>
                  <br /><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{n.message} · {n.type}</span>
                </div>
                <span className={`badge ${n.severity === "critical" ? "error" : n.severity === "warning" ? "warning" : "info"}`}>{n.severity}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="content-grid">
      <div className="notice-strip" style={{fontWeight:600,fontSize:"1.1rem"}}>
        <School size={18} /> {schoolName} — ICT Dashboard
      </div>
      <div className="metric-grid">
        <div className="metric teal"><div className="metric-icon"><Server size={22} /></div><div className="metric-body"><strong>{totalUsers}</strong><span>Total Users</span></div></div>
        <div className="metric green"><div className="metric-icon"><Users size={22} /></div><div className="metric-body"><strong>{totalStudents}</strong><span>Students</span></div></div>
        <div className="metric amber"><div className="metric-icon"><UserCheck size={22} /></div><div className="metric-body"><strong>{activeStaff.length}</strong><span>Staff</span></div></div>
        <div className="metric red"><div className="metric-icon"><AlertTriangle size={22} /></div><div className="metric-body"><strong>{unverifiedUsers.length}</strong><span>Pending Verification</span></div></div>
      </div>
      <div className="notice-strip">Select a view — User Verification, System Health, or Notifications.</div>
    </div>
  );
}
