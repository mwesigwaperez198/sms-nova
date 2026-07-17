import { useState, useEffect } from "react";
import { Users, BookOpen, MessageSquare, Save, CheckCircle, Star } from "lucide-react";
import type { ConnectedData, TeacherClassInfo } from "../api";
import { attendanceMark, submitAssessment, fetchTeacherClasses } from "../api";

interface TeacherWorkspaceProps {
  view: string;
  data: ConnectedData;
  onSendSms: (groupId: string, message: string, comment: string) => void;
}

type AttStatus = "present" | "absent" | "late" | "excused" | "";

interface LocalClass {
  id: string;
  name: string;
  stream: string;
  subject: string;
  totalStudents: number;
  students: { id: number; name: string; admissionNumber: string; className: string; streamName: string }[];
}

interface LocalStudent {
  id: number;
  name: string;
  admissionNo: string;
}

function mapTeacherClassInfo(raw: TeacherClassInfo, idx: number): LocalClass {
  return {
    id: String(idx),
    name: raw.class_name,
    stream: "",
    subject: "",
    totalStudents: raw.student_count,
    students: (raw.students ?? []).map(s => ({
      id: s.id,
      name: s.name,
      admissionNumber: s.admission_number ?? "",
      className: s.class_name ?? raw.class_name,
      streamName: s.stream_name ?? "",
    })),
  };
}

export function TeacherWorkspace({ view, data, onSendSms }: TeacherWorkspaceProps) {
  const [teacherClasses, setTeacherClasses] = useState<LocalClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("");
  const [attendance, setAttendance] = useState<Record<string, AttStatus>>({});
  const [attSaved, setAttSaved] = useState(false);
  const [assessments, setAssessments] = useState<Record<string, { bot: string; mot: string; eot: string; remarks: string }>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});
  const [msgText, setMsgText] = useState("");
  const [msgSent, setMsgSent] = useState("");
  const [classReps, setClassReps] = useState<Record<string, string>>({});
  const [repSelectClass, setRepSelectClass] = useState("");
  const [repSelectStudent, setRepSelectStudent] = useState("");

  useEffect(() => {
    let cancelled = false;
    setClassesLoading(true);
    fetchTeacherClasses()
      .then(raw => {
        if (cancelled) return;
        const mapped = raw.map(mapTeacherClassInfo);
        setTeacherClasses(mapped);
        if (mapped.length > 0 && !selectedClass) {
          setSelectedClass(mapped[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setTeacherClasses([]);
      })
      .finally(() => {
        if (!cancelled) setClassesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const classData = teacherClasses.find(c => c.id === selectedClass);
  const classStudents: LocalStudent[] = classData
    ? classData.students.map(s => ({ id: s.id, name: s.name, admissionNo: s.admissionNumber }))
    : [];

  const attendanceRecords = classStudents.map(s => ({
    studentId: String(s.id),
    studentName: s.name,
    admissionNo: s.admissionNo,
  }));

  const assessmentRecords = classStudents.map(s => ({
    studentId: String(s.id),
    studentName: s.name,
    admissionNo: s.admissionNo,
    bot: null as number | null,
    mot: null as number | null,
    eot: null as number | null,
    remarks: "",
  }));

  const setAtt = (studentId: string, status: AttStatus) =>
    setAttendance(p => ({ ...p, [studentId]: p[studentId] === status ? "" : status }));

  const handleSaveAttendance = async () => {
    const records = Object.entries(attendance)
      .filter(([, status]) => status !== "")
      .map(([studentId, status]) => ({
        student_id: parseInt(studentId, 10),
        status,
      }));
    if (records.length === 0) return;
    try {
      await attendanceMark({
        attendance_date: new Date().toISOString().split("T")[0],
        records,
      });
      setAttSaved(true);
      setTimeout(() => setAttSaved(false), 2500);
    } catch {
      setAttSaved(false);
    }
  };

  const handleSaveMark = async (studentId: string) => {
    const a = assessments[studentId] ?? { bot: "", mot: "", eot: "", remarks: "" };
    const student = classStudents.find(s => String(s.id) === studentId);
    if (!student) return;
    const subject = classData?.subject ?? "";
    const academicYear = data.school.academic_year;
    const term = data.school.term;

    setSaveStatus(p => ({ ...p, [studentId]: "saving" }));
    try {
      const types = ["BOT", "MOT", "EOT"] as const;
      const scores: Record<string, string> = {
        BOT: a.bot,
        MOT: a.mot,
        EOT: a.eot,
      };
      for (const t of types) {
        const val = scores[t];
        if (val !== undefined && val !== "") {
          await submitAssessment({
            student_id: student.id,
            academic_year: academicYear,
            term,
            subject,
            assessment_type: t,
            score: parseFloat(val),
            remarks: a.remarks || undefined,
          });
        }
      }
      setSaveStatus(p => ({ ...p, [studentId]: "saved" }));
      setTimeout(() => setSaveStatus(p => ({ ...p, [studentId]: "" })), 2000);
    } catch {
      setSaveStatus(p => ({ ...p, [studentId]: "" }));
    }
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
            {classesLoading ? (
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Loading classes…</span>
            ) : (
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                {teacherClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.stream} — {c.subject}</option>
                ))}
                {teacherClasses.length === 0 && <option value="">No classes found</option>}
              </select>
            )}
            <button className="tool-button primary" onClick={handleSaveAttendance} disabled={classesLoading || teacherClasses.length === 0}>
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
              !classesLoading && teacherClasses.map(cls => (
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
            {classesLoading ? (
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Loading classes…</span>
            ) : (
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                {teacherClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.stream} — {c.subject}</option>
                ))}
                {teacherClasses.length === 0 && <option value="">No classes found</option>}
              </select>
            )}
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
                  const a = assessments[r.studentId] ?? { bot: "", mot: "", eot: "", remarks: "" };
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
                          {saveStatus[r.studentId] === "saving" ? (
                            <span style={{ fontSize: "0.75rem" }}>Saving…</span>
                          ) : saveStatus[r.studentId] === "saved" ? (
                            <CheckCircle size={14} style={{ color: "#10b981" }} />
                          ) : (
                            <Save size={14} />)}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {assessmentRecords.length === 0 && (
                  <tr><td colSpan={9} className="empty-state">
                    {classesLoading ? "Loading…" : "No students in this class"}
                  </td></tr>
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
              {classesLoading ? (
                <span style={{ color: "var(--muted)", fontSize: "0.85rem", marginLeft: 8 }}>Loading…</span>
              ) : (
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                  {teacherClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.stream} — {c.subject}</option>
                  ))}
                  {teacherClasses.length === 0 && <option value="">No classes</option>}
                </select>
              )}
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
    const clsStudents = classData
      ? classData.students
      : [];
    return (
      <div className="content-grid">
        <div className="metric-grid">
          <div className="metric teal"><div className="metric-icon"><BookOpen size={22} /></div><div className="metric-body"><strong>{teacherClasses.length}</strong><span>Classes</span></div></div>
          <div className="metric green"><div className="metric-icon"><Users size={22} /></div><div className="metric-body"><strong>{teacherClasses.reduce((s, c) => s + c.totalStudents, 0)}</strong><span>Total Students</span></div></div>
          <div className="metric blue"><div className="metric-icon"><Star size={22} /></div><div className="metric-body"><strong>{Object.keys(classReps).length}</strong><span>Class Reps</span></div></div>
          <div className="metric amber"><div className="metric-icon"><MessageSquare size={22} /></div><div className="metric-body"><strong>{data.parentMessages.length}</strong><span>Messages</span></div></div>
        </div>

        <div className="office-layout">
          <div className="stack-list list-panel">
            {classesLoading && <p className="empty-state">Loading classes…</p>}
            {teacherClasses.map(cls => {
              const repId = classReps[cls.id];
              const repStudent = cls.students.find(s => String(s.id) === repId);
              return (
                <div key={cls.id} className="list-row">
                  <div className="dot" style={{background: repId ? "#f59e0b" : "var(--muted)"}} />
                  <div>
                    <strong style={{ fontSize: "0.9rem" }}>{cls.name} {cls.stream}</strong>
                    <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{cls.subject} · {cls.totalStudents} students</span>
                    {repStudent && <><br /><span style={{fontSize:"0.78rem",color:"#f59e0b"}}>Rep: {repStudent.name}</span></>}
                  </div>
                  <button className="tool-button" style={{minHeight:28}} onClick={() => {
                    setRepSelectClass(`${cls.name}|${cls.stream}|${cls.id}`);
                    setRepSelectStudent(classReps[cls.id] ?? "");
                  }}>
                    <Star size={13} />{repId ? "Change Rep" : "Set Rep"}
                  </button>
                </div>
              );
            })}
          </div>

          {repSelectClass && (
            <div className="detail-panel">
              <div className="panel-title">
                <div className="panel-title-left"><p className="eyebrow">Class Rep</p><strong>{repSelectClass.split("|")[0]} {repSelectClass.split("|")[1]}</strong></div>
                <Star size={18} />
              </div>
              <div className="office-form">
                <label>Select Student
                  <select value={repSelectStudent} onChange={e => setRepSelectStudent(e.target.value)}>
                    <option value="">— choose class rep —</option>
                    {clsStudents.map(s => (
                      <option key={s.id} value={String(s.id)}>{s.name} ({s.admission_number ?? ""})</option>
                    ))}
                  </select>
                </label>
                <button className="tool-button primary" onClick={() => {
                  const clsId = repSelectClass.split("|")[2];
                  setClassReps(p => ({ ...p, [clsId]: repSelectStudent }));
                  setRepSelectClass("");
                  setRepSelectStudent("");
                }} disabled={!repSelectStudent}>
                  <Star size={15} />Set as Class Representative
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="content-grid">
      <div className="metric-grid">
        <div className="metric teal"><div className="metric-icon"><BookOpen size={22} /></div><div className="metric-body"><strong>{teacherClasses.length}</strong><span>Classes</span></div></div>
        <div className="metric green"><div className="metric-icon"><Users size={22} /></div><div className="metric-body"><strong>{teacherClasses.reduce((s, c) => s + c.totalStudents, 0)}</strong><span>Students</span></div></div>
        <div className="metric blue"><div className="metric-icon"><Save size={22} /></div><div className="metric-body"><strong>{assessmentRecords.length}</strong><span>Assessments</span></div></div>
        <div className="metric amber"><div className="metric-icon"><MessageSquare size={22} /></div><div className="metric-body"><strong>{data.parentMessages.length}</strong><span>Messages</span></div></div>
      </div>
      <div className="notice-strip">Select a view — My Classes, Attendance, Assessments, Report Remarks, or Messages.</div>
    </div>
  );
}
