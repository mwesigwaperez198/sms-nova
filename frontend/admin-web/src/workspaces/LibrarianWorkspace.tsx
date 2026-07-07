import { useState } from "react";
import { LibraryBig, Upload, BookOpen, Package, AlertCircle, Search, Plus, RotateCcw, FileText, Users } from "lucide-react";
import type { ConnectedData } from "../api";

interface LibrarianWorkspaceProps {
  view: string;
  data: ConnectedData;
  onShareRequestedBooks: () => void;
  roleKey?: string;
}

const CLASSES = ["P4","P5","P6","P7","S1","S2","S3","S4","S5","S6"];

export function LibrarianWorkspace({ view, data, onShareRequestedBooks }: LibrarianWorkspaceProps) {
  const [search, setSearch] = useState("");
  const [issueStudent, setIssueStudent] = useState("");
  const [issueCode, setIssueCode] = useState("");
  const [issueDue, setIssueDue] = useState("");
  const [returnCode, setReturnCode] = useState("");
  const [returnCondition, setReturnCondition] = useState("Good");
  const [selectedBook, setSelectedBook] = useState("");
  const [targetClass, setTargetClass] = useState("");
  const [issueMsg, setIssueMsg] = useState("");
  const [returnMsg, setReturnMsg] = useState("");
  const [distributeMsg, setDistributeMsg] = useState("");
  const [addForm, setAddForm] = useState({ title:"", author:"", subject:"", shelf:"", isbn:"", copies:"1" });

  const books = data.libraryBooks;
  const filtered = books.filter(b =>
    !search || b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.code?.toLowerCase().includes(search.toLowerCase())
  );
  const totalAvailable = books.reduce((s, b) => s + (b.available ?? 0), 0);
  const totalBorrowed = books.reduce((s, b) => s + (b.borrowed ?? 0), 0);
  const pendingRequests = data.requestedBooks.filter(r => r.status === "Pending Approval");

  const handleIssue = () => {
    if (!issueStudent || !issueCode || !issueDue) { setIssueMsg("Fill all fields"); return; }
    setIssueMsg("✓ Book issued successfully");
    setIssueStudent(""); setIssueCode(""); setIssueDue("");
  };

  const handleReturn = () => {
    if (!returnCode) { setReturnMsg("Enter book code"); return; }
    setReturnMsg("✓ Book returned — stock updated");
    setReturnCode(""); setReturnCondition("Good");
  };

  const handleDistribute = () => {
    if (!selectedBook || !targetClass) { setDistributeMsg("Select book and class"); return; }
    setDistributeMsg(`✓ Distributed to ${targetClass}`);
    setSelectedBook(""); setTargetClass("");
  };

  if (view === "Catalog") {
    return (
      <div className="content-grid">
        {/* Metric row */}
        <div className="metric-grid">
          <div className="metric teal">
            <div className="metric-icon"><LibraryBig size={22} /></div>
            <div className="metric-body"><strong>{books.length}</strong><span>Total Titles</span></div>
          </div>
          <div className="metric green">
            <div className="metric-icon"><Package size={22} /></div>
            <div className="metric-body"><strong>{totalAvailable}</strong><span>Available Copies</span></div>
          </div>
          <div className="metric amber">
            <div className="metric-icon"><BookOpen size={22} /></div>
            <div className="metric-body"><strong>{totalBorrowed}</strong><span>Borrowed</span></div>
          </div>
          <div className="metric red">
            <div className="metric-icon"><AlertCircle size={22} /></div>
            <div className="metric-body"><strong>{pendingRequests.length}</strong><span>Requests</span></div>
          </div>
        </div>

        {/* Office layout */}
        <div className="office-layout">
          {/* Left — searchable table */}
          <div className="table-panel">
            <div className="office-filters">
              <label><Search size={15} /><input placeholder="Search title or code…" value={search} onChange={e => setSearch(e.target.value)} /></label>
              <button className="tool-button primary" onClick={() => window.print()}><FileText size={15} />Export PDF</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Code</th><th>Title</th><th>Author</th><th>Shelf</th><th>Available</th><th>Borrowed</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {filtered.map(b => (
                    <tr key={b.code}>
                      <td><code>{b.code}</code></td>
                      <td><strong>{b.title}</strong></td>
                      <td></td>
                      <td>{b.shelf}</td>
                      <td>{b.available}</td>
                      <td>{b.borrowed}</td>
                      <td>
                        <span className={`badge ${b.status === "Available" ? "success" : b.status === "Low Stock" ? "warning" : "error"}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={7} className="empty-state">No books found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right — add book form */}
          <div className="detail-panel">
            <div className="panel-title">
              <div className="panel-title-left">
                <p className="eyebrow">Catalog</p>
                <strong>Add New Book</strong>
              </div>
              <Plus size={18} />
            </div>
            <div className="office-form">
              <label>Title<input placeholder="Book title" value={addForm.title} onChange={e => setAddForm(p => ({...p, title: e.target.value}))} /></label>
              <label>Author<input placeholder="Author name" value={addForm.author} onChange={e => setAddForm(p => ({...p, author: e.target.value}))} /></label>
              <label>Subject<input placeholder="e.g. Mathematics" value={addForm.subject} onChange={e => setAddForm(p => ({...p, subject: e.target.value}))} /></label>
              <label>Shelf<input placeholder="e.g. A-12" value={addForm.shelf} onChange={e => setAddForm(p => ({...p, shelf: e.target.value}))} /></label>
              <label>ISBN<input placeholder="Optional" value={addForm.isbn} onChange={e => setAddForm(p => ({...p, isbn: e.target.value}))} /></label>
              <label>Copies<input type="number" min="1" value={addForm.copies} onChange={e => setAddForm(p => ({...p, copies: e.target.value}))} /></label>
              <button className="tool-button primary" style={{marginTop:4}} onClick={() => setAddForm({title:"",author:"",subject:"",shelf:"",isbn:"",copies:"1"})}>
                <Plus size={15} />Add to Catalog
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Issue & Return") {
    return (
      <div className="office-layout">
        {/* Issue */}
        <div className="detail-panel">
          <div className="panel-title">
            <div className="panel-title-left"><p className="eyebrow">Circulation</p><strong>Issue Book</strong></div>
            <BookOpen size={18} />
          </div>
          <div className="office-form">
            <label>Student ID / Name<input placeholder="Search student…" value={issueStudent} onChange={e => setIssueStudent(e.target.value)} /></label>
            <label>Book Code<input placeholder="Scan or type code" value={issueCode} onChange={e => setIssueCode(e.target.value)} /></label>
            <label>Due Date<input type="date" value={issueDue} onChange={e => setIssueDue(e.target.value)} /></label>
            {issueMsg && <p className={`notice-strip ${issueMsg.startsWith("✓") ? "success" : "error"}`}>{issueMsg}</p>}
            <button className="tool-button primary" onClick={handleIssue}><BookOpen size={15} />Issue Book</button>
          </div>
        </div>

        {/* Return */}
        <div className="detail-panel">
          <div className="panel-title">
            <div className="panel-title-left"><p className="eyebrow">Circulation</p><strong>Return Book</strong></div>
            <RotateCcw size={18} />
          </div>
          <div className="office-form">
            <label>Book Code<input placeholder="Scan or type code" value={returnCode} onChange={e => setReturnCode(e.target.value)} /></label>
            <label>Condition
              <select value={returnCondition} onChange={e => setReturnCondition(e.target.value)}>
                <option>Good</option><option>Damaged</option><option>Lost</option>
              </select>
            </label>
            {returnMsg && <p className={`notice-strip ${returnMsg.startsWith("✓") ? "success" : "error"}`}>{returnMsg}</p>}
            <button className="tool-button primary" onClick={handleReturn}><RotateCcw size={15} />Process Return</button>
          </div>

          {/* Active loans mini-list */}
          <div className="panel-title" style={{marginTop:8}}>
            <strong style={{fontSize:"0.9rem"}}>Active Loans</strong>
          </div>
          <div className="stack-list">
            {books.filter(b => (b.borrowed ?? 0) > 0).slice(0,5).map(b => (
              <div key={b.code} className="list-row">
                <div className="dot" />
                <div><strong style={{fontSize:"0.88rem"}}>{b.title}</strong><br/><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{b.code}</span></div>
                <span className="badge warning">{b.borrowed} out</span>
              </div>
            ))}
            {books.filter(b => (b.borrowed ?? 0) > 0).length === 0 && <p className="empty-state">No active loans</p>}
          </div>
        </div>
      </div>
    );
  }

  if (view === "Book Requests") {
    return (
      <div className="content-grid">
        <div className="panel-title list-panel" style={{borderRadius:8}}>
          <div className="panel-title-left"><p className="eyebrow">Requests</p><strong>Student Book Requests</strong></div>
          <div style={{display:"flex",gap:8}}>
            <span className="badge warning">{pendingRequests.length} Pending</span>
            <button className="tool-button" onClick={onShareRequestedBooks}><Upload size={15} />Forward to Admin</button>
          </div>
        </div>
        <div className="stack-list list-panel">
          {data.requestedBooks.map((r, i) => (
            <div key={i} className="list-row">
              <div className="dot" style={{background: r.status === "Pending Approval" ? "#f59e0b" : "#10b981"}} />
              <div>
                <strong style={{fontSize:"0.9rem"}}>{r.title}</strong>
                <br/><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{r.subject} · {r.requests} requests · {r.requestedBy}</span>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span className={`badge ${r.status === "Pending Approval" ? "warning" : r.status === "Draft" ? "info" : "success"}`}>{r.status}</span>
                {r.status === "Pending Approval" && (
                  <button className="tool-button primary" style={{minHeight:30,fontSize:"0.8rem"}}>Fulfill</button>
                )}
              </div>
            </div>
          ))}
          {data.requestedBooks.length === 0 && <p className="empty-state">No requests</p>}
        </div>
      </div>
    );
  }

  if (view === "Upload to Students") {
    return (
      <div className="office-layout">
        <div className="detail-panel">
          <div className="panel-title">
            <div className="panel-title-left"><p className="eyebrow">Distribution</p><strong>Push Book to Class Library</strong></div>
            <Upload size={18} />
          </div>
          <div className="office-form">
            <label>Select Book
              <select value={selectedBook} onChange={e => setSelectedBook(e.target.value)}>
                <option value="">— choose book —</option>
                {books.map(b => <option key={b.code} value={b.code}>{b.code} — {b.title}</option>)}
              </select>
            </label>
            <label>Target Class
              <select value={targetClass} onChange={e => setTargetClass(e.target.value)}>
                <option value="">— choose class —</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            {distributeMsg && <p className={`notice-strip ${distributeMsg.startsWith("✓") ? "success" : "error"}`}>{distributeMsg}</p>}
            <button className="tool-button primary" onClick={handleDistribute} disabled={!selectedBook || !targetClass}>
              <Upload size={15} />Distribute to Class
            </button>
          </div>
        </div>

        <div className="list-panel">
          <div className="panel-title"><strong style={{fontSize:"0.9rem"}}>Recent Distributions</strong></div>
          <div className="stack-list">
            {[
              {code:"BK-ENG-0045",cls:"P5 Blue",time:"2 hrs ago",ok:true},
              {code:"BK-MAT-0112",cls:"S6 Sciences",time:"Yesterday",ok:true},
              {code:"BK-SCI-0028",cls:"S1 East",time:"Processing",ok:false},
            ].map((d,i) => (
              <div key={i} className="list-row">
                <div className="dot" style={{background: d.ok ? "#10b981" : "#f59e0b"}} />
                <div><strong style={{fontSize:"0.88rem"}}>{d.code}</strong> → {d.cls}<br/><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{d.time}</span></div>
                <span className={`badge ${d.ok ? "success" : "warning"}`}>{d.ok ? "Done" : "Pending"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === "Reports") {
    return (
      <div className="content-grid">
        <div className="metric-grid">
          <div className="metric teal"><div className="metric-icon"><Users size={22}/></div><div className="metric-body"><strong>{books.length}</strong><span>Catalog Titles</span></div></div>
          <div className="metric green"><div className="metric-icon"><Package size={22}/></div><div className="metric-body"><strong>{totalAvailable}</strong><span>Available</span></div></div>
          <div className="metric amber"><div className="metric-icon"><BookOpen size={22}/></div><div className="metric-body"><strong>{totalBorrowed}</strong><span>Borrowed</span></div></div>
          <div className="metric red"><div className="metric-icon"><AlertCircle size={22}/></div><div className="metric-body"><strong>{pendingRequests.length}</strong><span>Pending Requests</span></div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {[["Catalog PDF","Full book catalog export"],["Members PDF","Registered borrowers list"],["Fines PDF","Outstanding fines report"]].map(([title,desc]) => (
            <div key={title} className="detail-panel" style={{padding:20,display:"grid",gap:10}}>
              <FileText size={28} style={{color:"var(--primary)"}} />
              <strong>{title}</strong>
              <span style={{fontSize:"0.82rem",color:"var(--muted)"}}>{desc}</span>
              <button className="tool-button" onClick={() => window.print()}><FileText size={14}/>Export</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default dashboard
  return (
    <div className="content-grid">
      <div className="metric-grid">
        <div className="metric teal"><div className="metric-icon"><LibraryBig size={22}/></div><div className="metric-body"><strong>{books.length}</strong><span>Total Books</span></div></div>
        <div className="metric green"><div className="metric-icon"><Package size={22}/></div><div className="metric-body"><strong>{totalAvailable}</strong><span>Available</span></div></div>
        <div className="metric amber"><div className="metric-icon"><BookOpen size={22}/></div><div className="metric-body"><strong>{totalBorrowed}</strong><span>Borrowed</span></div></div>
        <div className="metric red"><div className="metric-icon"><AlertCircle size={22}/></div><div className="metric-body"><strong>{pendingRequests.length}</strong><span>Requests</span></div></div>
      </div>
      <div className="notice-strip">Select a view from the sidebar — Catalog, Issue &amp; Return, Book Requests, Upload to Students, or Reports.</div>
    </div>
  );
}
