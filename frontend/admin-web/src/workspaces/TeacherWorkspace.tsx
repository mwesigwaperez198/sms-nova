import { useState, useEffect } from "react";
import { Users, BookOpen, MessageSquare, Save, CheckCircle, Star, UserPlus, FileText, Download, Eye, Trophy } from "lucide-react";
import type { ConnectedData, TeacherClassInfo } from "../api";
import { attendanceMark, submitAssessment, fetchTeacherClasses, saveReportRemarks, fetchClassRanking } from "../api";

interface TeacherWorkspaceProps {
  view: string;
  data: ConnectedData;
  onViewChange: (view: string) => void;
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

interface ManualRegisterEntry {
  name: string;
  admissionNo: string;
  sex: string;
  dob: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
}

interface StudentRemark {
  studentId: string;
  conduct: string;
  effort: string;
  participation: string;
  generalRemarks: string;
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

const EMPTY_REGISTER: ManualRegisterEntry = { name: "", admissionNo: "", sex: "", dob: "", guardianName: "", guardianPhone: "", address: "" };

export function TeacherWorkspace({ view, data, onViewChange, onSendSms }: TeacherWorkspaceProps) {
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

  const [manualRegister, setManualRegister] = useState<ManualRegisterEntry[]>([]);
  const [newEntry, setNewEntry] = useState<ManualRegisterEntry>({ ...EMPTY_REGISTER });
  const [regSaved, setRegSaved] = useState(false);

  const [remarks, setRemarks] = useState<Record<string, StudentRemark>>({});
  const [remarksSaved, setRemarksSaved] = useState(false);
  const [ranking, setRanking] = useState<Array<{ student_id: number; student_name: string; average: number; grade: string; position: number | null }>>([]);
  const [rankingLoading, setRankingLoading] = useState(false);

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

  const handleAddRegisterEntry = () => {
    if (!newEntry.name.trim()) return;
    setManualRegister(prev => [...prev, { ...newEntry }]);
    setNewEntry({ ...EMPTY_REGISTER });
    setRegSaved(true);
    setTimeout(() => setRegSaved(false), 2500);
  };

  const handleRemoveRegisterEntry = (idx: number) => {
    setManualRegister(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveRemarks = async (studentId: string) => {
    const rem = remarks[studentId] ?? { conduct: "", effort: "", participation: "", generalRemarks: "" };
    setSaveStatus(p => ({ ...p, [`remark-${studentId}`]: "saving" }));
    try {
      await saveReportRemarks({
        student_id: parseInt(studentId, 10),
        academic_year: data.school.academic_year,
        term: data.school.term,
        conduct: rem.conduct || undefined,
        effort: rem.effort || undefined,
        participation: rem.participation || undefined,
        general_remarks: rem.generalRemarks || undefined,
      });
      setSaveStatus(p => ({ ...p, [`remark-${studentId}`]: "saved" }));
      setTimeout(() => setSaveStatus(p => ({ ...p, [`remark-${studentId}`]: "" })), 2000);
    } catch {
      setSaveStatus(p => ({ ...p, [`remark-${studentId}`]: "" }));
    }
  };

  const handleLoadRanking = async () => {
    if (!classData) return;
    setRankingLoading(true);
    try {
      const result = await fetchClassRanking(
        classData.name,
        data.school.academic_year,
        data.school.term
      );
      setRanking(result);
    } catch {
      setRanking([]);
    } finally {
      setRankingLoading(false);
    }
  };

  const handleSendMsg = () => {
    if (!msgText.trim()) return;
    onSendSms("all-parents", msgText, "Teacher message");
    setMsgSent("Message queued for parents");
    setMsgText("");
    setTimeout(() => setMsgSent(""), 3000);
  };

  const avg = (r: typeof assessmentRecords[0]) => {
    const a = assessments[r.studentId];
    const bot = parseFloat(a?.bot ?? String(r.bot ?? ""));
    const mot = parseFloat(a?.mot ?? String(r.mot ?? ""));
    const eot = parseFloat(a?.eot ?? String(r.eot ?? ""));
    const vals = [bot, mot, eot].filter(v => !isNaN(v));
    return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : "\u2014";
  };

  const grade = (average: string) => {
    const n = parseFloat(average);
    if (isNaN(n)) return "\u2014";
    if (n >= 80) return "D1"; if (n >= 70) return "D2"; if (n >= 65) return "C3";
    if (n >= 60) return "C4"; if (n >= 55) return "C5"; if (n >= 50) return "C6";
    if (n >= 45) return "P7"; if (n >= 40) return "P8"; return "F9";
  };

  const classSelector = (
    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
      {teacherClasses.map(c => (
        <option key={c.id} value={c.id}>{c.name} {c.stream} \u2014 {c.subject}</option>
      ))}
      {teacherClasses.length === 0 && <option value="">No classes found</option>}
    </select>
  );

  if (view === "My Classes") {
    const clsStudents = classData ? classData.students : [];
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>My Classes</h2>
          <p>View and manage your assigned classes, set class representatives.</p>
        </div>
        <div className="metric-grid">
          <div className="metric teal"><div className="metric-icon"><BookOpen size={22} /></div><div className="metric-body"><strong>{teacherClasses.length}</strong><span>Classes</span></div></div>
          <div className="metric green"><div className="metric-icon"><Users size={22} /></div><div className="metric-body"><strong>{teacherClasses.reduce((s, c) => s + c.totalStudents, 0)}</strong><span>Total Students</span></div></div>
          <div className="metric blue"><div className="metric-icon"><Star size={22} /></div><div className="metric-body"><strong>{Object.keys(classReps).length}</strong><span>Class Reps</span></div></div>
          <div className="metric amber"><div className="metric-icon"><MessageSquare size={22} /></div><div className="metric-body"><strong>{data.parentMessages.length}</strong><span>Messages</span></div></div>
        </div>
        <div className="office-layout">
          <div className="stack-list list-panel">
            {classesLoading && <p className="empty-state">Loading classes\u2026</p>}
            {teacherClasses.map(cls => {
              const repId = classReps[cls.id];
              const repStudent = cls.students.find(s => String(s.id) === repId);
              return (
                <div key={cls.id} className="list-row">
                  <div className="dot" style={{ background: repId ? "#f59e0b" : "var(--muted)" }} />
                  <div>
                    <strong style={{ fontSize: "0.9rem" }}>{cls.name} {cls.stream}</strong>
                    <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{cls.subject} \u00b7 {cls.totalStudents} students</span>
                    {repStudent && <><br /><span style={{ fontSize: "0.78rem", color: "#f59e0b" }}>Rep: {repStudent.name}</span></>}
                  </div>
                  <button className="tool-button" style={{ minHeight: 28 }} onClick={() => {
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
            <div className="detail-panel glass-card">
              <div className="panel-title">
                <div className="panel-title-left"><p className="eyebrow">Class Rep</p><strong>{repSelectClass.split("|")[0]} {repSelectClass.split("|")[1]}</strong></div>
                <Star size={18} />
              </div>
              <div className="office-form">
                <label>Select Student
                  <select value={repSelectStudent} onChange={e => setRepSelectStudent(e.target.value)}>
                    <option value="">\u2014 choose class rep \u2014</option>
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

  if (view === "Attendance") {
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Attendance Register</h2>
          <p>Mark attendance for your class students. Select present, absent, late, or excused.</p>
        </div>
        <div className="table-panel glass-card">
          <div className="office-filters">
            {classesLoading ? (
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Loading classes\u2026</span>
            ) : classSelector}
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
                  {(["present", "absent", "late", "excused"] as AttStatus[]).map(s => (
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
                    <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{cls.subject} \u00b7 {cls.totalStudents} students</span>
                  </div>
                  <div className="status-controls">
                    {(["present", "absent", "late", "excused"] as AttStatus[]).map(s => (
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

  if (view === "Assessments") {
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Assessments</h2>
          <p>Enter BOT, MOT, and EOT scores for each student. Scores are saved individually.</p>
        </div>
        <div className="table-panel glass-card">
          <div className="office-filters">
            {classesLoading ? (
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Loading classes\u2026</span>
            ) : classSelector}
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              {classData?.name} {classData?.stream} \u00b7 {classData?.subject}
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Adm No</th><th>Student</th>
                  <th>BOT /100</th><th>MOT /100</th><th>EOT /100</th>
                  <th>Avg</th><th>Grade</th><th></th>
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
                        <button className="tool-button" style={{ minHeight: 30 }} onClick={() => handleSaveMark(r.studentId)}>
                          {saveStatus[r.studentId] === "saving" ? (
                            <span style={{ fontSize: "0.75rem" }}>Saving\u2026</span>
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
                  <tr><td colSpan={8} className="empty-state">
                    {classesLoading ? "Loading\u2026" : "No students in this class"}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Report Remarks") {
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Report Remarks</h2>
          <p>Write personalized remarks about student conduct, effort, and participation for report cards.</p>
        </div>
        <div className="table-panel glass-card">
          <div className="office-filters">
            {classesLoading ? (
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Loading classes\u2026</span>
            ) : classSelector}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Adm No</th><th>Student</th>
                  <th>Conduct</th><th>Effort</th><th>Participation</th>
                  <th>General Remarks</th><th></th>
                </tr>
              </thead>
              <tbody>
                {assessmentRecords.map(r => {
                  const rem = remarks[r.studentId] ?? { conduct: "", effort: "", participation: "", generalRemarks: "" };
                  return (
                    <tr key={r.studentId}>
                      <td><code style={{ fontSize: "0.78rem" }}>{r.admissionNo}</code></td>
                      <td><strong style={{ fontSize: "0.88rem" }}>{r.studentName}</strong></td>
                      <td>
                        <select className="mark-input" style={{ width: 110 }}
                          value={rem.conduct}
                          onChange={e => setRemarks(p => ({ ...p, [r.studentId]: { ...p[r.studentId], conduct: e.target.value } }))}>
                          <option value="">Select</option>
                          <option>Excellent</option><option>Good</option><option>Fair</option><option>Poor</option>
                        </select>
                      </td>
                      <td>
                        <select className="mark-input" style={{ width: 110 }}
                          value={rem.effort}
                          onChange={e => setRemarks(p => ({ ...p, [r.studentId]: { ...p[r.studentId], effort: e.target.value } }))}>
                          <option value="">Select</option>
                          <option>Very Hard</option><option>Hard</option><option>Moderate</option><option>Lazy</option>
                        </select>
                      </td>
                      <td>
                        <select className="mark-input" style={{ width: 110 }}
                          value={rem.participation}
                          onChange={e => setRemarks(p => ({ ...p, [r.studentId]: { ...p[r.studentId], participation: e.target.value } }))}>
                          <option value="">Select</option>
                          <option>Active</option><option>Moderate</option><option>Quiet</option><option>Disruptive</option>
                        </select>
                      </td>
                      <td>
                        <input className="remarks-input" type="text"
                          value={rem.generalRemarks}
                          placeholder="Write a personal remark\u2026"
                          onChange={e => setRemarks(p => ({ ...p, [r.studentId]: { ...p[r.studentId], generalRemarks: e.target.value } }))} />
                      </td>
                      <td>
                        <button className="tool-button" style={{ minHeight: 30 }} onClick={() => handleSaveRemarks(r.studentId)}>
                          {saveStatus[`remark-${r.studentId}`] === "saving" ? (
                            <span style={{ fontSize: "0.75rem" }}>Saving\u2026</span>
                          ) : saveStatus[`remark-${r.studentId}`] === "saved" ? (
                            <CheckCircle size={14} style={{ color: "#10b981" }} />
                          ) : (
                            <Save size={14} />)}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {assessmentRecords.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">
                    {classesLoading ? "Loading\u2026" : "No students in this class"}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Ranking") {
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Class Ranking</h2>
          <p>View student positions based on assessment averages for the current term.</p>
        </div>
        <div className="table-panel glass-card">
          <div className="office-filters">
            {classesLoading ? (
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Loading classes\u2026</span>
            ) : classSelector}
            <button className="tool-button primary" onClick={handleLoadRanking} disabled={rankingLoading || !classData}>
              <Trophy size={15} />{rankingLoading ? "Loading\u2026" : "Load Ranking"}
            </button>
          </div>
          {ranking.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Position</th><th>Student</th><th>Average</th><th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r, idx) => (
                    <tr key={r.student_id} style={idx < 3 ? { background: idx === 0 ? "#fef9c3" : idx === 1 ? "#f0f0f0" : "#fff7ed" } : {}}>
                      <td>
                        <strong style={{ fontSize: "1rem" }}>
                          {r.position === 1 ? "\ud83e\udd47" : r.position === 2 ? "\ud83e\udd48" : r.position === 3 ? "\ud83e\udd49" : `#${r.position}`}
                        </strong>
                      </td>
                      <td><strong style={{ fontSize: "0.9rem" }}>{r.student_name}</strong></td>
                      <td><strong>{r.average}</strong></td>
                      <td><span className="badge info">{r.grade}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {ranking.length === 0 && !rankingLoading && (
            <p className="empty-state" style={{ padding: 20 }}>
              Select a class and click "Load Ranking" to view positions
            </p>
          )}
        </div>
      </div>
    );
  }

  if (view === "Student Register") {
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Manual Student Register</h2>
          <p>Add students manually to your class register alongside imported profiles.</p>
        </div>
        <div className="detail-panel glass-card">
          <div className="panel-title">
            <div className="panel-title-left"><p className="eyebrow">Register</p><strong>Add Student to Class</strong></div>
            <UserPlus size={18} />
          </div>
          <div className="office-form">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>Full Name *
                <input value={newEntry.name} onChange={e => setNewEntry(p => ({ ...p, name: e.target.value }))} placeholder="Student full name" />
              </label>
              <label>Admission No
                <input value={newEntry.admissionNo} onChange={e => setNewEntry(p => ({ ...p, admissionNo: e.target.value }))} placeholder="Auto-generated if empty" />
              </label>
              <label>Sex *
                <select value={newEntry.sex} onChange={e => setNewEntry(p => ({ ...p, sex: e.target.value }))}>
                  <option value="">Select</option><option>Male</option><option>Female</option>
                </select>
              </label>
              <label>Date of Birth
                <input type="date" value={newEntry.dob} onChange={e => setNewEntry(p => ({ ...p, dob: e.target.value }))} />
              </label>
              <label>Guardian Name
                <input value={newEntry.guardianName} onChange={e => setNewEntry(p => ({ ...p, guardianName: e.target.value }))} placeholder="Guardian full name" />
              </label>
              <label>Guardian Phone
                <input value={newEntry.guardianPhone} onChange={e => setNewEntry(p => ({ ...p, guardianPhone: e.target.value }))} placeholder="0700 000000" />
              </label>
            </div>
            <label>Address
              <input value={newEntry.address} onChange={e => setNewEntry(p => ({ ...p, address: e.target.value }))} placeholder="Physical address" />
            </label>
            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              <button className="tool-button primary" onClick={handleAddRegisterEntry} disabled={!newEntry.name.trim()}>
                <UserPlus size={15} />Add to Register
              </button>
              {regSaved && <span className="badge success"><CheckCircle size={13} />Added</span>}
            </div>
          </div>
        </div>
        {manualRegister.length > 0 && (
          <div className="table-panel glass-card">
            <div className="panel-title">
              <div className="panel-title-left"><p className="eyebrow">Class Register</p><strong>{classData?.name ?? "All"} \u2014 Manual Entries ({manualRegister.length})</strong></div>
              <Download size={18} />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Name</th><th>Adm No</th><th>Sex</th><th>DOB</th><th>Guardian</th><th>Phone</th><th></th></tr>
                </thead>
                <tbody>
                  {manualRegister.map((entry, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td><strong>{entry.name}</strong></td>
                      <td><code style={{ fontSize: "0.78rem" }}>{entry.admissionNo || `MAN/${Date.now().toString(36).slice(-4).toUpperCase()}`}</code></td>
                      <td>{entry.sex}</td>
                      <td>{entry.dob || "\u2014"}</td>
                      <td>{entry.guardianName || "\u2014"}</td>
                      <td>{entry.guardianPhone || "\u2014"}</td>
                      <td>
                        <button className="tool-button" style={{ minHeight: 28, color: "#ef4444" }} onClick={() => handleRemoveRegisterEntry(idx)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {classStudents.length > 0 && (
          <div className="table-panel glass-card">
            <div className="panel-title">
              <div className="panel-title-left"><p className="eyebrow">Imported Profiles</p><strong>{classData?.name ?? "All"} \u2014 System Students ({classStudents.length})</strong></div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Name</th><th>Admission No</th><th></th></tr></thead>
                <tbody>
                  {classStudents.map((s, idx) => (
                    <tr key={s.id}>
                      <td>{idx + 1}</td>
                      <td><strong>{s.name}</strong></td>
                      <td><code style={{ fontSize: "0.78rem" }}>{s.admissionNo}</code></td>
                      <td><span className="badge success">Imported</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === "Messages") {
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Parent Communication</h2>
          <p>Send messages and updates to parents of your class students.</p>
        </div>
        <div className="office-layout">
          <div className="detail-panel glass-card">
            <div className="panel-title">
              <div className="panel-title-left"><p className="eyebrow">Communication</p><strong>Message Parents</strong></div>
              <MessageSquare size={18} />
            </div>
            <div className="office-form">
              <label>Class
                {classesLoading ? (
                  <span style={{ color: "var(--muted)", fontSize: "0.85rem", marginLeft: 8 }}>Loading\u2026</span>
                ) : (
                  <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                    {teacherClasses.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.stream} \u2014 {c.subject}</option>
                    ))}
                    {teacherClasses.length === 0 && <option value="">No classes</option>}
                  </select>
                )}
              </label>
              <label>Message
                <textarea value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Type message to parents\u2026" />
              </label>
              {msgSent && <p className="notice-strip success">{msgSent}</p>}
              <button className="tool-button primary" onClick={handleSendMsg}><MessageSquare size={15} />Send to Parents</button>
            </div>
          </div>
          <div className="list-panel glass-card">
            <div className="panel-title"><strong style={{ fontSize: "0.9rem" }}>Message History</strong></div>
            <div className="stack-list">
              {data.parentMessages.slice(0, 6).map(msg => (
                <div key={msg.id} className="list-row">
                  <div className="dot" />
                  <div>
                    <strong style={{ fontSize: "0.88rem" }}>{msg.subject}</strong>
                    <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{msg.from} \u00b7 {msg.date}</span>
                  </div>
                  <span className={`badge ${msg.read ? "muted" : "info"}`}>{msg.read ? "Read" : "New"}</span>
                </div>
              ))}
              {data.parentMessages.length === 0 && <p className="empty-state">No messages</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const quickNavItems = [
    { label: "My Classes", view: "My Classes", icon: <BookOpen size={15} /> },
    { label: "Attendance", view: "Attendance", icon: <Users size={15} /> },
    { label: "Assessments", view: "Assessments", icon: <FileText size={15} /> },
    { label: "Report Remarks", view: "Report Remarks", icon: <Star size={15} /> },
    { label: "Ranking", view: "Ranking", icon: <Trophy size={15} /> },
    { label: "Student Register", view: "Student Register", icon: <UserPlus size={15} /> },
    { label: "Messages", view: "Messages", icon: <MessageSquare size={15} /> },
  ];

  return (
    <div className="content-grid">
      <div className="welcome-banner">
        <h2>Teaching Workspace</h2>
        <p>Manage your classes, attendance, assessments, and student registers.</p>
      </div>
      <div className="metric-grid">
        <div className="metric teal"><div className="metric-icon"><BookOpen size={22} /></div><div className="metric-body"><strong>{teacherClasses.length}</strong><span>Classes</span></div></div>
        <div className="metric green"><div className="metric-icon"><Users size={22} /></div><div className="metric-body"><strong>{teacherClasses.reduce((s, c) => s + c.totalStudents, 0)}</strong><span>Students</span></div></div>
        <div className="metric blue"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{assessmentRecords.length}</strong><span>Assessments</span></div></div>
        <div className="metric amber"><div className="metric-icon"><MessageSquare size={22} /></div><div className="metric-body"><strong>{data.parentMessages.length}</strong><span>Messages</span></div></div>
      </div>
      <div className="glass-card" style={{ padding: 16 }}>
        <p className="eyebrow" style={{ marginBottom: 10 }}>Quick Navigation</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {quickNavItems.map(item => (
            <button key={item.view} className="tool-button" onClick={() => onViewChange(item.view)}>
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
