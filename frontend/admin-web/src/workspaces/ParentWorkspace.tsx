import { useState } from "react";
import { Receipt, FileText, Bell, Calendar, Download, User } from "lucide-react";
import type { ConnectedData } from "../api";

interface ParentWorkspaceProps {
  view: string;
  data: ConnectedData;
}

export function ParentWorkspace({ view, data }: ParentWorkspaceProps) {
  const [attendanceComment, setAttendanceComment] = useState("");
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [reportComment, setReportComment] = useState("");
  const [reportSaved, setReportSaved] = useState(false);

  const child = {
    name: "Ariho Grace",
    class: "P5 Blue",
    admNo: "NDS-2024-0042",
    feeBalance: "UGX 320,000",
    attendance: "Present",
    lastGrade: "B+",
    position: "12 / 42",
    average: "71%",
  };

  const subjectTeachers = [
    { subject: "Mathematics", teacher: "Mr. Okello", phone: "+256 700 000001" },
    { subject: "English", teacher: "Ms. Nambi", phone: "+256 700 000002" },
    { subject: "Science", teacher: "Mr. Ssempija", phone: "+256 700 000003" },
    { subject: "Social Studies", teacher: "Mrs. Nakato", phone: "+256 700 000004" },
  ];

  if (view === "Home") {
    return (
      <div className="content-grid">
        <div className="student-hero-grad">
          <div className="student-avatar-lg">{child.name.charAt(0)}</div>
          <div>
            <strong style={{ fontSize: "1.2rem" }}>{child.name}</strong>
            <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: "0.9rem" }}>{child.class} · {child.admNo}</p>
          </div>
        </div>

        <div className="metric-grid">
          <div className="metric amber">
            <div className="metric-icon"><Receipt size={22} /></div>
            <div className="metric-body"><strong>{child.feeBalance}</strong><span>Fee Balance</span></div>
          </div>
          <div className="metric green">
            <div className="metric-icon"><Calendar size={22} /></div>
            <div className="metric-body"><strong>{child.attendance}</strong><span>Today</span></div>
          </div>
          <div className="metric blue">
            <div className="metric-icon"><FileText size={22} /></div>
            <div className="metric-body"><strong>{child.lastGrade}</strong><span>Last Grade</span></div>
          </div>
          <div className="metric teal">
            <div className="metric-icon"><Bell size={22} /></div>
            <div className="metric-body"><strong>{data.parentMessages.filter(m => !m.read).length}</strong><span>Unread</span></div>
          </div>
        </div>

        <div className="profile-grid-detail">
          {[
            ["Class", child.class],
            ["Admission No", child.admNo],
            ["Term Position", child.position],
            ["Term Average", child.average],
          ].map(([label, val]) => (
            <div key={label} className="detail-cell">
              <span>{label}</span>
              <strong>{val}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === "Fees") {
    return (
      <div className="content-grid">
        <div className="metric-grid">
          <div className="metric amber"><div className="metric-icon"><Receipt size={22} /></div><div className="metric-body"><strong>{child.feeBalance}</strong><span>Balance Due</span></div></div>
          <div className="metric green"><div className="metric-icon"><Receipt size={22} /></div><div className="metric-body"><strong>{data.receipts.length}</strong><span>Receipts</span></div></div>
          <div className="metric blue"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{data.payments.length}</strong><span>Payments</span></div></div>
          <div className="metric teal"><div className="metric-icon"><Download size={22} /></div><div className="metric-body"><strong>PDF</strong><span>Download</span></div></div>
        </div>

        <div className="table-panel">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Reference</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {data.payments.map(p => (
                  <tr key={p.reference}>
                    <td><code>{p.reference}</code></td>
                    <td><strong>{p.amount}</strong></td>
                    <td>{p.method}</td>
                    <td>{p.date}</td>
                    <td><span className={`badge ${p.status === "Confirmed" ? "success" : "warning"}`}>{p.status}</span></td>
                  </tr>
                ))}
                {data.payments.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: "24px 0" }}>No payment records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Attendance") {
    const history = [
      { date: "Today", status: "Present", time: "8:03 AM" },
      { date: "Yesterday", status: "Present", time: "7:58 AM" },
      { date: "Mon", status: "Late", time: "8:47 AM" },
      { date: "Fri", status: "Present", time: "7:55 AM" },
      { date: "Thu", status: "Absent", time: "—" },
    ];
    return (
      <div className="content-grid">
        <div className="metric-grid">
          <div className="metric green"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>Present</strong><span>Today</span></div></div>
          <div className="metric teal"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>92%</strong><span>This Term</span></div></div>
          <div className="metric amber"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>2</strong><span>Late Days</span></div></div>
          <div className="metric red"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>1</strong><span>Absent Days</span></div></div>
        </div>
        <div className="stack-list list-panel">
          {history.map((h, i) => (
            <div key={i} className="list-row">
              <div className="dot" style={{ background: h.status === "Present" ? "#10b981" : h.status === "Late" ? "#f59e0b" : "#ef4444" }} />
              <div>
                <strong style={{ fontSize: "0.9rem" }}>{h.date}</strong>
                <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{h.time}</span>
              </div>
              <span className={`badge ${h.status === "Present" ? "success" : h.status === "Late" ? "warning" : "error"}`}>{h.status}</span>
            </div>
          ))}
        </div>
        <div className="detail-panel" style={{ marginTop: 16 }}>
          <div className="panel-title"><strong>Parent Comment</strong></div>
          <textarea
            className="input-base"
            style={{ width: "100%", minHeight: 80, marginTop: 8, resize: "vertical" }}
            placeholder="Write a comment about your child's attendance..."
            value={attendanceComment}
            onChange={e => { setAttendanceComment(e.target.value); setAttendanceSaved(false); }}
          />
          <button
            className="tool-button primary"
            style={{ marginTop: 8 }}
            onClick={() => { setAttendanceSaved(true); }}
          >
            Save Comment
          </button>
          {attendanceSaved && <p style={{ color: "#10b981", fontSize: "0.85rem", marginTop: 6 }}>Comment saved</p>}
        </div>
      </div>
    );
  }

  if (view === "Report Card") {
    const subjects = [
      { name: "Mathematics", bot: 72, mot: 68, eot: 75, grade: "C4" },
      { name: "English", bot: 80, mot: 78, eot: 82, grade: "D2" },
      { name: "Science", bot: 65, mot: 70, eot: 68, grade: "C5" },
      { name: "Social Studies", bot: 74, mot: 76, eot: 79, grade: "C4" },
      { name: "Religious Education", bot: 85, mot: 88, eot: 90, grade: "D1" },
    ];
    return (
      <div className="content-grid">
        <div className="student-hero-grad">
          <div className="student-avatar-lg">{child.name.charAt(0)}</div>
          <div>
            <strong style={{ fontSize: "1.1rem" }}>{child.name}</strong>
            <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: "0.88rem" }}>{child.class} · Term 1, 2026</p>
            <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: "0.88rem" }}>Position: {child.position} · Average: {child.average}</p>
          </div>
          <button className="tool-button" style={{ marginLeft: "auto", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff" }} onClick={() => window.print()}>
            <Download size={15} />Download
          </button>
        </div>
        <div className="table-panel">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Subject</th><th>BOT</th><th>MOT</th><th>EOT</th><th>Average</th><th>Grade</th></tr></thead>
              <tbody>
                {subjects.map(s => {
                  const average = ((s.bot + s.mot + s.eot) / 3).toFixed(1);
                  return (
                    <tr key={s.name}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.bot}</td><td>{s.mot}</td><td>{s.eot}</td>
                      <td><strong>{average}</strong></td>
                      <td><span className="badge info">{s.grade}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="detail-panel" style={{ marginTop: 16 }}>
          <div className="panel-title"><User size={16} /><strong>Subject Teachers</strong></div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {subjectTeachers.map(st => (
              <div key={st.subject} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: 6 }}>
                <div>
                  <strong style={{ fontSize: "0.85rem" }}>{st.subject}</strong>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)" }}>{st.teacher}</p>
                </div>
                <a href={`tel:${st.phone}`} style={{ color: "#4fc3f7", fontSize: "0.85rem", textDecoration: "none" }}>{st.phone}</a>
              </div>
            ))}
          </div>
        </div>
        <div className="detail-panel" style={{ marginTop: 16 }}>
          <div className="panel-title"><strong>Parent Comment</strong></div>
          <textarea
            className="input-base"
            style={{ width: "100%", minHeight: 80, marginTop: 8, resize: "vertical" }}
            placeholder="Write a comment about your child's report..."
            value={reportComment}
            onChange={e => { setReportComment(e.target.value); setReportSaved(false); }}
          />
          <button
            className="tool-button primary"
            style={{ marginTop: 8 }}
            onClick={() => { setReportSaved(true); }}
          >
            Save Comment
          </button>
          {reportSaved && <p style={{ color: "#10b981", fontSize: "0.85rem", marginTop: 6 }}>Comment saved</p>}
        </div>
      </div>
    );
  }

  if (view === "Messages") {
    return (
      <div className="content-grid">
        <div className="stack-list list-panel">
          {data.parentMessages.map(msg => (
            <div key={msg.id} className="list-row">
              <div className="dot" style={{ background: msg.read ? "var(--muted)" : "#4fc3f7" }} />
              <div>
                <strong style={{ fontSize: "0.9rem" }}>{msg.subject}</strong>
                <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{msg.from} · {msg.date}</span>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#e2e8f0" }}>{msg.body}</p>
              </div>
              <span className={`badge ${msg.read ? "muted" : "info"}`}>{msg.read ? "Read" : "New"}</span>
            </div>
          ))}
          {data.parentMessages.length === 0 && <p className="empty-state">No messages from school</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="content-grid">
      <div className="student-hero-grad">
        <div className="student-avatar-lg">{child.name.charAt(0)}</div>
        <div>
          <strong style={{ fontSize: "1.2rem" }}>{child.name}</strong>
          <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: "0.9rem" }}>{child.class} · {child.admNo}</p>
        </div>
      </div>
      <div className="metric-grid">
        <div className="metric amber"><div className="metric-icon"><Receipt size={22} /></div><div className="metric-body"><strong>{child.feeBalance}</strong><span>Fee Balance</span></div></div>
        <div className="metric green"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{child.attendance}</strong><span>Today</span></div></div>
        <div className="metric blue"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{child.lastGrade}</strong><span>Last Grade</span></div></div>
        <div className="metric teal"><div className="metric-icon"><Bell size={22} /></div><div className="metric-body"><strong>{data.parentMessages.filter(m => !m.read).length}</strong><span>Unread</span></div></div>
      </div>
      <div className="notice-strip">Select a view — Home, Fees, Attendance, Report Card, or Messages.</div>
    </div>
  );
}
