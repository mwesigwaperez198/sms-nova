import { useState, useRef, useCallback, useEffect } from "react";
import { Users, UserPlus, FileText, Upload, Search, Download, X } from "lucide-react";
import type { ConnectedData, GuardianInfo } from "../api";
import { fetchSecretaryGuardianList, createStudent } from "../api";
import { printElement } from "../utils/exportUtils";

interface SecretaryWorkspaceProps {
  view: string;
  data: ConnectedData;
  onViewChange: (view: string) => void;
}

const CLASSES = ["P1","P2","P3","P4","P5","P6","P7","S1","S2","S3","S4","S5","S6"];

const EMPTY_FORM = {
  fullName:"", age:"", sex:"", dob:"", targetClass:"", previousSchool:"",
  parentStatus:"Both Alive", fatherName:"", motherName:"", guardianName:"",
  contact:"", address:"", currentSkills:"", desiredSkills:"", expectations:"",
  guardianSignature:"", declarationDate:""
};

export function SecretaryWorkspace({ view, data, onViewChange }: SecretaryWorkspaceProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitMsg, setSubmitMsg] = useState("");
  const [search, setSearch] = useState("");

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({...p, [k]: e.target.value}));

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.sex || !form.dob || !form.targetClass) {
      setSubmitMsg("Fill all required fields (*)");
      return;
    }
    setSubmitting(true);
    try {
      const admNo = `ADM-${Date.now().toString(36).toUpperCase()}`;
      await createStudent({
        name: form.fullName,
        admission_number: admNo,
        class_name: form.targetClass,
      });
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

  // Fetch real guardian list from API
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

  // ---------- Import Students ----------
  const [importFiles, setImportFiles] = useState<{ name: string; size: number; preview: Record<string, string>[] }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const newFiles: typeof importFiles = [];
    for (const file of Array.from(files)) {
      if (file.name.endsWith(".csv") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        newFiles.push({
          name: file.name,
          size: file.size,
          preview: [
            { "Admission No": "2025-001", "Full Name": "Sample Student", Gender: "Male", Class: "S1" },
            { "Admission No": "2025-002", "Full Name": "Sample Student 2", Gender: "Female", Class: "S2" },
          ],
        });
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

  if (view === "Register Student") {
    return (
      <div className="office-layout">
        <div className="welcome-banner">
          <h2>Front Desk</h2>
          <p>Register students, manage profiles, and handle documents.</p>
        </div>
        <div className="detail-panel glass-card">
          <div className="panel-title">
            <div className="panel-title-left"><p className="eyebrow">Admissions</p><strong>Student Intake Form</strong></div>
            <UserPlus size={18} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="office-form">
              <p className="eyebrow" style={{paddingTop:4}}>Personal Information</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <label>Full Name *<input value={form.fullName} onChange={set("fullName")} placeholder="Full legal name" required /></label>
                <label>Age *<input type="number" min="3" max="25" value={form.age} onChange={set("age")} placeholder="Age" required /></label>
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
                <label>Previous School<input value={form.previousSchool} onChange={set("previousSchool")} placeholder="If any" /></label>
              </div>

              <p className="eyebrow" style={{paddingTop:8}}>Parent / Guardian</p>
              <label>Parent Status *
                <select value={form.parentStatus} onChange={set("parentStatus")}>
                  <option>Both Alive</option>
                  <option>Father Deceased</option>
                  <option>Mother Deceased</option>
                  <option>Both Deceased</option>
                  <option>Guardian Managed</option>
                </select>
              </label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <label>Father's Name<input value={form.fatherName} onChange={set("fatherName")} placeholder="Full name" /></label>
                <label>Mother's Name<input value={form.motherName} onChange={set("motherName")} placeholder="Full name" /></label>
              </div>
              <label>Guardian Name<input value={form.guardianName} onChange={set("guardianName")} placeholder="Guardian full name" required /></label>
              <label>Guardian NIN<input placeholder="National ID number (required)" required /></label>
              <label>Contact Number *<input type="tel" value={form.contact} onChange={set("contact")} placeholder="+256 700 000000" required /></label>
              <label>Living Address *<textarea value={form.address} onChange={set("address")} placeholder="Full address" required /></label>
              <label>Student NIN (if available)<input placeholder="Optional National ID" /></label>
              <label>EMIS Number (if available)<input placeholder="Optional EMIS number" /></label>

              <p className="eyebrow" style={{paddingTop:8}}>Skills &amp; Expectations</p>
              <label>Current Skills<input value={form.currentSkills} onChange={set("currentSkills")} placeholder="e.g. Art, Music, Sports" /></label>
              <label>Desired Skills<input value={form.desiredSkills} onChange={set("desiredSkills")} placeholder="e.g. Coding, Agribusiness" /></label>
              <label>Core Expectations<textarea value={form.expectations} onChange={set("expectations")} placeholder="Student goals and expectations" /></label>

              <p className="eyebrow" style={{paddingTop:8}}>Declaration</p>
              <p style={{fontSize:"0.82rem",color:"var(--muted)",margin:0}}>
                I declare that the information provided is true and accurate.
              </p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <label>Guardian Signature<input value={form.guardianSignature} onChange={set("guardianSignature")} placeholder="Type full name" /></label>
                <label>Date<input type="date" value={form.declarationDate} onChange={set("declarationDate")} /></label>
              </div>

              {submitMsg && <p className={`notice-strip ${submitMsg.startsWith("Admission") ? "success" : "error"}`}>{submitMsg}</p>}
              <div style={{display:"flex",gap:10,paddingTop:4}}>
                <button type="submit" className="tool-button primary" disabled={submitting}><UserPlus size={15}/>{submitting ? "Submitting…" : "Submit Admission"}</button>
                <button type="button" className="tool-button" onClick={() => setForm(EMPTY_FORM)}>Clear</button>
              </div>
            </div>
          </form>
        </div>

        <div className="list-panel glass-card">
          <div className="panel-title"><strong style={{fontSize:"0.9rem"}}>Recent Admissions</strong></div>
          <div className="stack-list">
            {data.students.slice(0,8).map(s => (
              <div key={s.admissionNo} className="list-row">
                <div className="dot" />
                <div>
                  <strong style={{fontSize:"0.88rem"}}>{s.name}</strong>
                  <br/><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{s.admissionNo} · {s.className}</span>
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
        <div className="table-panel glass-card">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search name, admission no, class…" value={search} onChange={e => setSearch(e.target.value)} /></label>
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
                    <td><button className="tool-button" style={{minHeight:30,fontSize:"0.78rem"}} title="Generate PDF"><FileText size={13}/></button></td>
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

  if (view === "Import Students") {
    return (
      <div className="content-grid">
        <div className="table-panel glass-card">
          <div className="panel-title">
            <strong style={{fontSize:"0.9rem"}}>Import Students</strong>
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
            <span style={{fontSize:"0.82rem",color:"var(--muted)"}}>Supports .csv, .xlsx, .xls</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{display:"none"}}
              onChange={e => e.target.files && handleFiles(e.target.files)}
              multiple
            />
          </div>

          {importFiles.length > 0 && (
            <div style={{padding:"12px 16px",display:"grid",gap:8}}>
              {importFiles.map((f, i) => (
                <div key={i} className="import-file-card">
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <FileText size={18} style={{color:"var(--primary)"}} />
                      <div>
                        <strong style={{fontSize:"0.88rem"}}>{f.name}</strong>
                        <br /><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{(f.size / 1024).toFixed(1)} KB · {f.preview.length} records</span>
                      </div>
                    </div>
                    <button className="tool-button" style={{minHeight:30,minWidth:30,padding:0}} onClick={() => removeFile(i)}><X size={14}/></button>
                  </div>
                  <div className="table-wrap" style={{marginTop:8}}>
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
                  <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
                    <button className="tool-button primary"><Upload size={14}/> Import All</button>
                    <button className="tool-button">Validate Only</button>
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
        <div className="table-panel glass-card">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search guardian name, student, email…" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <span style={{fontSize:"0.82rem",color:"var(--muted)"}}>{filteredGuardians.length} guardians</span>
          </div>
          {guardiansLoading ? (
            <div className="empty-state" style={{padding:32}}>Loading guardians…</div>
          ) : (
            <div id="export-guardians" className="table-wrap">
              <table>
                <thead><tr><th>Guardian Name</th><th>Email</th><th>Phone</th><th>Student</th><th>Relationship</th></tr></thead>
                <tbody>
                  {filteredGuardians.map(g => (
                    <tr key={g.id}>
                      <td><strong>{g.name}</strong></td>
                      <td>{g.email || "—"}</td>
                      <td>{g.phone || "—"}</td>
                      <td>{g.student_name}</td>
                      <td>{g.relationship || "—"}</td>
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
        <div className="table-panel glass-card">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search documents…" /></label>
            <button className="tool-button primary"><Upload size={15}/>Upload Document</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14,padding:16}}>
            {data.secretaryDocuments.map(doc => (
              <div key={doc.id} className="detail-panel glass-card" style={{padding:16,display:"grid",gap:8}}>
                <FileText size={28} style={{color:"var(--primary)"}} />
                <strong style={{fontSize:"0.9rem"}}>{doc.title}</strong>
                <span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{doc.type?.toUpperCase()} · {doc.date}</span>
                {doc.student && <span style={{fontSize:"0.78rem",color:"var(--muted)"}}>Student: {doc.student}</span>}
                <button className="tool-button" style={{marginTop:4}}><Download size={14}/>Download</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-grid">
      <div className="metric-grid">
        <div className="metric teal"><div className="metric-icon"><Users size={22}/></div><div className="metric-body"><strong>{data.students.length}</strong><span>Total Students</span></div></div>
        <div className="metric green"><div className="metric-icon"><UserPlus size={22}/></div><div className="metric-body"><strong>{data.students.filter(s=>s.status==="Active").length}</strong><span>Active</span></div></div>
        <div className="metric amber"><div className="metric-icon"><FileText size={22}/></div><div className="metric-body"><strong>{data.secretaryDocuments.length}</strong><span>Documents</span></div></div>
        <div className="metric blue"><div className="metric-icon"><Upload size={22}/></div><div className="metric-body"><strong>{data.imports.length}</strong><span>Import Batches</span></div></div>
      </div>
      <div className="notice-strip">Select a view — Register Student, Student Profiles, Import Students, Guardians, or Documents.</div>
    </div>
  );
}
