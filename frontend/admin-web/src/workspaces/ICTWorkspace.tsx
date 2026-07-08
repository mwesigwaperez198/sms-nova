import { useState } from "react";
import { Activity, Database, HardDrive, Users, Wifi, Shield, RefreshCw, Server, Monitor, CheckCircle, AlertTriangle, XCircle, Smartphone, Bell } from "lucide-react";
import type { ConnectedData } from "../api";

interface ICTWorkspaceProps {
  view: string;
  data: ConnectedData;
  onViewChange: (view: string) => void;
}

const SCHOOLS = [
  { id: "1", name: "Novara International School", domain: "novara.sc.ug", users: 1240, storage: 68, uptime: 99.2, status: "Healthy" as const },
  { id: "2", name: "Kampala High School", domain: "kampalahigh.sc.ug", users: 890, storage: 54, uptime: 97.8, status: "Warning" as const },
  { id: "3", name: "Jinja College", domain: "jinjacollege.sc.ug", users: 560, storage: 72, uptime: 95.1, status: "Warning" as const },
  { id: "4", name: "Gulu Standard School", domain: "gulustandard.sc.ug", users: 320, storage: 41, uptime: 99.8, status: "Healthy" as const },
  { id: "5", name: "Mbarara Science Academy", domain: "mbararasci.sc.ug", users: 480, storage: 63, uptime: 88.4, status: "Critical" as const },
];

const SYSTEM_HEALTH = [
  { label: "Database", value: "Operational", status: "success" as const, icon: Database },
  { label: "API Server", value: "All endpoints OK", status: "success" as const, icon: Server },
  { label: "Email Service", value: "Queue: 12 pending", status: "warning" as const, icon: Smartphone },
  { label: "SMS Gateway", value: "Active", status: "success" as const, icon: Wifi },
  { label: "SSL Certificates", value: "2 expiring in 14 days", status: "warning" as const, icon: Shield },
];

const RECENT_ALERTS = [
  { severity: "High" as const, message: "Mbarara Science Academy — storage above 85%", time: "10 min ago" },
  { severity: "Medium" as const, message: "SSL certificate for kampalahigh.sc.ug expires soon", time: "1 hr ago" },
  { severity: "Low" as const, message: "Jinja College — backup completed", time: "3 hrs ago" },
];

export function ICTWorkspace({ view, data, onViewChange }: ICTWorkspaceProps) {
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const school = selectedSchool ? SCHOOLS.find(s => s.id === selectedSchool) || SCHOOLS[0] : null;
  const systemSchools = data.systemSchools.length > 0 ? data.systemSchools : SCHOOLS;

  if (view === "School Health") {
    return (
      <div className="content-grid">
        <div className="metric-grid">
          <div className="metric teal"><div className="metric-icon"><Server size={22} /></div><div className="metric-body"><strong>{systemSchools.length}</strong><span>Schools</span></div></div>
          <div className="metric green"><div className="metric-icon"><Users size={22} /></div><div className="metric-body"><strong>{systemSchools.reduce((s, sc) => s + (sc as any).users || 0, 0)}</strong><span>Total Users</span></div></div>
          <div className="metric amber"><div className="metric-icon"><AlertTriangle size={22} /></div><div className="metric-body"><strong>{systemSchools.filter((sc: any) => sc.status === "Warning" || sc.status === "Critical").length}</strong><span>Issues</span></div></div>
          <div className="metric red"><div className="metric-icon"><Activity size={22} /></div><div className="metric-body"><strong>{Math.round(systemSchools.reduce((s, sc: any) => s + (sc.uptime || 99), 0) / systemSchools.length)}%</strong><span>Avg Uptime</span></div></div>
        </div>

        <div className="office-layout">
          <div className="table-panel">
            <div className="office-filters">
              <strong style={{fontSize:"0.95rem"}}>Registered Schools</strong>
              <button className="tool-button" onClick={() => setRefreshKey(k => k + 1)}><RefreshCw size={14} />Refresh</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>School</th><th>Domain</th><th>Users</th><th>Storage</th><th>Uptime</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {(systemSchools.length > 0 ? systemSchools : SCHOOLS).map((sc: any) => (
                    <tr key={sc.id} onClick={() => setSelectedSchool(sc.id)} style={{cursor:"pointer", background: selectedSchool === sc.id ? "var(--hover)" : undefined}}>
                      <td><strong>{sc.name}</strong></td>
                      <td><code>{sc.domain}</code></td>
                      <td>{sc.users ?? 0}</td>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{flex:1,height:6,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
                            <div style={{width:`${sc.storage ?? 0}%`,height:"100%",background: (sc.storage ?? 0) > 80 ? "#ef4444" : (sc.storage ?? 0) > 60 ? "#f59e0b" : "#10b981",borderRadius:3}} />
                          </div>
                          {sc.storage ?? 0}%
                        </div>
                      </td>
                      <td>{sc.uptime ?? 99}%</td>
                      <td>
                        <span className={`badge ${sc.status === "Healthy" ? "success" : sc.status === "Warning" ? "warning" : "error"}`}>
                          {sc.status === "Healthy" ? <CheckCircle size={12} /> : sc.status === "Warning" ? <AlertTriangle size={12} /> : <XCircle size={12} />}
                          {sc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {school && (
            <div className="detail-panel">
              <div className="panel-title">
                <div className="panel-title-left"><p className="eyebrow">Details</p><strong>{school.name}</strong></div>
                <Monitor size={18} />
              </div>
              <div style={{display:"grid",gap:10,padding:"4px 0"}}>
                <div><span style={{color:"var(--muted)",fontSize:"0.82rem"}}>Domain</span><br/><code>{school.domain}</code></div>
                <div><span style={{color:"var(--muted)",fontSize:"0.82rem"}}>Registered Users</span><br/>{school.users}</div>
                <div><span style={{color:"var(--muted)",fontSize:"0.82rem"}}>Storage Used</span><br/>{school.storage}%</div>
                <div><span style={{color:"var(--muted)",fontSize:"0.82rem"}}>Uptime (30d)</span><br/>{school.uptime}%</div>
                <div style={{display:"flex",gap:6,marginTop:8}}>
                  <button className="tool-button primary" style={{flex:1}}>View Dashboard</button>
                  <button className="tool-button" style={{flex:1}}>Run Check</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent alerts */}
        <div className="list-panel">
          <div className="panel-title"><strong>System Alerts</strong></div>
          <div className="stack-list">
            {(data.systemAlerts.length > 0 ? data.systemAlerts : RECENT_ALERTS).map((a, i) => (
              <div key={i} className="list-row">
                <div className="dot" style={{background: a.severity === "High" ? "#ef4444" : a.severity === "Medium" ? "#f59e0b" : "#10b981"}} />
                <div>
                  <span style={{fontSize:"0.88rem"}}>{a.message}</span>
                  <br /><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{(a as any).time || "Just now"}</span>
                </div>
                <span className={`badge ${a.severity === "High" ? "error" : a.severity === "Medium" ? "warning" : "info"}`}>{a.severity}</span>
              </div>
            ))}
            {data.systemAlerts.length === 0 && RECENT_ALERTS.length === 0 && <p className="empty-state">No alerts</p>}
          </div>
        </div>
      </div>
    );
  }

  if (view === "System Health") {
    return (
      <div className="content-grid">
        <div className="metric-grid">
          {SYSTEM_HEALTH.map((h, i) => (
            <div key={i} className={`metric ${h.status === "success" ? "green" : "amber"}`}>
              <div className="metric-icon"><h.icon size={22} /></div>
              <div className="metric-body"><strong>{h.value}</strong><span>{h.label}</span></div>
            </div>
          ))}
        </div>

        <div className="list-panel">
          <div className="panel-title"><strong>Recent System Activity</strong></div>
          <div className="stack-list">
            {[
              { action: "Backup completed for all schools", time: "Today 03:00 AM", ok: true },
              { action: "SSL renewal — novara.sc.ug", time: "Yesterday 11:20 AM", ok: true },
              { action: "Database migration v2.3.1 applied", time: "2 days ago", ok: true },
              { action: "High CPU on sms-msku.onrender.com", time: "3 days ago", ok: false },
            ].map((e, i) => (
              <div key={i} className="list-row">
                <div className="dot" style={{background: e.ok ? "#10b981" : "#f59e0b"}} />
                <div>
                  <strong style={{fontSize:"0.88rem"}}>{e.action}</strong>
                  <br /><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{e.time}</span>
                </div>
                <span className={`badge ${e.ok ? "success" : "warning"}`}>{e.ok ? "Completed" : "Warning"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === "Maintenance") {
    return (
      <div className="content-grid">
        <div className="panel-title list-panel">
          <div className="panel-title-left"><p className="eyebrow">Scheduled</p><strong>Maintenance Windows</strong></div>
          <button className="tool-button primary"><RefreshCw size={15} />Schedule New</button>
        </div>
        <div className="stack-list list-panel">
          {[
            { task: "SSL certificate renewal — all schools", date: "2026-07-15", status: "Planned" as const, priority: "High" as const },
            { task: "Database optimization — novara.sc.ug", date: "2026-07-12", status: "In Progress" as const, priority: "Medium" as const },
            { task: "Storage cleanup — Mbarara Science Academy", date: "2026-07-10", status: "Pending" as const, priority: "High" as const },
          ].map((m, i) => (
            <div key={i} className="list-row">
              <div className="dot" style={{background: m.status === "In Progress" ? "#3b82f6" : m.status === "Planned" ? "#f59e0b" : "#6b7280"}} />
              <div>
                <strong style={{fontSize:"0.9rem"}}>{m.task}</strong>
                <br /><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{m.date}</span>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span className={`badge ${m.priority === "High" ? "error" : "warning"}`}>{m.priority}</span>
                <span className={`badge ${m.status === "In Progress" ? "info" : m.status === "Planned" ? "warning" : ""}`}>{m.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === "Notifications") {
    return (
      <div className="content-grid">
        <div className="panel-title list-panel">
          <div className="panel-title-left"><p className="eyebrow">ICT Admin</p><strong>Notifications</strong></div>
          <Bell size={18} />
        </div>
        <div className="stack-list list-panel">
          {data.notifications.length === 0 && RECENT_ALERTS.length === 0 ? (
            <p className="empty-state">No notifications</p>
          ) : (
            (data.notifications.length > 0 ? data.notifications : RECENT_ALERTS.map((a, i) => ({ id: String(i), title: a.message, message: a.message, type: "system", severity: a.severity, status: "Unread" }))).map((n, i) => (
              <div key={i} className="list-row">
                <div className="dot" style={{background: n.severity === "High" ? "#ef4444" : n.severity === "Medium" ? "#f59e0b" : "#10b981"}} />
                <div>
                  <strong style={{fontSize:"0.9rem"}}>{(n as any).title}</strong>
                  <br /><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{(n as any).message} · {(n as any).type}</span>
                </div>
                <span className={`badge ${n.severity === "High" ? "error" : n.severity === "Medium" ? "warning" : "info"}`}>{n.severity}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="content-grid">
      <div className="metric-grid">
        <div className="metric teal"><div className="metric-icon"><Server size={22} /></div><div className="metric-body"><strong>{systemSchools.length}</strong><span>Schools</span></div></div>
        <div className="metric green"><div className="metric-icon"><Activity size={22} /></div><div className="metric-body"><strong>{Math.round(systemSchools.reduce((s, sc: any) => s + (sc.uptime || 99), 0) / systemSchools.length)}%</strong><span>Avg Uptime</span></div></div>
        <div className="metric amber"><div className="metric-icon"><HardDrive size={22} /></div><div className="metric-body"><strong>{Math.round(systemSchools.reduce((s, sc: any) => s + (sc.storage || 50), 0) / systemSchools.length)}%</strong><span>Avg Storage</span></div></div>
        <div className="metric red"><div className="metric-icon"><AlertTriangle size={22} /></div><div className="metric-body"><strong>{systemSchools.filter((sc: any) => sc.status === "Warning" || sc.status === "Critical").length}</strong><span>Issues</span></div></div>
      </div>
      <div className="notice-strip">Select a view — School Health, System Health, Maintenance, or Notifications.</div>
    </div>
  );
}
