import { useState, useEffect, useCallback } from "react";
import {
  Users, UserCheck, UserX, BarChart3, Calendar, ClipboardCheck,
  FileText, MessageSquare, Search, CheckCircle, XCircle, Clock,
  TrendingUp, Award, RefreshCw, Plus, Save, AlertTriangle, School,
  ChevronRight, Eye
} from "lucide-react";
import type { ConnectedData } from "../api";
import { apiRequest } from "../api";

interface HeadteacherWorkspaceProps {
  view: string;
  data: ConnectedData;
  onViewChange: (view: string) => void;
  onSendSms: (groupId: string, message: string, comment: string) => void;
}

interface StaffMember {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role_id: number;
  role_name: string;
  is_active: boolean;
}

interface AttendanceSummary {
  date: string;
  total_students: number;
  present: number;
  absent: number;
  late: number;
  attendance_rate: number;
}

interface ClassPerformance {
  class_name: string;
  student_count: number;
  average_score: number | null;
}

interface LeaveRequest {
  id: number;
  staff_name: string;
  staff_role: string;
  reason: string;
  start_date: string;
  end_date: string;
  status: string;
}

export function HeadteacherWorkspace({ view, data, onViewChange, onSendSms }: HeadteacherWorkspaceProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [attSummary, setAttSummary] = useState<AttendanceSummary | null>(null);
  const [performance, setPerformance] = useState<ClassPerformance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveFilter, setLeaveFilter] = useState("");
  const [leaveNotice, setLeaveNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [msgSent, setMsgSent] = useState("");
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchStaff = useCallback(async () => {
    try {
      const params = staffSearch ? `?search=${encodeURIComponent(staffSearch)}` : "";
      const result = await apiRequest<StaffMember[]>(`/api/v1/headteacher/staff${params}`);
      setStaff(result);
    } catch { setStaff([]); }
  }, [staffSearch]);

  const fetchAttSummary = useCallback(async () => {
    try {
      const params = attDate ? `?for_date=${attDate}` : "";
      const result = await apiRequest<AttendanceSummary>(`/api/v1/headteacher/attendance/summary${params}`);
      setAttSummary(result);
    } catch { setAttSummary(null); }
  }, [attDate]);

  const fetchPerformance = useCallback(async () => {
    try {
      const result = await apiRequest<ClassPerformance[]>("/api/v1/headteacher/performance");
      setPerformance(result);
    } catch { setPerformance([]); }
  }, []);

  const fetchLeaveRequests = useCallback(async () => {
    try {
      const params = leaveFilter ? `?status=${leaveFilter}` : "";
      const result = await apiRequest<LeaveRequest[]>(`/api/v1/headteacher/leave/requests${params}`);
      setLeaveRequests(result);
    } catch { setLeaveRequests([]); }
  }, [leaveFilter]);

  useEffect(() => {
    if (view === "Staff") fetchStaff();
    if (view === "Attendance") fetchAttSummary();
    if (view === "Performance") fetchPerformance();
    if (view === "Leave Requests") fetchLeaveRequests();
  }, [view, fetchStaff, fetchAttSummary, fetchPerformance, fetchLeaveRequests]);

  const handleToggleActive = async (userId: number) => {
    try {
      await apiRequest(`/api/v1/headteacher/staff/${userId}/toggle-active`, { method: "PATCH" });
      fetchStaff();
    } catch { /* ignore */ }
  };

  const handleLeaveDecision = async (leaveId: number, decision: "approved" | "rejected") => {
    try {
      await apiRequest(`/api/v1/headteacher/leave/${leaveId}/decide`, {
        method: "PATCH",
        body: JSON.stringify({ decision })
      });
      setLeaveNotice(`Leave request ${decision}`);
      setTimeout(() => setLeaveNotice(""), 2500);
      fetchLeaveRequests();
    } catch { /* ignore */ }
  };

  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => s.is_active).length;
  const inactiveStaff = totalStaff - activeStaff;
  const totalStudents = data.students.length;
  const pendingLeaves = leaveRequests.filter(l => l.status === "pending").length;

  const statusColor = (status: string) => {
    if (status === "approved") return "success";
    if (status === "rejected") return "error";
    return "warning";
  };

  const gradeLabel = (avg: number | null) => {
    if (avg === null) return "N/A";
    if (avg >= 80) return "D1";
    if (avg >= 70) return "D2";
    if (avg >= 65) return "C3";
    if (avg >= 60) return "C4";
    if (avg >= 55) return "C5";
    if (avg >= 50) return "C6";
    if (avg >= 45) return "P7";
    if (avg >= 40) return "P8";
    return "F9";
  };

  if (view === "Dashboard") {
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Academic Leadership</h2>
          <p>Monitor staff performance, attendance, and leave requests.</p>
        </div>
        <div className="notice-strip" style={{ fontWeight: 600, fontSize: "1.1rem" }}>
          <School size={18} /> {data.school.name} — Headteacher Dashboard
        </div>
        <div className="metric-grid">
          <div className="metric teal">
            <div className="metric-icon"><Users size={22} /></div>
            <div className="metric-body"><strong>{totalStaff}</strong><span>Total Staff</span></div>
          </div>
          <div className="metric green">
            <div className="metric-icon"><UserCheck size={22} /></div>
            <div className="metric-body"><strong>{activeStaff}</strong><span>Active Staff</span></div>
          </div>
          <div className="metric blue">
            <div className="metric-icon"><BarChart3 size={22} /></div>
            <div className="metric-body"><strong>{totalStudents}</strong><span>Students</span></div>
          </div>
          <div className="metric amber">
            <div className="metric-icon"><FileText size={22} /></div>
            <div className="metric-body"><strong>{pendingLeaves}</strong><span>Pending Leaves</span></div>
          </div>
        </div>
        <div className="office-layout">
          <div className="list-panel glass-card">
            <div className="panel-title">
              <div className="panel-title-left"><p className="eyebrow">Overview</p><strong>Quick Navigation</strong></div>
              <ChevronRight size={18} />
            </div>
            <div style={{ display: "grid", gap: 8, padding: "8px 0" }}>
              <button className="tool-button" onClick={() => onViewChange("Staff")}><Users size={15} />Manage Staff ({totalStaff})</button>
              <button className="tool-button" onClick={() => onViewChange("Attendance")}><ClipboardCheck size={15} />Attendance Summary</button>
              <button className="tool-button" onClick={() => onViewChange("Performance")}><Award size={15} />Class Performance</button>
              <button className="tool-button" onClick={() => onViewChange("Leave Requests")}><FileText size={15} />Leave Requests ({pendingLeaves} pending)</button>
              <button className="tool-button" onClick={() => onViewChange("Messages")}><MessageSquare size={15} />Messages</button>
            </div>
          </div>
          <div className="list-panel glass-card">
            <div className="panel-title"><strong>Staff by Role</strong></div>
            <div className="stack-list">
              {Object.entries(staff.reduce((acc, s) => { acc[s.role_name] = (acc[s.role_name] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([role, count]) => (
                <div key={role} className="list-row">
                  <div className="dot" />
                  <div><strong style={{ fontSize: "0.88rem" }}>{role}</strong></div>
                  <span className="badge info">{count}</span>
                </div>
              ))}
              {staff.length === 0 && <p className="empty-state">No staff data</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Staff") {
    const filteredStaff = staff.filter(s =>
      !staffSearch || s.name.toLowerCase().includes(staffSearch.toLowerCase()) || s.email.toLowerCase().includes(staffSearch.toLowerCase())
    );
    return (
      <div className="content-grid">
        <div className="metric-grid">
          <div className="metric teal">
            <div className="metric-icon"><Users size={22} /></div>
            <div className="metric-body"><strong>{totalStaff}</strong><span>Total Staff</span></div>
          </div>
          <div className="metric green">
            <div className="metric-icon"><UserCheck size={22} /></div>
            <div className="metric-body"><strong>{activeStaff}</strong><span>Active</span></div>
          </div>
          <div className="metric red">
            <div className="metric-icon"><UserX size={22} /></div>
            <div className="metric-body"><strong>{inactiveStaff}</strong><span>Inactive</span></div>
          </div>
          <div className="metric amber">
            <div className="metric-icon"><AlertTriangle size={22} /></div>
            <div className="metric-body"><strong>{totalStudents}</strong><span>Students</span></div>
          </div>
        </div>
        <div className="table-panel glass-card">
          <div className="office-filters">
            <label><Search size={15} /><input placeholder="Search staff by name or email…" value={staffSearch} onChange={e => setStaffSearch(e.target.value)} /></label>
            <button className="tool-button" onClick={fetchStaff}><RefreshCw size={15} />Refresh</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {filteredStaff.map(s => (
                  <tr key={s.id}>
                    <td><strong style={{ fontSize: "0.88rem" }}>{s.name}</strong></td>
                    <td><code style={{ fontSize: "0.78rem" }}>{s.email}</code></td>
                    <td>{s.phone || "—"}</td>
                    <td><span className="badge info">{s.role_name}</span></td>
                    <td>
                      <span className={`badge ${s.is_active ? "success" : "error"}`}>
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`tool-button ${s.is_active ? "" : "primary"}`}
                        style={{ minHeight: 28 }}
                        onClick={() => handleToggleActive(s.id)}
                      >
                        {s.is_active ? <><UserX size={13} />Deactivate</> : <><UserCheck size={13} />Activate</>}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStaff.length === 0 && (
                  <tr><td colSpan={6} className="empty-state">No staff found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Attendance") {
    return (
      <div className="content-grid">
        <div className="notice-strip" style={{ fontWeight: 600, fontSize: "1rem" }}>
          <ClipboardCheck size={18} /> School-Wide Attendance Summary
        </div>
        <div className="office-filters" style={{ padding: "0 0 8px" }}>
          <label style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Date:
            <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)}
              style={{ marginLeft: 8, padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#f1f5f9" }} />
          </label>
          <button className="tool-button" onClick={fetchAttSummary}><RefreshCw size={15} />Refresh</button>
        </div>
        {attSummary ? (
          <div className="metric-grid">
            <div className="metric blue">
              <div className="metric-icon"><Users size={22} /></div>
              <div className="metric-body"><strong>{attSummary.total_students}</strong><span>Total Students</span></div>
            </div>
            <div className="metric green">
              <div className="metric-icon"><CheckCircle size={22} /></div>
              <div className="metric-body"><strong>{attSummary.present}</strong><span>Present</span></div>
            </div>
            <div className="metric red">
              <div className="metric-icon"><XCircle size={22} /></div>
              <div className="metric-body"><strong>{attSummary.absent}</strong><span>Absent</span></div>
            </div>
            <div className="metric amber">
              <div className="metric-icon"><Clock size={22} /></div>
              <div className="metric-body"><strong>{attSummary.late}</strong><span>Late</span></div>
            </div>
          </div>
        ) : (
          <div className="metric-grid">
            <div className="metric blue"><div className="metric-icon"><Users size={22} /></div><div className="metric-body"><strong>—</strong><span>Total Students</span></div></div>
            <div className="metric green"><div className="metric-icon"><CheckCircle size={22} /></div><div className="metric-body"><strong>—</strong><span>Present</span></div></div>
            <div className="metric red"><div className="metric-icon"><XCircle size={22} /></div><div className="metric-body"><strong>—</strong><span>Absent</span></div></div>
            <div className="metric amber"><div className="metric-icon"><Clock size={22} /></div><div className="metric-body"><strong>—</strong><span>Late</span></div></div>
          </div>
        )}
        <div className="detail-panel glass-card" style={{ padding: 20 }}>
          <div className="panel-title">
            <div className="panel-title-left"><p className="eyebrow">Attendance</p><strong>Rate Overview</strong></div>
            <TrendingUp size={18} />
          </div>
          {attSummary ? (
            <div style={{ display: "grid", gap: 14, padding: "8px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.9rem" }}>Attendance Rate</span>
                <strong style={{ fontSize: "1.3rem", color: attSummary.attendance_rate >= 80 ? "#10b981" : attSummary.attendance_rate >= 60 ? "#f59e0b" : "#ef4444" }}>
                  {attSummary.attendance_rate}%
                </strong>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${attSummary.attendance_rate}%`, borderRadius: 4, background: attSummary.attendance_rate >= 80 ? "#10b981" : attSummary.attendance_rate >= 60 ? "#f59e0b" : "#ef4444", transition: "width 0.5s" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#10b981" }}>{attSummary.present}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Present</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ef4444" }}>{attSummary.absent}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Absent</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f59e0b" }}>{attSummary.late}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Late</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="empty-state" style={{ padding: 20 }}>No attendance data for this date. Select a date above.</p>
          )}
        </div>
      </div>
    );
  }

  if (view === "Performance") {
    return (
      <div className="content-grid">
        <div className="notice-strip" style={{ fontWeight: 600, fontSize: "1rem" }}>
          <BarChart3 size={18} /> Class Performance Averages
        </div>
        <div className="metric-grid">
          <div className="metric teal">
            <div className="metric-icon"><BarChart3 size={22} /></div>
            <div className="metric-body"><strong>{performance.length}</strong><span>Classes</span></div>
          </div>
          <div className="metric green">
            <div className="metric-icon"><Users size={22} /></div>
            <div className="metric-body"><strong>{performance.reduce((s, p) => s + p.student_count, 0)}</strong><span>Total Students</span></div>
          </div>
          <div className="metric blue">
            <div className="metric-icon"><Award size={22} /></div>
            <div className="metric-body">
              <strong>{performance.length > 0 ? (performance.reduce((s, p) => s + (p.average_score ?? 0), 0) / performance.length).toFixed(1) : "N/A"}</strong>
              <span>School Average</span>
            </div>
          </div>
          <div className="metric amber">
            <div className="metric-icon"><TrendingUp size={22} /></div>
            <div className="metric-body">
              <strong>{performance.filter(p => p.average_score !== null && p.average_score >= 60).length}</strong>
              <span>Passing Classes</span>
            </div>
          </div>
        </div>
        <div className="table-panel glass-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Class</th><th>Students</th><th>Average Score</th><th>Grade</th><th>Status</th></tr>
              </thead>
              <tbody>
                {performance.map((p, i) => (
                  <tr key={i}>
                    <td><strong style={{ fontSize: "0.9rem" }}>{p.class_name}</strong></td>
                    <td>{p.student_count}</td>
                    <td><strong>{p.average_score !== null ? p.average_score.toFixed(1) : "N/A"}</strong></td>
                    <td><span className="badge info">{gradeLabel(p.average_score)}</span></td>
                    <td>
                      <span className={`badge ${p.average_score !== null && p.average_score >= 60 ? "success" : p.average_score !== null && p.average_score >= 40 ? "warning" : "error"}`}>
                        {p.average_score !== null && p.average_score >= 60 ? "Passing" : p.average_score !== null && p.average_score >= 40 ? "At Risk" : "Failing"}
                      </span>
                    </td>
                  </tr>
                ))}
                {performance.length === 0 && (
                  <tr><td colSpan={5} className="empty-state">No performance data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Leave Requests") {
    return (
      <div className="content-grid">
        <div className="metric-grid">
          <div className="metric amber">
            <div className="metric-icon"><Clock size={22} /></div>
            <div className="metric-body"><strong>{leaveRequests.filter(l => l.status === "pending").length}</strong><span>Pending</span></div>
          </div>
          <div className="metric green">
            <div className="metric-icon"><CheckCircle size={22} /></div>
            <div className="metric-body"><strong>{leaveRequests.filter(l => l.status === "approved").length}</strong><span>Approved</span></div>
          </div>
          <div className="metric red">
            <div className="metric-icon"><XCircle size={22} /></div>
            <div className="metric-body"><strong>{leaveRequests.filter(l => l.status === "rejected").length}</strong><span>Rejected</span></div>
          </div>
          <div className="metric blue">
            <div className="metric-icon"><FileText size={22} /></div>
            <div className="metric-body"><strong>{leaveRequests.length}</strong><span>Total</span></div>
          </div>
        </div>
        {leaveNotice && <div className="notice-strip success">{leaveNotice}</div>}
        <div className="table-panel glass-card">
          <div className="office-filters">
            <select value={leaveFilter} onChange={e => setLeaveFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className="tool-button" onClick={fetchLeaveRequests}><RefreshCw size={15} />Refresh</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Staff</th><th>Role</th><th>Reason</th><th>From</th><th>To</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {leaveRequests.map(l => (
                  <tr key={l.id}>
                    <td><strong style={{ fontSize: "0.88rem" }}>{l.staff_name}</strong></td>
                    <td><span className="badge info">{l.staff_role}</span></td>
                    <td>{l.reason}</td>
                    <td>{l.start_date}</td>
                    <td>{l.end_date}</td>
                    <td><span className={`badge ${statusColor(l.status)}`}>{l.status}</span></td>
                    <td>
                      {l.status === "pending" ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="tool-button primary" style={{ minHeight: 26, fontSize: "0.78rem" }} onClick={() => handleLeaveDecision(l.id, "approved")}>
                            <CheckCircle size={12} />Approve
                          </button>
                          <button className="tool-button" style={{ minHeight: 26, fontSize: "0.78rem" }} onClick={() => handleLeaveDecision(l.id, "rejected")}>
                            <XCircle size={12} />Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {leaveRequests.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">No leave requests found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Messages") {
    return (
      <div className="office-layout">
        <div className="detail-panel glass-card">
          <div className="panel-title">
            <div className="panel-title-left"><p className="eyebrow">Communication</p><strong>Message Staff</strong></div>
            <MessageSquare size={18} />
          </div>
          <div className="office-form">
            <label>Group
              <select onChange={e => setMsgText("")}>
                <option value="">All Staff</option>
                <option value="teachers">Teachers</option>
                <option value="support">Support Staff</option>
              </select>
            </label>
            <label>Message
              <textarea value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Type message to staff…" />
            </label>
            {msgSent && <p className="notice-strip success">{msgSent}</p>}
            <button className="tool-button primary" onClick={() => {
              if (!msgText.trim()) return;
              onSendSms("all-staff", msgText, "Headteacher message");
              setMsgSent("Message queued for staff");
              setMsgText("");
              setTimeout(() => setMsgSent(""), 3000);
            }}><MessageSquare size={15} />Send to Staff</button>
          </div>
        </div>
        <div className="list-panel glass-card">
          <div className="panel-title"><strong style={{ fontSize: "0.9rem" }}>Recent Messages</strong></div>
          <div className="stack-list">
            {data.parentMessages.slice(0, 8).map(msg => (
              <div key={msg.id} className="list-row">
                <div className="dot" />
                <div>
                  <strong style={{ fontSize: "0.88rem" }}>{msg.subject}</strong>
                  <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{msg.from} · {msg.date}</span>
                </div>
                <span className={`badge ${msg.read ? "muted" : "info"}`}>{msg.read ? "Read" : "New"}</span>
              </div>
            ))}
            {data.parentMessages.length === 0 && <p className="empty-state">No messages yet</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-grid">
      <div className="notice-strip" style={{ fontWeight: 600, fontSize: "1.1rem" }}>
        <School size={18} /> {data.school.name} — Headteacher Workspace
      </div>
      <div className="metric-grid">
        <div className="metric teal"><div className="metric-icon"><Users size={22} /></div><div className="metric-body"><strong>{totalStaff}</strong><span>Staff</span></div></div>
        <div className="metric green"><div className="metric-icon"><BarChart3 size={22} /></div><div className="metric-body"><strong>{totalStudents}</strong><span>Students</span></div></div>
        <div className="metric blue"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{pendingLeaves}</strong><span>Pending Leaves</span></div></div>
        <div className="metric amber"><div className="metric-icon"><MessageSquare size={22} /></div><div className="metric-body"><strong>{data.notifications.length}</strong><span>Notifications</span></div></div>
      </div>
      <div className="notice-strip">Select a view — Dashboard, Staff, Attendance, Performance, Leave Requests, or Messages.</div>
    </div>
  );
}
