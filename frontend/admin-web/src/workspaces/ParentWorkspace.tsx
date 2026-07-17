import { useEffect, useState } from "react";
import { Receipt, FileText, Bell, Calendar, Download, User, Loader2 } from "lucide-react";
import type { ConnectedData } from "../api";
import { fetchParentChildren, fetchParentChildData } from "../api";
import type { ChildInfo, ChildData } from "../types";
import { downloadElement } from "../utils/exportUtils";

interface ParentWorkspaceProps {
  view: string;
  data: ConnectedData;
  session: { user: { full_name: string; school: string } } | null;
}

export function ParentWorkspace({ view, data, session }: ParentWorkspaceProps) {
  const [attendanceComment, setAttendanceComment] = useState("");
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [reportComment, setReportComment] = useState("");
  const [reportSaved, setReportSaved] = useState(false);

  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [childData, setChildData] = useState<ChildData | null>(null);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [childDataLoading, setChildDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setChildrenLoading(true);
    fetchParentChildren()
      .then((list) => {
        if (!cancelled) {
          setChildren(list);
          if (list.length > 0) setSelectedChildId(list[0].student_id);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load children");
      })
      .finally(() => {
        if (!cancelled) setChildrenLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (selectedChildId === null) return;
    let cancelled = false;
    setChildDataLoading(true);
    setChildData(null);
    fetchParentChildData(selectedChildId)
      .then((d) => {
        if (!cancelled) setChildData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load child data");
      })
      .finally(() => {
        if (!cancelled) setChildDataLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedChildId]);

  const student = childData?.student;
  const childName = student?.name ?? "Loading...";
  const childClass = student?.class_name ?? "";
  const childStream = student?.stream_name ?? "";
  const childAdm = student?.admission_number ?? "";
  const classDisplay = childStream ? `${childClass} ${childStream}` : childClass;

  const totalFees = childData?.fees?.reduce((sum, f) => sum + (parseFloat(f.amount) || 0) - (parseFloat(f.paid_amount) || 0), 0) ?? 0;
  const feeBalance = `UGX ${totalFees.toLocaleString()}`;

  const todayAttendance = childData?.attendance?.[childData.attendance.length - 1]?.status ?? "—";

  const latestAssessment = childData?.assessments?.[childData.assessments.length - 1];
  const lastGrade = latestAssessment?.grade ?? "—";

  const reportCards = childData?.report_cards ?? [];
  const latestReport = reportCards.length > 0 ? reportCards[reportCards.length - 1] : null;
  const position = latestReport?.remarks ?? "—";
  const averageScore = reportCards.length > 0
    ? (reportCards.reduce((s, r) => s + (r.score || 0), 0) / reportCards.length).toFixed(0) + "%"
    : "—";

  const notifications = childData?.notifications ?? [];
  const unreadCount = notifications.filter((n) => n.status !== "read").length;

  if (childrenLoading) {
    return (
      <div className="content-grid" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 12 }}>
        <Loader2 size={20} className="spin" />
        <span style={{ color: "var(--muted)" }}>Loading your children...</span>
      </div>
    );
  }

  if (error && children.length === 0) {
    return <div className="content-grid"><p className="empty-state">{error}</p></div>;
  }

  if (children.length === 0) {
    return <div className="content-grid"><p className="empty-state">No children linked to your account. Please contact the school office.</p></div>;
  }

  const childSelector = children.length > 1 ? (
    <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
      {children.map((c) => (
        <button
          key={c.student_id}
          className={`tool-button ${selectedChildId === c.student_id ? "primary" : ""}`}
          onClick={() => { setSelectedChildId(c.student_id); setError(null); }}
        >
          {c.student_name}
        </button>
      ))}
    </div>
  ) : null;

  if (view === "Home") {
    return (
      <div className="content-grid">
        {childSelector}
        <div className="student-hero-grad">
          <div className="student-avatar-lg">{childName.charAt(0)}</div>
          <div>
            <strong style={{ fontSize: "1.2rem" }}>{childName}</strong>
            <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: "0.9rem" }}>{classDisplay} · {childAdm}</p>
          </div>
        </div>

        <div className="metric-grid">
          <div className="metric amber">
            <div className="metric-icon"><Receipt size={22} /></div>
            <div className="metric-body"><strong>{feeBalance}</strong><span>Fee Balance</span></div>
          </div>
          <div className="metric green">
            <div className="metric-icon"><Calendar size={22} /></div>
            <div className="metric-body"><strong>{todayAttendance}</strong><span>Today</span></div>
          </div>
          <div className="metric blue">
            <div className="metric-icon"><FileText size={22} /></div>
            <div className="metric-body"><strong>{lastGrade}</strong><span>Last Grade</span></div>
          </div>
          <div className="metric teal">
            <div className="metric-icon"><Bell size={22} /></div>
            <div className="metric-body"><strong>{unreadCount}</strong><span>Unread</span></div>
          </div>
        </div>

        <div className="profile-grid-detail">
          {[
            ["Class", classDisplay],
            ["Admission No", childAdm],
            ["Term Position", position],
            ["Term Average", averageScore],
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
    const fees = childData?.fees ?? [];
    return (
      <div className="content-grid">
        {childSelector}
        <div className="metric-grid">
          <div className="metric amber"><div className="metric-icon"><Receipt size={22} /></div><div className="metric-body"><strong>{feeBalance}</strong><span>Balance Due</span></div></div>
          <div className="metric green"><div className="metric-icon"><Receipt size={22} /></div><div className="metric-body"><strong>{fees.length}</strong><span>Total Fees</span></div></div>
          <div className="metric blue"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{fees.filter(f => f.status === "paid").length}</strong><span>Paid</span></div></div>
          <div className="metric teal"><div className="metric-icon"><Download size={22} /></div><div className="metric-body"><strong>PDF</strong><span>Download</span></div></div>
        </div>

        <div className="table-panel">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Description</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>
                {fees.map((f) => (
                  <tr key={f.id}>
                    <td><strong>{f.description || f.category_name || "Fee"}</strong><br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{f.term} {f.academic_year}</span></td>
                    <td><strong>{f.amount}</strong></td>
                    <td>{f.paid_amount}</td>
                    <td>{f.due_date}</td>
                    <td><span className={`badge ${f.status === "paid" ? "success" : f.status === "partial" ? "warning" : "error"}`}>{f.status}</span></td>
                  </tr>
                ))}
                {fees.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: "24px 0" }}>No fee records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Attendance") {
    const attendance = childData?.attendance ?? [];
    const total = attendance.length;
    const presentCount = attendance.filter((a) => a.status === "Present").length;
    const lateCount = attendance.filter((a) => a.status === "Late").length;
    const absentCount = attendance.filter((a) => a.status === "Absent").length;
    const presentRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
    return (
      <div className="content-grid">
        {childSelector}
        <div className="metric-grid">
          <div className="metric green"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{todayAttendance}</strong><span>Today</span></div></div>
          <div className="metric teal"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{presentRate}%</strong><span>This Term</span></div></div>
          <div className="metric amber"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{lateCount}</strong><span>Late Days</span></div></div>
          <div className="metric red"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{absentCount}</strong><span>Absent Days</span></div></div>
        </div>
        <div className="stack-list list-panel">
          {attendance.map((h) => (
            <div key={h.id} className="list-row">
              <div className="dot" style={{ background: h.status === "Present" ? "#10b981" : h.status === "Late" ? "#f59e0b" : "#ef4444" }} />
              <div>
                <strong style={{ fontSize: "0.9rem" }}>{h.date}</strong>
                <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{h.remarks || "—"}</span>
              </div>
              <span className={`badge ${h.status === "Present" ? "success" : h.status === "Late" ? "warning" : "error"}`}>{h.status}</span>
            </div>
          ))}
          {attendance.length === 0 && <p className="empty-state">No attendance records yet</p>}
        </div>
        <div className="detail-panel" style={{ marginTop: 16 }}>
          <div className="panel-title"><strong>Parent Comment</strong></div>
          <textarea
            className="input-base"
            style={{ width: "100%", minHeight: 80, marginTop: 8, resize: "vertical" }}
            placeholder="Write a comment about your child's attendance..."
            value={attendanceComment}
            onChange={(e) => { setAttendanceComment(e.target.value); setAttendanceSaved(false); }}
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
    const reportCards = childData?.report_cards ?? [];
    return (
      <div className="content-grid">
        {childSelector}
        <div className="student-hero-grad">
          <div className="student-avatar-lg">{childName.charAt(0)}</div>
          <div>
            <strong style={{ fontSize: "1.1rem" }}>{childName}</strong>
            <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: "0.88rem" }}>{classDisplay} · Term 1, 2026</p>
            <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: "0.88rem" }}>Position: {position} · Average: {averageScore}</p>
          </div>
          <button className="tool-button" style={{ marginLeft: "auto", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff" }} onClick={() => downloadElement("export-child-report", childName.replace(/\s+/g, "-") + "-report-card.html")}>
            <Download size={15} />Download
          </button>
        </div>
        <div id="export-child-report" className="table-panel">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Subject</th><th>Score</th><th>Grade</th><th>Term</th></tr></thead>
              <tbody>
                {reportCards.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.subject}</strong></td>
                    <td>{r.score}</td>
                    <td><span className="badge info">{r.grade}</span></td>
                    <td>{r.term} {r.academic_year}</td>
                  </tr>
                ))}
                {reportCards.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: "24px 0" }}>No report card data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="detail-panel" style={{ marginTop: 16 }}>
          <div className="panel-title"><User size={16} /><strong>Parent Comment</strong></div>
          <textarea
            className="input-base"
            style={{ width: "100%", minHeight: 80, marginTop: 8, resize: "vertical" }}
            placeholder="Write a comment about your child's report..."
            value={reportComment}
            onChange={(e) => { setReportComment(e.target.value); setReportSaved(false); }}
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
        {childSelector}
        <div className="stack-list list-panel">
          {notifications.map((n) => (
            <div key={n.id} className="list-row">
              <div className="dot" style={{ background: n.status === "read" ? "var(--muted)" : "#4fc3f7" }} />
              <div>
                <strong style={{ fontSize: "0.9rem" }}>{n.title}</strong>
                <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{n.type} · {n.created_at}</span>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#e2e8f0" }}>{n.message}</p>
              </div>
              <span className={`badge ${n.status === "read" ? "muted" : "info"}`}>{n.status === "read" ? "Read" : "New"}</span>
            </div>
          ))}
          {notifications.length === 0 && <p className="empty-state">No notifications yet</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="content-grid">
      {childSelector}
      <div className="student-hero-grad">
        <div className="student-avatar-lg">{childName.charAt(0)}</div>
        <div>
          <strong style={{ fontSize: "1.2rem" }}>{childName}</strong>
          <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: "0.9rem" }}>{classDisplay} · {childAdm}</p>
        </div>
      </div>
      <div className="metric-grid">
        <div className="metric amber"><div className="metric-icon"><Receipt size={22} /></div><div className="metric-body"><strong>{feeBalance}</strong><span>Fee Balance</span></div></div>
        <div className="metric green"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{todayAttendance}</strong><span>Today</span></div></div>
        <div className="metric blue"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{lastGrade}</strong><span>Last Grade</span></div></div>
        <div className="metric teal"><div className="metric-icon"><Bell size={22} /></div><div className="metric-body"><strong>{unreadCount}</strong><span>Unread</span></div></div>
      </div>
      <div className="notice-strip">Select a view — Home, Fees, Attendance, Report Card, or Messages.</div>
    </div>
  );
}
