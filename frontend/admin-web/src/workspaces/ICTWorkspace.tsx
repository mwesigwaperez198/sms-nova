import { useState } from "react";
import { Activity, Database, HardDrive, Users, Wifi, Shield, RefreshCw, Server, Monitor, CheckCircle, AlertTriangle, XCircle, Smartphone, Bell, UserCheck, UserX, School, Search } from "lucide-react";
import type { ConnectedData } from "../api";

interface ICTWorkspaceProps {
  view: string;
  data: ConnectedData;
  onViewChange: (view: string) => void;
}

const SYSTEM_HEALTH = [
  { label: "Database", value: "Operational", status: "success" as const, icon: Database },
  { label: "API Server", value: "All endpoints OK", status: "success" as const, icon: Server },
  { label: "Email Service", value: "Queue: 12 pending", status: "warning" as const, icon: Smartphone },
  { label: "SMS Gateway", value: "Active", status: "success" as const, icon: Wifi },
  { label: "SSL Certificates", value: "2 expiring in 14 days", status: "warning" as const, icon: Shield },
];

const RECENT_ALERTS = [
  { severity: "critical" as const, message: "Storage above 85% — cleanup recommended", time: "10 min ago" },
  { severity: "warning" as const, message: "Email queue backlog — 12 pending", time: "1 hr ago" },
  { severity: "info" as const, message: "Daily backup completed", time: "3 hrs ago" },
];

const MAINTENANCE_TASKS = [
  { task: "SSL certificate renewal", date: "2026-07-15", status: "Planned" as const, priority: "High" as const },
  { task: "Database optimization", date: "2026-07-12", status: "In Progress" as const, priority: "Medium" as const },
  { task: "Storage cleanup", date: "2026-07-10", status: "Pending" as const, priority: "High" as const },
];

export function ICTWorkspace({ view, data, onViewChange }: ICTWorkspaceProps) {
  const [userVerifySearch, setUserVerifySearch] = useState("");

  const schoolName = data.school.name;
  const students = data.students;
  const staff = data.staff;
  const activeStudents = students.filter(s => s.status === "Active");
  const activeStaff = staff.filter(s => s.status === "Active");

  const unverifiedUsers = students.filter(s => s.status === "Pending");
  const filteredVerify = unverifiedUsers.filter(s =>
    !userVerifySearch || s.name.toLowerCase().includes(userVerifySearch.toLowerCase()) || s.admissionNo.toLowerCase().includes(userVerifySearch.toLowerCase())
  );

  if (view === "Dashboard") {
    return (
      <div className="content-grid">
        <div className="notice-strip" style={{fontWeight:600,fontSize:"1.1rem"}}>
          <School size={18} /> {schoolName} — ICT Overview
        </div>
        <div className="metric-grid">
          <div className="metric teal"><div className="metric-icon"><Server size={22} /></div><div className="metric-body"><strong>{activeStudents.length + activeStaff.length}</strong><span>Active Users</span></div></div>
          <div className="metric green"><div className="metric-icon"><Users size={22} /></div><div className="metric-body"><strong>{activeStudents.length}</strong><span>Students</span></div></div>
          <div className="metric amber"><div className="metric-icon"><UserCheck size={22} /></div><div className="metric-body"><strong>{activeStaff.length}</strong><span>Staff</span></div></div>
          <div className="metric red"><div className="metric-icon"><AlertTriangle size={22} /></div><div className="metric-body"><strong>{unverifiedUsers.length}</strong><span>Pending Verification</span></div></div>
        </div>
        <div className="office-layout">
          <div className="list-panel">
            <div className="panel-title"><strong>School Details</strong></div>
            <div style={{display:"grid",gap:10,padding:"8px 0"}}>
              <div><span style={{color:"var(--muted)",fontSize:"0.82rem"}}>School Name</span><br/>{schoolName}</div>
              <div><span style={{color:"var(--muted)",fontSize:"0.82rem"}}>Term</span><br/>{data.school.term} — {data.school.academic_year}</div>
              <div><span style={{color:"var(--muted)",fontSize:"0.82rem"}}>Total Students</span><br/>{students.length}</div>
              <div><span style={{color:"var(--muted)",fontSize:"0.82rem"}}>Total Staff</span><br/>{staff.length}</div>
            </div>
          </div>
          <div className="list-panel">
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
                      <button className="tool-button primary" style={{minHeight:26,fontSize:"0.78rem"}}><CheckCircle size={12} />Approve</button>
                      <button className="tool-button" style={{minHeight:26,fontSize:"0.78rem"}}><UserX size={12} />Reject</button>
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
    return (
      <div className="content-grid">
        <div className="notice-strip">
          <Monitor size={15} /> {schoolName} — Service Status
        </div>
        <div className="metric-grid">
          {SYSTEM_HEALTH.map((h, i) => (
            <div key={i} className={`metric ${h.status === "success" ? "green" : "amber"}`}>
              <div className="metric-icon"><h.icon size={22} /></div>
              <div className="metric-body"><strong>{h.value}</strong><span>{h.label}</span></div>
            </div>
          ))}
        </div>

        <div className="list-panel">
          <div className="panel-title"><strong>Recent Activity</strong></div>
          <div className="stack-list">
            {[
              { action: "Daily backup completed", time: "Today 03:00 AM", ok: true },
              { action: "User verification: 3 new students approved", time: "Yesterday 11:20 AM", ok: true },
              { action: "Database migration applied", time: "2 days ago", ok: true },
              { action: "High CPU detected — resolved", time: "3 days ago", ok: false },
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

  if (view === "Notifications") {
    return (
      <div className="content-grid">
        <div className="panel-title list-panel">
          <div className="panel-title-left"><p className="eyebrow">{schoolName}</p><strong>Notifications</strong></div>
          <Bell size={18} />
        </div>
        <div className="stack-list list-panel">
          {data.notifications.length === 0 && RECENT_ALERTS.length === 0 ? (
            <p className="empty-state">No notifications</p>
          ) : (
            (data.notifications.length > 0 ? data.notifications : RECENT_ALERTS.map((a, i) => ({ id: String(i), title: a.message, message: a.message, type: "system", severity: a.severity, status: "Unread" }))).map((n, i) => (
              <div key={i} className="list-row">
                <div className="dot" style={{background: n.severity === "critical" ? "#ef4444" : n.severity === "warning" ? "#f59e0b" : "#10b981"}} />
                <div>
                  <strong style={{fontSize:"0.9rem"}}>{(n as any).title}</strong>
                  <br /><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{(n as any).message} · {(n as any).type}</span>
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
        <div className="metric teal"><div className="metric-icon"><Server size={22} /></div><div className="metric-body"><strong>{activeStudents.length + activeStaff.length}</strong><span>Active Users</span></div></div>
        <div className="metric green"><div className="metric-icon"><Users size={22} /></div><div className="metric-body"><strong>{activeStudents.length}</strong><span>Students</span></div></div>
        <div className="metric amber"><div className="metric-icon"><UserCheck size={22} /></div><div className="metric-body"><strong>{activeStaff.length}</strong><span>Staff</span></div></div>
        <div className="metric red"><div className="metric-icon"><AlertTriangle size={22} /></div><div className="metric-body"><strong>{unverifiedUsers.length}</strong><span>Pending Verification</span></div></div>
      </div>
      <div className="notice-strip">Select a view — User Verification, System Health, or Notifications.</div>
    </div>
  );
}
