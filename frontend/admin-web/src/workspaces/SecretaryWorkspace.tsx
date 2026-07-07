import { useState } from "react";
import { Users, UserPlus, FileText, Upload, Search, Download } from "lucide-react";
import type { ConnectedData } from "../api";

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.sex || !form.dob || !form.targetClass) {
      setSubmitMsg("Fill all required fields (*)");
      return;
    }
    setSubmitMsg("✓ Admission submitted successfully!");
    setForm(EMPTY_FORM);
    setTimeout(() => setSubmitMsg(""), 4000);
  };

  const filteredStudents = data.students.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.admissionNo?.toLowerCase().includes(search.toLowerCase()) ||
    s.className?.toLowerCase().includes(search.toLowerCase())
  );

  if (view === "Register Student") {
    return (
      <div className="office-layout">
        {/* Left — form */}
        <div className="detail-panel">
          <div className="panel-title">
            <div className="panel-title-left"><p className="eyebrow">Admissions</p><strong>Student Intake Form</strong></div>
            <UserPlus size={18} />
          </div>
          <form onSubmit={handleSubmit}>
            {/* Personal */}
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
              <label>Guardian Name (if applicable)<input value={form.guardianName} onChange={set("guardianName")} placeholder="Guardian full name" /></label>
              <label>Contact Number *<input type="tel" value={form.contact} onChange={set("contact")} placeholder="+256 700 000000" required /></label>
              <label>Living Address *<textarea value={form.address} onChange={set("address")} placeholder="Full address" required /></label>

              <p className="eyebrow" style={{paddingTop:8}}>Skills &amp; Expectations</p>
              <label>Current Skills<input value={form.currentSkills} onChange={set("currentSkills")} placeholder="e.g. Art, Music, Sports" /></label>
              <label>Desired Skills<input value={form.desiredSkills} onChange={set("desiredSkills")} placeholder="e.g. Coding, Agribusiness" /></label>
              <label>Core Expectations<textarea value={form.expectations} onChange={set("expectations")} placeholder="Student goals and expectations" /></label>

              <p className="eyebrow" style={{paddingTop:8}}>Declaration</p>
              <p style={{fontSize:"0.82rem",color:"var(--muted)",margin:0}}>
                I declare that the information provided is true and accurate. False information may lead to rejection or dismissal.
              </p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <label>Guardian Signature<input value={form.guardianSignature} onChange={set("guardianSignature")} placeholder="Type full name" /></label>
                <label>Date<input type="date" value={form.declarationDate} onChange={set("declarationDate")} /></label>
              </div>

              {submitMsg && <p className={`notice-strip ${submitMsg.startsWith("✓") ? "success" : "error"}`}>{submitMsg}</p>}
              <div style={{display:"flex",gap:10,paddingTop:4}}>
                <button type="submit" className="tool-button primary"><UserPlus size={15}/>Submit Admission</button>
                <button type="button" className="tool-button" onClick={() => setForm(EMPTY_FORM)}>Clear</button>
              </div>
            </div>
          </form>
        </div>

        {/* Right — recent admissions */}
        <div className="list-panel">
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

  if (view === "Student Profiles" || view === "Import Students" || view === "Guardians") {
    return (
      <div className="content-grid">
        <div className="table-panel">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search name, admission no, class…" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <button className="tool-button primary" onClick={() => onViewChange("Register Student")}><UserPlus size={15}/>New Admission</button>
            <button className="tool-button" onClick={() => window.print()}><FileText size={15}/>Export</button>
          </div>
          <div className="table-wrap">
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

  if (view === "Documents") {
    return (
      <div className="content-grid">
        <div className="table-panel">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search documents…" /></label>
            <button className="tool-button primary"><Upload size={15}/>Upload Document</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14,padding:16}}>
            {data.secretaryDocuments.map(doc => (
              <div key={doc.id} className="detail-panel" style={{padding:16,display:"grid",gap:8}}>
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
