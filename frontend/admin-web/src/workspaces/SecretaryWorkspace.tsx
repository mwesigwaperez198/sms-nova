import { useState, useRef, useCallback, useEffect } from "react";
import { Users, UserPlus, FileText, Upload, Search, Download, X, CheckCircle, AlertCircle, ClipboardList, Eye } from "lucide-react";
import type { ConnectedData, GuardianInfo } from "../api";
import { fetchSecretaryGuardianList, apiRequest, bulkImportStudents } from "../api";
import { printElement } from "../utils/exportUtils";

interface SecretaryWorkspaceProps {
  view: string;
  data: ConnectedData;
  onViewChange: (view: string) => void;
}

const CLASSES = ["P1","P2","P3","P4","P5","P6","P7","S1","S2","S3","S4","S5","S6"];

const EMPTY_FORM = {
  fullName:"", age:"", sex:"", dob:"", targetClass:"", stream:"", previousSchool:"",
  parentStatus:"Both Alive", fatherName:"", motherName:"", guardianName:"",
  guardianNin:"", contact:"", address:"", studentNin:"", emisNumber:"",
  currentSkills:"", desiredSkills:"", expectations:"",
  guardianSignature:"", declarationDate:""
};

interface StudentRequirement {
  id: string;
  studentName: string;
  className: string;
  items: RequirementItem[];
  status: "pending" | "partial" | "complete";
}

interface RequirementItem {
  name: string;
  provided: boolean;
  notes: string;
}

const REQUIREMENT_TYPES = [
  "Birth Certificate", "Immunization Card", "Previous School Report", "Passport Photo",
  "Parent NIN Copy", "Student NIN Copy", "Medical Records", "Uniform Set", "Books & Stationery",
  "School Fees Receipt"
];

export function SecretaryWorkspace({ view, data, onViewChange }: SecretaryWorkspaceProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitMsg, setSubmitMsg] = useState("");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<number | null>(null);

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({...p, [k]: e.target.value}));

  const [requirements, setRequirements] = useState<StudentRequirement[]>([
    { id: "1", studentName: "Nakamya Sarah", className: "P3", status: "complete", items: REQUIREMENT_TYPES.map(name => ({ name, provided: true, notes: "" })) },
    { id: "2", studentName: "Okello James", className: "S1", status: "partial", items: REQUIREMENT_TYPES.map((name, i) => ({ name, provided: i < 6, notes: "" })) },
    { id: "3", studentName: "Namukasa Grace", className: "P5", status: "pending", items: REQUIREMENT_TYPES.map(name => ({ name, provided: false, notes: "" })) },
  ]);
  const [reqSearch, setReqSearch] = useState("");
  const [editingReq, setEditingReq] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.sex || !form.dob || !form.targetClass) {
      setSubmitMsg("Fill all required fields (*)");
      return;
    }
    setSubmitting(true);
    try {
      const admNo = `ADM-${Date.now().toString(36).toUpperCase()}`;
      await apiRequest("/api/v1/students/", {
        method: "POST",
        body: JSON.stringify({
          name: form.fullName,
          admission_number: admNo,
          class_name: form.targetClass,
          stream_name: form.stream,
          sex: form.sex,
          date_of_birth: form.dob,
          guardian_name: form.guardianName,
          guardian_phone: form.contact,
          guardian_email: "",
          address: form.address,
          blood_group: "",
          allergies: "",
          medical_conditions: form.currentSkills,
          previous_school: form.previousSchool,
          parent_status: form.parentStatus,
          father_name: form.fatherName,
          mother_name: form.motherName,
          skills: form.currentSkills,
          desired_skills: form.desiredSkills,
          expectations: form.expectations,
        }),
      });
      setRequirements(prev => [...prev, {
        id: String(Date.now()),
        studentName: form.fullName,
        className: form.targetClass,
        status: "pending",
        items: REQUIREMENT_TYPES.map(name => ({ name, provided: false, notes: "" })),
      }]);
      setSubmitMsg("Admission submitted successfully!");
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setSubmitMsg(err?.message || "Failed to submit admission");
    } finally {
      setSubmitting(false);
      setTimeout(() => setSubmitMsg(""), 4000);
    }
  };

  const filteredStudents = data.students.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.admissionNo?.toLowerCase().includes(search.toLowerCase()) ||
    s.className?.toLowerCase().includes(search.toLowerCase())
  );

  const [guardians, setGuardians] = useState<GuardianInfo[]>([]);
  const [guardiansLoading, setGuardiansLoading] = useState(false);

  useEffect(() => {
    if (view === "Guardians" && guardians.length === 0 && !guardiansLoading) {
      setGuardiansLoading(true);
      fetchSecretaryGuardianList()
        .then((list: GuardianInfo[]) => setGuardians(list))
        .catch(() => {})
        .finally(() => setGuardiansLoading(false));
    }
  }, [view, guardians.length, guardiansLoading]);

  const filteredGuardians = guardians.filter(g =>
    !search ||
    g.name?.toLowerCase().includes(search.toLowerCase()) ||
    g.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    g.email?.toLowerCase().includes(search.toLowerCase())
  );

  const [importFiles, setImportFiles] = useState<{ name: string; size: number; preview: Record<string, string>[] }[]>([]);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function parseCSVText(text: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
    return lines.slice(1).map(line => {
      const values: string[] = [];
      let current = "", inQuote = false;
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote; continue; }
        if (ch === "," && !inQuote) { values.push(current.trim()); current = ""; continue; }
        current += ch;
      }
      values.push(current.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
      return row;
    });
  }

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const newFiles: typeof importFiles = [];
    for (const file of Array.from(files)) {
      if (file.name.endsWith(".csv")) {
        const text = await file.text();
        const preview = parseCSVText(text);
        newFiles.push({ name: file.name, size: file.size, preview });
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        newFiles.push({ name: file.name, size: file.size, preview: [] });
      }
    }
    setImportFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (index: number) => setImportFiles(prev => prev.filter((_, i) => i !== index));

  const filteredReqs = requirements.filter(r =>
    !reqSearch || r.studentName.toLowerCase().includes(reqSearch.toLowerCase()) || r.className.toLowerCase().includes(reqSearch.toLowerCase())
  );

  const toggleReqItem = (reqId: string, itemIdx: number) => {
    setRequirements(prev => prev.map(r => {
      if (r.id !== reqId) return r;
      const items = [...r.items];
      items[itemIdx] = { ...items[itemIdx], provided: !items[itemIdx].provided };
      const doneCount = items.filter(i => i.provided).length;
      const status = doneCount === items.length ? "complete" : doneCount > 0 ? "partial" : "pending";
      return { ...r, items, status };
    }));
  };

  if (view === "Dashboard") {
    const activeStudents = data.students.filter(s => s.status === "Active").length;
    const totalReqs = requirements.length;
    const completeReqs = requirements.filter(r => r.status === "complete").length;
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Front Desk Dashboard</h2>
          <p>Welcome back. Here's your overview of student admissions and activities.</p>
        </div>
        <div className="metric-grid">
          <div className="metric teal"><div className="metric-icon"><Users size={22} /></div><div className="metric-body"><strong>{data.students.length}</strong><span>Total Students</span></div></div>
          <div className="metric green"><div className="metric-icon"><UserPlus size={22} /></div><div className="metric-body"><strong>{activeStudents}</strong><span>Active Students</span></div></div>
          <div className="metric amber"><div className="metric-icon"><ClipboardList size={22} /></div><div className="metric-body"><strong>{completeReqs}/{totalReqs}</strong><span>Requirements Done</span></div></div>
          <div className="metric blue"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{data.secretaryDocuments.length}</strong><span>Documents</span></div></div>
        </div>
        <div className="glass-card" style={{ padding: 16 }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Quick Navigation</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { label: "Register Student", view: "Register Student", icon: <UserPlus size={15} /> },
              { label: "Student Profiles", view: "Student Profiles", icon: <Users size={15} /> },
              { label: "Student Requirements", view: "Student Requirements", icon: <ClipboardList size={15} /> },
              { label: "Import Students", view: "Import Students", icon: <Upload size={15} /> },
              { label: "Guardians", view: "Guardians", icon: <Users size={15} /> },
              { label: "Documents", view: "Documents", icon: <FileText size={15} /> },
            ].map(item => (
              <button key={item.view} className="tool-button" onClick={() => onViewChange(item.view)}>
                {item.icon}{item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="office-layout">
          <div className="list-panel glass-card">
            <div className="panel-title"><strong style={{ fontSize: "0.9rem" }}>Recent Admissions</strong></div>
            <div className="stack-list">
              {data.students.slice(0, 5).map(s => (
                <div key={s.admissionNo} className="list-row">
                  <div className="dot" />
                  <div>
                    <strong style={{ fontSize: "0.88rem" }}>{s.name}</strong>
                    <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{s.admissionNo} \u00b7 {s.className}</span>
                  </div>
                  <span className={`badge ${s.status === "Active" ? "success" : "warning"}`}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="list-panel glass-card">
            <div className="panel-title"><strong style={{ fontSize: "0.9rem" }}>Requirement Status</strong></div>
            <div className="stack-list">
              {requirements.slice(0, 5).map(r => (
                <div key={r.id} className="list-row">
                  <div className={`dot`} style={{ background: r.status === "complete" ? "#10b981" : r.status === "partial" ? "#f59e0b" : "#ef4444" }} />
                  <div>
                    <strong style={{ fontSize: "0.88rem" }}>{r.studentName}</strong>
                    <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{r.className} \u00b7 {r.items.filter(i => i.provided).length}/{r.items.length} items</span>
                  </div>
                  <span className={`badge ${r.status === "complete" ? "success" : r.status === "partial" ? "warning" : "danger"}`}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Register Student") {
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Student Admission</h2>
          <p>Register a new student into the school system with full details.</p>
        </div>
        <div className="detail-panel glass-card" style={{ maxWidth: 800 }}>
          <div className="panel-title">
            <div className="panel-title-left"><p className="eyebrow">Admissions</p><strong>Student Intake Form</strong></div>
            <UserPlus size={18} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="office-form">
              <p className="eyebrow" style={{ paddingTop: 4 }}>Personal Information</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label>Full Name *<input value={form.fullName} onChange={set("fullName")} placeholder="Full legal name" required /></label>
                <label>Sex *
                  <select value={form.sex} onChange={set("sex")} required>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option>
                  </select>
                </label>
                <label>Date of Birth *<input type="date" value={form.dob} onChange={set("dob")} required /></label>
                <label>Target Class *
                  <select value={form.targetClass} onChange={set("targetClass")} required>
                    <option value="">Select class</option>
                    {CLASSES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label>Stream
                  <select value={form.stream} onChange={set("stream")}>
                    <option value="">Select stream</option>
                    <option>A</option><option>B</option><option>C</option>
                  </select>
                </label>
                <label>Previous School<input value={form.previousSchool} onChange={set("previousSchool")} placeholder="If any" /></label>
              </div>

              <p className="eyebrow" style={{ paddingTop: 8 }}>Parent / Guardian</p>
              <label>Parent Status *
                <select value={form.parentStatus} onChange={set("parentStatus")}>
                  <option>Both Alive</option>
                  <option>Father Deceased</option>
                  <option>Mother Deceased</option>
                  <option>Both Deceased</option>
                  <option>Guardian Managed</option>
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label>Father's Name<input value={form.fatherName} onChange={set("fatherName")} placeholder="Full name" /></label>
                <label>Mother's Name<input value={form.motherName} onChange={set("motherName")} placeholder="Full name" /></label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label>Guardian Name *<input value={form.guardianName} onChange={set("guardianName")} placeholder="Guardian full name" required /></label>
                <label>Guardian NIN<input value={form.guardianNin} onChange={set("guardianNin")} placeholder="National ID number (required)" required /></label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label>Contact Number *<input type="tel" value={form.contact} onChange={set("contact")} placeholder="+256 700 000000" required /></label>
                <label>Student NIN<input value={form.studentNin} onChange={set("studentNin")} placeholder="Optional National ID" /></label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label>Living Address *<textarea value={form.address} onChange={set("address")} placeholder="Full address" required style={{ minHeight: 50 }} /></label>
                <label>EMIS Number<input value={form.emisNumber} onChange={set("emisNumber")} placeholder="Optional EMIS number" /></label>
              </div>

              <p className="eyebrow" style={{ paddingTop: 8 }}>Skills &amp; Expectations</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label>Current Skills<input value={form.currentSkills} onChange={set("currentSkills")} placeholder="e.g. Art, Music, Sports" /></label>
                <label>Desired Skills<input value={form.desiredSkills} onChange={set("desiredSkills")} placeholder="e.g. Coding, Agribusiness" /></label>
              </div>
              <label>Core Expectations<textarea value={form.expectations} onChange={set("expectations")} placeholder="Student goals and expectations" style={{ minHeight: 60 }} /></label>

              <p className="eyebrow" style={{ paddingTop: 8 }}>Declaration</p>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: 0 }}>
                I declare that the information provided is true and accurate.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label>Guardian Signature<input value={form.guardianSignature} onChange={set("guardianSignature")} placeholder="Type full name" /></label>
                <label>Date<input type="date" value={form.declarationDate} onChange={set("declarationDate")} /></label>
              </div>

              {submitMsg && <p className={`notice-strip ${submitMsg.startsWith("Admission") ? "success" : "error"}`}>{submitMsg}</p>}
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <button type="submit" className="tool-button primary" disabled={submitting}><UserPlus size={15}/>{submitting ? "Submitting\u2026" : "Submit Admission"}</button>
                <button type="button" className="tool-button" onClick={() => setForm(EMPTY_FORM)}>Clear</button>
              </div>
            </div>
          </form>
        </div>

        <div className="list-panel glass-card">
          <div className="panel-title"><strong style={{ fontSize: "0.9rem" }}>Recent Admissions</strong></div>
          <div className="stack-list">
            {data.students.slice(0, 8).map(s => (
              <div key={s.admissionNo} className="list-row">
                <div className="dot" />
                <div>
                  <strong style={{ fontSize: "0.88rem" }}>{s.name}</strong>
                  <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{s.admissionNo} \u00b7 {s.className}</span>
                </div>
                <span className={`badge ${s.status === "Active" ? "success" : "warning"}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === "Student Profiles") {
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Student Profiles</h2>
          <p>View and search all registered student profiles in the system.</p>
        </div>
        <div className="table-panel glass-card">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search name, admission no, class\u2026" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <button className="tool-button primary" onClick={() => onViewChange("Register Student")}><UserPlus size={15}/>New Admission</button>
            <button className="tool-button" onClick={() => printElement("export-student-profiles")}><FileText size={15}/>Export</button>
          </div>
          <div id="export-student-profiles" className="table-wrap">
            <table>
              <thead><tr><th>Adm No</th><th>Name</th><th>Gender</th><th>Class</th><th>Guardian</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filteredStudents.map(s => (
                  <tr key={s.admissionNo}>
                    <td><code>{s.admissionNo}</code></td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.gender}</td>
                    <td>{s.className}</td>
                    <td>{s.guardian}</td>
                    <td><span className={`badge ${s.status === "Active" ? "success" : "warning"}`}>{s.status}</span></td>
                    <td><button className="tool-button" style={{ minHeight: 30, fontSize: "0.78rem" }} onClick={() => setViewingStudent(s.id)}><Eye size={13}/>View</button></td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && <tr><td colSpan={7} className="empty-state">No students found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Student Requirements") {
    const editing = editingReq ? requirements.find(r => r.id === editingReq) : null;
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Student Requirements</h2>
          <p>Track registration requirements for each student. Mark items as provided.</p>
        </div>
        <div className="table-panel glass-card">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search student name or class\u2026" value={reqSearch} onChange={e => setReqSearch(e.target.value)} /></label>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{filteredReqs.length} students</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Class</th><th>Items</th><th>Progress</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filteredReqs.map(r => {
                  const done = r.items.filter(i => i.provided).length;
                  return (
                    <tr key={r.id}>
                      <td><strong>{r.studentName}</strong></td>
                      <td>{r.className}</td>
                      <td>{done}/{r.items.length}</td>
                      <td>
                        <div style={{ width: 100, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${(done / r.items.length) * 100}%`, height: "100%", background: r.status === "complete" ? "#10b981" : "#f59e0b", borderRadius: 3 }} />
                        </div>
                      </td>
                      <td><span className={`badge ${r.status === "complete" ? "success" : r.status === "partial" ? "warning" : "danger"}`}>{r.status}</span></td>
                      <td><button className="tool-button" style={{ minHeight: 28 }} onClick={() => setEditingReq(r.id === editingReq ? null : r.id)}><Eye size={13}/> Details</button></td>
                    </tr>
                  );
                })}
                {filteredReqs.length === 0 && <tr><td colSpan={6} className="empty-state">No requirements found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {editing && (
          <div className="detail-panel glass-card">
            <div className="panel-title">
              <div className="panel-title-left"><p className="eyebrow">Requirements</p><strong>{editing.studentName} \u2014 {editing.className}</strong></div>
              <button className="tool-button" style={{ minHeight: 28 }} onClick={() => setEditingReq(null)}><X size={14}/></button>
            </div>
            <div className="office-form">
              {editing.items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <input
                    type="checkbox"
                    checked={item.provided}
                    onChange={() => toggleReqItem(editing.id, idx)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ flex: 1, fontSize: "0.88rem", textDecoration: item.provided ? "line-through" : "none", opacity: item.provided ? 0.6 : 1 }}>{item.name}</span>
                  {item.provided ? <CheckCircle size={14} style={{ color: "#10b981" }} /> : <AlertCircle size={14} style={{ color: "var(--muted)" }} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === "Import Students") {
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Import Students</h2>
          <p>Bulk import students from CSV or Excel files.</p>
        </div>
        <div className="table-panel glass-card">
          <div className="panel-title">
            <strong style={{ fontSize: "0.9rem" }}>Import Students</strong>
            <Upload size={18} />
          </div>
          <div
            className={`import-dropzone ${isDragOver ? "drag-over" : ""}`}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={40} />
            <p><strong>Click to browse</strong> or drag & drop files here</p>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Supports .csv, .xlsx, .xls</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: "none" }}
              onChange={e => e.target.files && handleFiles(e.target.files)}
              multiple
            />
          </div>

          {importResults && (
            <div className={`notice-strip ${importResults.failed === 0 ? "success" : ""}`} style={{ margin: "8px 16px" }}>
              {importResults.failed === 0 ? (
                <><CheckCircle size={16}/> {importResults.success} student(s) imported successfully.</>
              ) : (
                <><AlertCircle size={16}/> {importResults.success} succeeded, {importResults.failed} failed.
                  {importResults.errors.length > 0 && (
                    <ul style={{ margin: "4px 0 0 18px", fontSize: "0.82rem" }}>
                      {importResults.errors.map((e, ei) => <li key={ei}>{e}</li>)}
                    </ul>
                  )}
                </>
              )}
              <button className="tool-button" style={{ marginLeft: 12 }} onClick={() => setImportResults(null)}><X size={14}/></button>
            </div>
          )}

          {importFiles.length > 0 && (
            <div style={{ padding: "12px 16px", display: "grid", gap: 8 }}>
              {importFiles.map((f, fi) => (
                <div key={fi} className="import-file-card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <FileText size={18} style={{ color: "var(--primary)" }} />
                      <div>
                        <strong style={{ fontSize: "0.88rem" }}>{f.name}</strong>
                        <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{(f.size / 1024).toFixed(1)} KB \u00b7 {f.preview.length} records</span>
                      </div>
                    </div>
                    <button className="tool-button" style={{ minHeight: 30, minWidth: 30, padding: 0 }} onClick={() => removeFile(fi)}><X size={14}/></button>
                  </div>
                  {f.preview.length > 0 ? (
                    <div className="table-wrap" style={{ marginTop: 8 }}>
                      <table>
                        <thead><tr>{Object.keys(f.preview[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
                        <tbody>
                          {f.preview.map((row, ri) => (
                            <tr key={ri}>
                              {Object.values(row).map((v, ci) => <td key={ci}>{v}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ padding: 8, fontSize: "0.82rem", color: "var(--muted)" }}>
                      {f.name.endsWith(".csv") ? "No rows parsed." : "XLSX parsing is not supported in-browser. Please use CSV format."}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                    <button
                      className="tool-button primary"
                      disabled={importing || f.preview.length === 0}
                      onClick={async () => {
                        setImporting(true);
                        setImportResults(null);
                        try {
                          const students = f.preview.map((row: Record<string, string>) => {
                            const payload: Record<string, string> = {};
                            for (const [k, v] of Object.entries(row)) {
                              const lk = k.toLowerCase();
                              if (lk.includes("name")) payload.name = v;
                              if (lk.includes("admission") || lk.includes("adm")) payload.admission_number = v;
                              if (lk.includes("class") || lk.includes("grade")) payload.class_name = v;
                              if (lk.includes("gender") || lk.includes("sex")) payload.gender = v;
                              if (lk.includes("stream")) payload.stream_name = v;
                            }
                            return payload as any;
                          });
                          const result = await bulkImportStudents(students);
                          setImportResults({
                            success: result.imported,
                            failed: result.skipped,
                            errors: result.errors.map(e => `Row ${e.row}: ${e.error}`),
                          });
                        } catch (err: any) {
                          setImportResults({ success: 0, failed: f.preview.length, errors: [err.message || "Import failed"] });
                        }
                        setImporting(false);
                      }}
                    >
                      <Upload size={14}/> {importing ? "Importing\u2026" : "Import All"}
                    </button>
                    <button className="tool-button" disabled={importing}>Validate Only</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === "Guardians") {
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Guardians</h2>
          <p>View all registered guardians and their linked students.</p>
        </div>
        <div className="table-panel glass-card">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search guardian name, student, email\u2026" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{filteredGuardians.length} guardians</span>
          </div>
          {guardiansLoading ? (
            <div className="empty-state" style={{ padding: 32 }}>Loading guardians\u2026</div>
          ) : (
            <div id="export-guardians" className="table-wrap">
              <table>
                <thead><tr><th>Guardian Name</th><th>Email</th><th>Phone</th><th>Student</th><th>Relationship</th></tr></thead>
                <tbody>
                  {filteredGuardians.map(g => (
                    <tr key={g.id}>
                      <td><strong>{g.name}</strong></td>
                      <td>{g.email || "\u2014"}</td>
                      <td>{g.phone || "\u2014"}</td>
                      <td>{g.student_name}</td>
                      <td>{g.relationship || "\u2014"}</td>
                    </tr>
                  ))}
                  {filteredGuardians.length === 0 && <tr><td colSpan={5} className="empty-state">No guardians found</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === "Documents") {
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Documents</h2>
          <p>Manage student and school documents.</p>
        </div>
        <div className="table-panel glass-card">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search documents\u2026" /></label>
            <button className="tool-button primary"><Upload size={15}/>Upload Document</button>
          </div>
          <div style={{ padding: 16 }}>
            <div className="empty-state" style={{ padding: 32, textAlign: "center" }}>
              <FileText size={48} style={{ color: "var(--muted)", marginBottom: 12 }} />
              <p style={{ fontSize: "0.9rem", marginBottom: 8 }}>Document management will be available in the next update.</p>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Use Student Profiles to manage student records.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeStudents = data.students.filter(s => s.status === "Active").length;
  return (
    <div className="content-grid">
      <div className="welcome-banner">
        <h2>Front Desk</h2>
        <p>Manage student admissions, profiles, and documents.</p>
      </div>
      <div className="metric-grid">
        <div className="metric teal"><div className="metric-icon"><Users size={22}/></div><div className="metric-body"><strong>{data.students.length}</strong><span>Total Students</span></div></div>
        <div className="metric green"><div className="metric-icon"><UserPlus size={22}/></div><div className="metric-body"><strong>{activeStudents}</strong><span>Active</span></div></div>
        <div className="metric amber"><div className="metric-icon"><FileText size={22}/></div><div className="metric-body"><strong>{data.secretaryDocuments.length}</strong><span>Documents</span></div></div>
        <div className="metric blue"><div className="metric-icon"><Upload size={22}/></div><div className="metric-body"><strong>{data.imports.length}</strong><span>Import Batches</span></div></div>
      </div>
      <div className="glass-card" style={{ padding: 16 }}>
        <p className="eyebrow" style={{ marginBottom: 10 }}>Quick Navigation</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["Dashboard", "Register Student", "Student Profiles", "Student Requirements", "Import Students", "Guardians", "Documents"].map(v => (
            <button key={v} className="tool-button" onClick={() => onViewChange(v)}>{v}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
