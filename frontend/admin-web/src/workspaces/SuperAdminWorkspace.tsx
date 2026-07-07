import { useState } from "react";
import { ShieldCheck, Server, AlertTriangle, CheckCircle, Clock, Activity, Settings, Ticket, Search, FileText } from "lucide-react";
import type { ConnectedData } from "../api";

interface SuperAdminWorkspaceProps {
  view: string;
  data: ConnectedData;
}

export function SuperAdminWorkspace({ view, data }: SuperAdminWorkspaceProps) {
  const [search, setSearch] = useState("");

  const activeSchools = data.systemSchools.filter(s => s.status === "Active").length;
  const totalStudents = data.systemSchools.reduce((s, sc) => s + sc.students, 0);
  const criticalAlerts = data.systemAlerts.filter(a => a.severity === "critical").length;

  const filteredSchools = data.systemSchools.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.code?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLogs = data.auditLogs.filter(l =>
    !search || l.action?.toLowerCase().includes(search.toLowerCase()) || l.actor?.toLowerCase().includes(search.toLowerCase())
  );

  const Metrics = () => (
    <div className="metric-grid">
      <div className="metric teal"><div className="metric-icon"><ShieldCheck size={22}/></div><div className="metric-body"><strong>{activeSchools}</strong><span>Active Schools</span></div></div>
      <div className="metric green"><div className="metric-icon"><Activity size={22}/></div><div className="metric-body"><strong>{totalStudents.toLocaleString()}</strong><span>Total Students</span></div></div>
      <div className="metric red"><div className="metric-icon"><AlertTriangle size={22}/></div><div className="metric-body"><strong>{criticalAlerts}</strong><span>Critical Alerts</span></div></div>
      <div className="metric blue"><div className="metric-icon"><Server size={22}/></div><div className="metric-body"><strong>99.8%</strong><span>Uptime</span></div></div>
    </div>
  );

  if (view === "Dashboard") {
    const health = [
      { name: "API Server", ok: true },
      { name: "Database", ok: true },
      { name: "SMS Gateway", ok: true },
      { name: "File Storage", ok: false },
    ];
    const perf = [
      ["API Response", "142ms"],
      ["DB Queries/sec", "1,247"],
      ["Active Sessions", "892"],
      ["Error Rate", "0.02%"],
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
            <div className="panel-title"><strong style={{fontSize:"0.9rem"}}>Performance</strong></div>
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

  if (view === "Schools") {
    return (
      <div className="content-grid">
        <Metrics />
        <div className="table-panel">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search school name or code…" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <button className="tool-button primary"><ShieldCheck size={15}/>Onboard School</button>
            <button className="tool-button" onClick={() => window.print()}><FileText size={15}/>Export</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Code</th><th>School Name</th><th>Tier</th><th>Plan</th><th>Students</th><th>Status</th><th>Since</th></tr></thead>
              <tbody>
                {filteredSchools.map(s => (
                  <tr key={s.id}>
                    <td><code>{s.code}</code></td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.tier}</td>
                    <td>{s.plan}</td>
                    <td>{s.students.toLocaleString()}</td>
                    <td><span className={`badge ${s.status==="Active" ? "success" : s.status==="Trial" ? "info" : "error"}`}>{s.status}</span></td>
                    <td>{s.activeSince}</td>
                  </tr>
                ))}
                {filteredSchools.length === 0 && <tr><td colSpan={7} className="empty-state">No schools found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

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
              <thead><tr><th>ID</th><th>Action</th><th>Actor</th><th>Role</th><th>School</th><th>Entity</th><th>Timestamp</th><th>Severity</th></tr></thead>
              <tbody>
                {filteredLogs.map(l => (
                  <tr key={l.id}>
                    <td><code style={{fontSize:"0.75rem"}}>{l.id}</code></td>
                    <td><strong style={{fontSize:"0.85rem"}}>{l.action}</strong></td>
                    <td>{l.actor}</td>
                    <td>{l.role}</td>
                    <td>{l.school}</td>
                    <td><code style={{fontSize:"0.75rem"}}>{l.entity}</code></td>
                    <td style={{fontSize:"0.82rem"}}>{l.timestamp}</td>
                    <td><span className={`badge ${l.severity==="critical" ? "error" : l.severity==="warning" ? "warning" : "muted"}`}>{l.severity}</span></td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && <tr><td colSpan={8} className="empty-state">No logs found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

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

  // Default
  return (
    <div className="content-grid">
      <Metrics />
      <div className="notice-strip">Select a view — Dashboard, Schools, Audit Log, System Alerts, or Support.</div>
    </div>
  );
}
