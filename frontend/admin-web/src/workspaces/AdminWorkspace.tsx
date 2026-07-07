import { useState } from "react";
import { UserRoundCog, Users, Download, FileText, Database, User, GraduationCap, Search, MessageSquare, Bell, CheckCircle, XCircle, RotateCcw, Send, Phone, Mail, ArrowRight, ShieldCheck, TrendingUp, BarChart3, PieChart, Activity, AlertTriangle, Eye, Printer, RefreshCw } from "lucide-react";
import type { ConnectedData } from "../api";
import { sendSmsBatch, sendRoleNotification } from "../api";

interface AdminWorkspaceProps {
  view: string;
  data: ConnectedData;
  onViewChange: (view: string) => void;
}

const roleAccent: Record<string, string> = {
  Home: "#0891b2",
  Approvals: "#f59e0b",
  Students: "#0891b2",
  Staff: "#059669",
  Finance: "#7c3aed",
  Communication: "#ea580c",
  Reports: "#4f46e5",
  Settings: "#94a3b8",
  Notifications: "#dc2626",
};

export function AdminWorkspace({ view, data, onViewChange }: AdminWorkspaceProps) {
  const [search, setSearch] = useState("");
  const [msgRoleId, setMsgRoleId] = useState(data.smsGroups[0]?.roleId ?? 4);
  const [msgText, setMsgText] = useState("");
  const [msgSent, setMsgSent] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMsg, setNotifMsg] = useState("");
  const [notifRole, setNotifRole] = useState(4);
  const [notifSent, setNotifSent] = useState("");

  const filteredStudents = data.students.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.admissionNo?.toLowerCase().includes(search.toLowerCase()) ||
    s.className?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSendMsg = async () => {
    if (!msgText.trim()) return;
    setMsgSending(true);
    const group = data.smsGroups.find(g => g.roleId === msgRoleId);
    try {
      const result = await sendSmsBatch(group?.id ?? "all-parents", msgText, "");
      setMsgSent(result);
      setMsgText("");
    } catch (e: any) {
      setMsgSent(`Error: ${e.message}`);
    } finally {
      setMsgSending(false);
      setTimeout(() => setMsgSent(""), 5000);
    }
  };

  const handleSendNotif = async () => {
    if (!notifTitle.trim() || !notifMsg.trim()) return;
    try {
      await sendRoleNotification(notifRole, notifTitle, notifMsg);
      setNotifSent("Notification broadcast sent");
      setNotifTitle("");
      setNotifMsg("");
    } catch (e: any) {
      setNotifSent(`Error: ${e.message}`);
    }
    setTimeout(() => setNotifSent(""), 5000);
  };

  const accent = roleAccent[view] ?? "#0891b2";

  if (view === "Home") {
    const { student_summary: ss, finance_summary: fs } = data.home;
    return (
      <div className="content-grid">
        <div className="metric-grid">
          <div className="metric teal" style={{ borderTop: `3px solid ${accent}` }}><div className="metric-icon"><Users size={22}/></div><div className="metric-body"><strong>{ss.total.toLocaleString()}</strong><span>Students</span></div></div>
          <div className="metric green" style={{ borderTop: "3px solid #059669" }}><div className="metric-icon"><GraduationCap size={22}/></div><div className="metric-body"><strong>{data.staff.length}</strong><span>Staff</span></div></div>
          <div className="metric amber" style={{ borderTop: "3px solid #f59e0b" }}><div className="metric-icon"><FileText size={22}/></div><div className="metric-body"><strong>{fs.collection_rate}%</strong><span>Fee Collection</span></div></div>
          <div className="metric red" style={{ borderTop: "3px solid #ef4444" }}><div className="metric-icon"><Bell size={22}/></div><div className="metric-body"><strong>{data.approvals.filter(a=>a.status==="Pending").length}</strong><span>Pending Approvals</span></div></div>
        </div>

        <div className="stack-list list-panel">
          <div className="panel-title"><strong style={{fontSize:"0.9rem", color: accent}}>Recent Notifications</strong><span className="badge muted">{data.notifications.length}</span></div>
          {data.notifications.slice(0, 6).map(n => (
            <div key={n.id} className="list-row">
              <div className="dot" style={{background: n.severity==="High" ? "#ef4444" : "#f59e0b"}} />
              <div>
                <strong style={{fontSize:"0.9rem"}}>{n.title}</strong>
                <br/><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{n.message}</span>
              </div>
              <span className={`badge ${n.severity==="High" ? "error" : "warning"}`}>{n.severity}</span>
            </div>
          ))}
        </div>

        <div className="profile-grid-detail">
          {[
            ["Expected",fs.expected],["Collected",fs.collected],["Outstanding",fs.outstanding],["Collection Rate",`${fs.collection_rate}%`]
          ].map(([label,val]) => (
            <div key={label} className="detail-cell" style={{borderLeft: `3px solid ${accent}`}}><span>{label}</span><strong>{val}</strong></div>
          ))}
        </div>
      </div>
    );
  }

  if (view === "Approvals") {
    return (
      <div className="content-grid">
        <div className="stack-list list-panel">
          <div className="panel-title"><strong style={{fontSize:"0.9rem", color: accent}}>Pending Approvals</strong><span className="badge warning">{data.approvals.filter(a=>a.status==="Pending").length} pending</span></div>
          {data.approvals.map(a => (
            <div key={a.id} className="list-row">
              <div className="dot" style={{background: a.priority==="High" ? "#ef4444" : a.priority==="Medium" ? "#f59e0b" : "#10b981"}} />
              <div>
                <strong style={{fontSize:"0.9rem"}}>{a.title}</strong>
                <br/><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{a.type} · {a.submitted_by}</span>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <span className={`badge ${a.status==="Pending" ? "warning" : a.status==="Under Review" ? "info" : "success"}`}>{a.status}</span>
                <button className="tool-button primary" style={{minHeight:28,fontSize:"0.78rem"}}><CheckCircle size={12}/>Approve</button>
                <button className="tool-button danger" style={{minHeight:28,fontSize:"0.78rem"}}><XCircle size={12}/>Reject</button>
              </div>
            </div>
          ))}
          {data.approvals.length === 0 && <p className="empty-state">No pending approvals</p>}
        </div>
      </div>
    );
  }

  if (view === "Students") {
    return (
      <div className="content-grid">
        <div className="table-panel">
          <div className="panel-title">
            <strong style={{fontSize:"0.9rem", color: accent}}>Student Records</strong>
            <span className="badge info">{filteredStudents.length} students</span>
          </div>
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search name, admission no, class…" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <button className="tool-button primary" onClick={() => onViewChange("Register Student")}><Users size={15}/>Add Student</button>
            <button className="tool-button" onClick={() => window.print()}><FileText size={15}/>Export</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Adm No</th><th>Name</th><th>Gender</th><th>Class</th><th>Guardian</th><th>Status</th></tr></thead>
              <tbody>
                {filteredStudents.map(s => (
                  <tr key={s.admissionNo}>
                    <td><code>{s.admissionNo}</code></td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.gender}</td>
                    <td>{s.className}</td>
                    <td>{s.guardian}{s.guardianPhone ? <span style={{display:"block",fontSize:"0.75rem",color:"var(--muted)"}}><Phone size={10}/>{s.guardianPhone}</span> : null}</td>
                    <td><span className={`badge ${s.status==="Active" ? "success" : "warning"}`}>{s.status}</span></td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && <tr><td colSpan={6} className="empty-state">No students found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Staff") {
    return (
      <div className="content-grid">
        <div className="table-panel">
          <div className="panel-title"><strong style={{fontSize:"0.9rem", color: accent}}>Staff Directory</strong><span className="badge info">{data.staff.length} staff</span></div>
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search staff…" /></label>
            <button className="tool-button primary"><UserRoundCog size={15}/>Add Staff</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Staff No</th><th>Name</th><th>Role</th><th>Department</th><th>Status</th></tr></thead>
              <tbody>
                {data.staff.map(m => (
                  <tr key={m.staffNo}>
                    <td><code>{m.staffNo}</code></td>
                    <td><strong>{m.name}</strong></td>
                    <td>{m.role}</td>
                    <td>{m.department}</td>
                    <td><span className={`badge ${m.status==="Active" ? "success" : "warning"}`}>{m.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Finance") {
    const { finance_summary: fs } = data.home;
    const auditEntries = data.auditLogs.slice(0, 12);
    const reconciliations = [
      { period: "Term 1 2026", expected: "UGX 48,000,000", actual: "UGX 46,200,000", variance: "UGX 1,800,000", status: "Reviewed" },
      { period: "Term 2 2026", expected: "UGX 52,000,000", actual: "UGX 51,100,000", variance: "UGX 900,000", status: "Pending Review" },
    ];
    return (
      <div className="content-grid">
        <div className="metric-grid">
          <div className="metric blue" style={{borderTop: "3px solid #7c3aed"}}><div className="metric-icon"><ShieldCheck size={22}/></div><div className="metric-body"><strong>{fs.expected}</strong><span>Expected Revenue</span></div></div>
          <div className="metric green" style={{borderTop: "3px solid #059669"}}><div className="metric-icon"><Activity size={22}/></div><div className="metric-body"><strong>{fs.collected}</strong><span>Verified Collections</span></div></div>
          <div className="metric red" style={{borderTop: "3px solid #ef4444"}}><div className="metric-icon"><AlertTriangle size={22}/></div><div className="metric-body"><strong>{fs.outstanding}</strong><span>Outstanding</span></div></div>
          <div className="metric amber" style={{borderTop: "3px solid #f59e0b"}}><div className="metric-icon"><TrendingUp size={22}/></div><div className="metric-body"><strong>{fs.collection_rate}%</strong><span>Audit Confidence</span></div></div>
        </div>

        <div className="stack-list list-panel">
          <div className="panel-title">
            <strong style={{fontSize:"0.9rem", color:"#7c3aed"}}>Reconciliation Statements</strong>
            <Eye size={16}/>
          </div>
          {reconciliations.map(r => (
            <div key={r.period} className="list-row">
              <div className="dot" style={{background: r.status === "Reviewed" ? "#10b981" : "#f59e0b"}}/>
              <div style={{flex:1}}>
                <strong>{r.period}</strong>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginTop:6}}>
                  <span style={{fontSize:"0.78rem",color:"var(--muted)"}}>Expected: <strong>{r.expected}</strong></span>
                  <span style={{fontSize:"0.78rem",color:"var(--muted)"}}>Actual: <strong>{r.actual}</strong></span>
                  <span style={{fontSize:"0.78rem",color:"var(--muted)"}}>Variance: <strong>{r.variance}</strong></span>
                </div>
              </div>
              <span className={`badge ${r.status === "Reviewed" ? "success" : "warning"}`}>{r.status}</span>
            </div>
          ))}
        </div>

        <div className="stack-list list-panel">
          <div className="panel-title">
            <strong style={{fontSize:"0.9rem", color:"#7c3aed"}}>Transaction Audit Trail</strong>
            <span className="badge info">{auditEntries.length} entries</span>
          </div>
          {auditEntries.map(a => (
            <div key={a.id} className="list-row">
              <div className="dot" style={{background: a.severity === "High" ? "#ef4444" : a.severity === "Medium" ? "#f59e0b" : "#10b981"}}/>
              <div>
                <strong style={{fontSize:"0.88rem"}}>{a.action}</strong>
                <br/><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{a.actor} · {a.entity} · {a.timestamp}</span>
              </div>
              <span className={`badge ${a.severity === "High" ? "error" : a.severity === "Medium" ? "warning" : "info"}`}>{a.severity}</span>
            </div>
          ))}
          {auditEntries.length === 0 && <p className="empty-state">No audit entries recorded yet</p>}
        </div>
      </div>
    );
  }

  if (view === "Reports") {
    const { student_summary: ss, finance_summary: fs } = data.home;
    const reportSections = [
      { title: "Enrollment Analysis", icon: <Users size={20}/>, metrics: [
        { label: "Total Students", value: ss.total },
        { label: "Male/Female Ratio", value: `${ss.male}:${ss.female}` },
        { label: "Pending Admissions", value: ss.pending_admissions },
        { label: "Last Import", value: ss.last_import_batch || "N/A" },
      ]},
      { title: "Financial Health", icon: <TrendingUp size={20}/>, metrics: [
        { label: "Collection Rate", value: `${fs.collection_rate}%` },
        { label: "Outstanding", value: fs.outstanding },
        { label: "Total Collected", value: fs.collected },
        { label: "Expected Revenue", value: fs.expected },
      ]},
      { title: "Operational Overview", icon: <BarChart3 size={20}/>, metrics: [
        { label: "Active Staff", value: data.staff.length },
        { label: "Library Books", value: data.libraryBooks.length },
        { label: "Notifications", value: data.notifications.length },
        { label: "Audit Entries", value: data.auditLogs.length },
      ]},
    ];
    return (
      <div className="content-grid">
        <div className="table-panel">
          <div className="panel-title">
            <strong style={{fontSize:"0.9rem", color: accent}}>Full System Analysis</strong>
            <BarChart3 size={18} style={{color:accent}}/>
          </div>
          <div style={{display:"grid",gap:16,padding:16}}>
            {reportSections.map(section => (
              <div key={section.title} className="detail-panel" style={{padding:16, borderTop: `3px solid ${accent}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <span style={{color:accent}}>{section.icon}</span>
                  <strong style={{fontSize:"0.95rem"}}>{section.title}</strong>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
                  {section.metrics.map(m => (
                    <div key={m.label} className="detail-cell" style={{borderLeft:`3px solid ${accent}`}}>
                      <span>{m.label}</span>
                      <strong>{m.value ?? "-"}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10,padding:"0 16px 16px"}}>
            <button className="tool-button primary" onClick={() => window.print()}><Printer size={15}/>Generate Full Report</button>
            <button className="tool-button"><Download size={15}/>Export PDF</button>
            <button className="tool-button"><Database size={15}/>Export Data</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Communication") {
    return (
      <div className="office-layout">
        <div className="detail-panel">
          <div className="panel-title" style={{borderBottom: `2px solid ${accent}40`}}>
            <div className="panel-title-left"><p className="eyebrow">Communication</p><strong>Send SMS Broadcast</strong></div>
            <MessageSquare size={18} style={{color:accent}}/>
          </div>
          <div className="office-form">
            <label>Recipient Role
              <div className="sms-groups" style={{marginTop:4}}>
                {data.smsGroups.filter(g => g.id !== "debtors").map(g => (
                  <button
                    key={g.id}
                    type="button"
                    className={`tool-button ${msgRoleId === g.roleId ? "primary" : ""}`}
                    style={{textAlign:"left", justifyContent:"flex-start", minHeight:44}}
                    onClick={() => setMsgRoleId(g.roleId!)}
                  >
                    <Users size={14}/>
                    <span style={{flex:1}}>{g.label}</span>
                    <span className="badge muted">{g.count}</span>
                  </button>
                ))}
              </div>
            </label>
            <label>Message<textarea value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Type your SMS message…" maxLength={480} /></label>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <span style={{fontSize:"0.75rem", color:"var(--muted)"}}>{msgText.length}/480 chars</span>
              {msgSent && <span className="notice-strip success" style={{margin:0, padding:"6px 12px", fontSize:"0.82rem"}}>{msgSent}</span>}
            </div>
            <button className="tool-button primary" onClick={handleSendMsg} disabled={msgSending || !msgText.trim()}>
              {msgSending ? <span className="spinner"/> : <Send size={15}/>}
              {msgSending ? "Sending…" : "Send SMS"}
            </button>
          </div>
        </div>

        <div className="detail-panel">
          <div className="panel-title" style={{borderBottom: `2px solid ${accent}40`}}>
            <strong style={{fontSize:"0.9rem"}}>In-App Notification</strong>
            <Bell size={16} style={{color:accent}}/>
          </div>
          <div className="office-form">
            <label>Target Role
              <select value={notifRole} onChange={e => setNotifRole(Number(e.target.value))}>
                <option value={4}>Parents</option>
                <option value={3}>Teachers</option>
                <option value={6}>Bursars</option>
                <option value={7}>Secretaries</option>
                <option value={8}>Librarians</option>
                <option value={2}>Admins</option>
              </select>
            </label>
            <label>Title<input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="Notification title" /></label>
            <label>Message<textarea value={notifMsg} onChange={e => setNotifMsg(e.target.value)} placeholder="Notification body" /></label>
            {notifSent && <span className="notice-strip success" style={{fontSize:"0.82rem"}}>{notifSent}</span>}
            <button className="tool-button primary" onClick={handleSendNotif} disabled={!notifTitle.trim() || !notifMsg.trim()}>
              <Bell size={15}/>Broadcast Notification
            </button>
          </div>

          <div className="panel-title" style={{borderBottom: `2px solid ${accent}40`}}>
            <strong style={{fontSize:"0.9rem"}}>Message History</strong>
          </div>
          <div className="stack-list">
            {data.messageBatches.length === 0 && <p className="empty-state"><Mail size={28} style={{opacity:0.3}}/>No messages sent yet</p>}
            {data.messageBatches.map(b => (
              <div key={b.batch} className="list-row">
                <div className="dot" style={{background: b.status==="Delivered" ? "#10b981" : "#f59e0b"}}/>
                <div>
                  <strong style={{fontSize:"0.88rem"}}>{b.batch}</strong>
                  <br/><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{b.channel} · {b.recipients}</span>
                  <p style={{margin:"3px 0 0",fontSize:"0.82rem",color:"#e2e8f0"}}>{b.message}</p>
                </div>
                <span className={`badge ${b.status==="Delivered" ? "success" : b.status==="Sent" ? "info" : "warning"}`}>{b.status}</span>
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
        <div className="stack-list list-panel">
          <div className="panel-title"><strong style={{fontSize:"0.9rem", color: accent}}>All Notifications</strong><span className="badge muted">{data.notifications.length} total</span></div>
          {data.notifications.map(n => (
            <div key={n.id} className="list-row">
              <div className="dot" style={{background: n.severity==="High" ? "#ef4444" : "#f59e0b"}}/>
              <div>
                <strong style={{fontSize:"0.9rem"}}>{n.title}</strong>
                <br/><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{n.message} · {n.type}</span>
              </div>
              <span className={`badge ${n.severity==="High" ? "error" : "warning"}`}>{n.severity}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === "Settings") {
    const s = data.school;
    return (
      <div className="content-grid">
        <div className="profile-grid-detail">
          {[
            ["School Name",s.name],["Short Name",s.short_name],["Phone",s.phone],
            ["Email",s.email],["Address",s.address],["Term",`${s.term} ${s.academic_year}`],
          ].map(([label,val]) => (
            <div key={label} className="detail-cell" style={{borderLeft: `3px solid ${accent}`}}><span>{label}</span><strong>{val}</strong></div>
          ))}
        </div>
        <div className="detail-panel" style={{padding:16}}>
          <p className="eyebrow" style={{marginBottom:12}}>Change Password</p>
          <div className="office-form">
            <label>Current Password<input type="password" placeholder="••••••••" /></label>
            <label>New Password<input type="password" placeholder="Min 8 chars, 1 uppercase, 1 digit" /></label>
            <label>Confirm Password<input type="password" placeholder="Repeat new password" /></label>
            <button className="tool-button primary"><RotateCcw size={15}/>Update Password</button>
          </div>
        </div>
      </div>
    );
  }

  const { student_summary: ss, finance_summary: fs } = data.home;
  return (
    <div className="content-grid">
      <div className="metric-grid">
        <div className="metric teal" style={{borderTop: `3px solid ${accent}`}}><div className="metric-icon"><Users size={22}/></div><div className="metric-body"><strong>{ss.total.toLocaleString()}</strong><span>Students</span></div></div>
        <div className="metric green" style={{borderTop: "3px solid #059669"}}><div className="metric-icon"><GraduationCap size={22}/></div><div className="metric-body"><strong>{data.staff.length}</strong><span>Staff</span></div></div>
        <div className="metric amber" style={{borderTop: "3px solid #f59e0b"}}><div className="metric-icon"><FileText size={22}/></div><div className="metric-body"><strong>{fs.collection_rate}%</strong><span>Fee Collection</span></div></div>
        <div className="metric red" style={{borderTop: "3px solid #ef4444"}}><div className="metric-icon"><Bell size={22}/></div><div className="metric-body"><strong>{data.approvals.filter(a=>a.status==="Pending").length}</strong><span>Approvals</span></div></div>
      </div>
      <div className="notice-strip" style={{borderLeft: `4px solid ${accent}`}}>Select a view — Home, Approvals, Students, Staff, Finance, Communication, Reports, Settings, or Notifications.</div>
    </div>
  );
}
