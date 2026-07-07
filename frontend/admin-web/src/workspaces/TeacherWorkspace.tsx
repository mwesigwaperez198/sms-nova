import { useState } from "react";
import { Users, BookOpen, MessageSquare, Save, CheckCircle } from "lucide-react";
import type { ConnectedData } from "../api";

interface TeacherWorkspaceProps {
  view: string;
  data: ConnectedData;
  onSendSms: (groupId: string, message: string, comment: string) => void;
}

type AttStatus = "present" | "absent" | "late" | "excused" | "";

export function TeacherWorkspace({ view, data, onSendSms }: TeacherWorkspaceProps) {
  const [selectedClass, setSelectedClass] = useState(data.teacherClasses[0]?.id ?? "");
  const [attendance, setAttendance] = useState<Record<string, AttStatus>>({});
  const [attSaved, setAttSaved] = useState(false);
  const [assessments, setAssessments] = useState<Record<string, { bot: string; mot: string; eot: string; remarks: string }>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});
  const [msgText, setMsgText] = useState("");
  const [msgSent, setMsgSent] = useState("");

  const classData = data.teacherClasses.find(c => c.id === selectedClass);
  const assessmentRecords = data.assessmentData[selectedClass] ?? [];
  const attendanceRecords = data.attendanceData[selectedClass] ?? [];

  const setAtt = (studentId: string, status: AttStatus) =>
    setAttendance(p => ({ ...p, [studentId]: p[studentId] === status ? "" : status }));

  const handleSaveAttendance = () => {
    setAttSaved(true);
    setTimeout(() => setAttSaved(false), 2500);
  };

  const handleSaveMark = (studentId: string) => {
    setSaveStatus(p => ({ ...p, [studentId]: "saving" }));
    setTimeout(() => setSaveStatus(p => ({ ...p, [studentId]: "saved" })), 800);
  };

  const handleSendMsg = () => {
    if (!msgText.trim()) return;
    onSendSms("all-parents", msgText, "Teacher message");
    setMsgSent("✓ Message queued for parents");
    setMsgText("");
    setTimeout(() => setMsgSent(""), 3000);
  };

  const avg = (r: typeof assessmentRecords[0]) => {
    const a = assessments[r.studentId];
    const bot = parseFloat(a?.bot ?? String(r.bot ?? ""));
    const mot = parseFloat(a?.mot ?? String(r.mot ?? ""));
    const eot = parseFloat(a?.eot ?? String(r.eot ?? ""));
    const vals = [bot, mot, eot].filter(v => !isNaN(v));
    return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : "—";
  };

  const grade = (average: string) => {
    const n = parseFloat(average);
    if (isNaN(n)) return "—";
    if (n >= 80) return "D1"; if (n >= 70) return "D2"; if (n >= 65) return "C3";
    if (n >= 60) return "C4"; if (n >= 55) return "C5"; if (n >= 50) return "C6";
    if (n >= 45) return "P7"; if (n >= 40) return "P8"; return "F9";
  };

  if (view === "Attendance") {
    return (
      <div className="content-grid">
        <div className="table-panel">
          <div className="office-filters">
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              {data.teacherClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.stream} — {c.subject}</option>
              ))}
            </select>
            <button className="tool-button primary" onClick={handleSaveAttendance}>
              <Save size={15} />Save Attendance
            </button>
            {attSaved && <span className="badge success"><CheckCircle size={13} />Saved</span>}
          </div>

          <div className="attendance-grid">
            {attendanceRecords.length > 0 ? attendanceRecords.map(r => (
              <div key={r.studentId} className="attendance-row">
                <div>
                  <strong style={{ fontSize: "0.9rem" }}>{r.studentName}</strong>
                  <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{r.admissionNo}</span>
                </div>
                <div className="status-controls">
                  {(["present","absent","late","excused"] as AttStatus[]).map(s => (
                    <button
                      key={s}
                      className={`seg-button ${s} ${attendance[r.studentId] === s ? "active" : ""}`}
                      onClick={() => setAtt(r.studentId, s)}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )) : (
              /* fallback: show class cards when no per-student data */
              data.teacherClasses.map(cls => (
                <div key={cls.id} className="attendance-row">
                  <div>
                    <strong style={{ fontSize: "0.9rem" }}>{cls.name} {cls.stream}</strong>
                    <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{cls.subject} · {cls.totalStudents} students</span>
                  </div>
                  <div className="status-controls">
                    {(["present","absent","late","excused"] as AttStatus[]).map(s => (
                      <button
                        key={s}
                        className={`seg-button ${s} ${attendance[cls.id] === s ? "active" : ""}`}
                        onClick={() => setAtt(cls.id, s)}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === "Assessments" || view === "Report Remarks") {
    return (
      <div className="content-grid">
        <div className="table-panel">
          <div className="office-filters">
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              {data.teacherClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.stream} — {c.subject}</option>
              ))}
            </select>
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              {classData?.name} {classData?.stream} · {classData?.subject}
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Adm No</th><th>Student</th>
                  <th>BOT /100</th><th>MOT /100</th><th>EOT /100</th>
                  <th>Avg</th><th>Grade</th><th>Remarks</th><th></th>
                </tr>
              </thead>
              <tbody>
                {assessmentRecords.map(r => {
                  const a = assessments[r.studentId] ?? {};
                  const average = avg(r);
                  return (
                    <tr key={r.studentId}>
                      <td><code style={{ fontSize: "0.78rem" }}>{r.admissionNo}</code></td>
                      <td><strong style={{ fontSize: "0.88rem" }}>{r.studentName}</strong></td>
                      <td>
                        <input className="mark-input" type="number" min="0" max="100"
                          value={a.bot ?? r.bot ?? ""}
                          onChange={e => setAssessments(p => ({ ...p, [r.studentId]: { ...p[r.studentId], bot: e.target.value } }))} />
                      </td>
                      <td>
                        <input className="mark-input" type="number" min="0" max="100"
                          value={a.mot ?? r.mot ?? ""}
                          onChange={e => setAssessments(p => ({ ...p, [r.studentId]: { ...p[r.studentId], mot: e.target.value } }))} />
                      </td>
                      <td>
                        <input className="mark-input" type="number" min="0" max="100"
                          value={a.eot ?? r.eot ?? ""}
                          onChange={e => setAssessments(p => ({ ...p, [r.studentId]: { ...p[r.studentId], eot: e.target.value } }))} />
                      </td>
                      <td><strong>{average}</strong></td>
                      <td><span className="badge info">{grade(average)}</span></td>
                      <td>
                        <input className="remarks-input" type="text"
                          value={a.remarks ?? r.remarks ?? ""}
                          placeholder="Remarks…"
                          onChange={e => setAssessments(p => ({ ...p, [r.studentId]: { ...p[r.studentId], remarks: e.target.value } }))} />
                      </td>
                      <td>
                        <button className="tool-button" style={{ minHeight: 30 }} onClick={() => handleSaveMark(r.studentId)}>
                          {saveStatus[r.studentId] === "saved"
                            ? <CheckCircle size={14} style={{ color: "#10b981" }} />
                            : <Save size={14} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {assessmentRecords.length === 0 && (
                  <tr><td colSpan={9} className="empty-state">No students in this class</td></tr>
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
        <div className="detail-panel">
          <div className="panel-title">
            <div className="panel-title-left"><p className="eyebrow">Communication</p><strong>Message Parents</strong></div>
            <MessageSquare size={18} />
          </div>
          <div className="office-form">
            <label>Class
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                {data.teacherClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.stream} — {c.subject}</option>
                ))}
              </select>
            </label>
            <label>Message
              <textarea value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Type message to parents…" />
            </label>
            {msgSent && <p className="notice-strip success">{msgSent}</p>}
            <button className="tool-button primary" onClick={handleSendMsg}><MessageSquare size={15} />Send to Parents</button>
          </div>
        </div>

        <div className="list-panel">
          <div className="panel-title"><strong style={{ fontSize: "0.9rem" }}>Message History</strong></div>
          <div className="stack-list">
            {data.parentMessages.slice(0, 6).map(msg => (
              <div key={msg.id} className="list-row">
                <div className="dot" />
                <div>
                  <strong style={{ fontSize: "0.88rem" }}>{msg.subject}</strong>
                  <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{msg.from} · {msg.date}</span>
                </div>
                <span className={`badge ${msg.read ? "muted" : "info"}`}>{msg.read ? "Read" : "New"}</span>
              </div>
            ))}
            {data.parentMessages.length === 0 && <p className="empty-state">No messages</p>}
          </div>
        </div>
      </div>
    );
  }

  if (view === "My Classes") {
    return (
      <div className="content-grid">
        <div className="metric-grid">
          <div className="metric teal"><div className="metric-icon"><BookOpen size={22} /></div><div className="metric-body"><strong>{data.teacherClasses.length}</strong><span>Classes</span></div></div>
          <div className="metric green"><div className="metric-icon"><Users size={22} /></div><div className="metric-body"><strong>{data.teacherClasses.reduce((s, c) => s + (c.totalStudents ?? 0), 0)}</strong><span>Total Students</span></div></div>
          <div className="metric blue"><div className="metric-icon"><Save size={22} /></div><div className="metric-body"><strong>{assessmentRecords.length}</strong><span>Assessments</span></div></div>
          <div className="metric amber"><div className="metric-icon"><MessageSquare size={22} /></div><div className="metric-body"><strong>{data.parentMessages.length}</strong><span>Messages</span></div></div>
        </div>
        <div className="stack-list list-panel">
          {data.teacherClasses.map(cls => (
            <div key={cls.id} className="list-row">
              <div className="dot" />
              <div>
                <strong style={{ fontSize: "0.9rem" }}>{cls.name} {cls.stream}</strong>
                <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{cls.subject} · {cls.totalStudents} students</span>
              </div>
              <span className="badge info">{cls.subject}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default
  return (
    <div className="content-grid">
      <div className="metric-grid">
        <div className="metric teal"><div className="metric-icon"><BookOpen size={22} /></div><div className="metric-body"><strong>{data.teacherClasses.length}</strong><span>Classes</span></div></div>
        <div className="metric green"><div className="metric-icon"><Users size={22} /></div><div className="metric-body"><strong>{data.teacherClasses.reduce((s, c) => s + (c.totalStudents ?? 0), 0)}</strong><span>Students</span></div></div>
        <div className="metric blue"><div className="metric-icon"><Save size={22} /></div><div className="metric-body"><strong>{assessmentRecords.length}</strong><span>Assessments</span></div></div>
        <div className="metric amber"><div className="metric-icon"><MessageSquare size={22} /></div><div className="metric-body"><strong>{data.parentMessages.length}</strong><span>Messages</span></div></div>
      </div>
      <div className="notice-strip">Select a view — My Classes, Attendance, Assessments, Report Remarks, or Messages.</div>
    </div>
  );
}
