import { useState, useEffect } from "react";
import { LibraryBig, Upload, BookOpen, Package, AlertCircle, Search, Plus, RotateCcw, FileText, Users } from "lucide-react";
import type { ConnectedData } from "../api";
import { fetchLibrarianActiveBorrows, fetchLibrarianOverdue, issueBook, returnBook, addLibraryBook, submitBookRequest } from "../api";
import { printElement } from "../utils/exportUtils";

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
  const [issueStudentId, setIssueStudentId] = useState<number | null>(null);
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
  const [requestForm, setRequestForm] = useState({ title:"", author:"", subject:"", reason:"" });
  const [requestMsg, setRequestMsg] = useState("");
  const [activeBorrows, setActiveBorrows] = useState<any[]>([]);
  const [overdueBooks, setOverdueBooks] = useState<{ title:string; borrower_name:string; due_date:string; daysOverdue:number }[]>([]);
  const [issueLoading, setIssueLoading] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [addBookMsg, setAddBookMsg] = useState("");
  const [addBookLoading, setAddBookLoading] = useState(false);

  useEffect(() => {
    fetchLibrarianActiveBorrows().then(setActiveBorrows).catch(() => {});
    fetchLibrarianOverdue().then((rows) => {
      const today = new Date();
      setOverdueBooks(rows.map((r: any) => {
        const due = new Date(r.due_date);
        const diff = Math.ceil((today.getTime() - due.getTime()) / 86400000);
        return { title: r.book_title, borrower_name: r.borrower_name, due_date: r.due_date?.split("T")[0] ?? "", daysOverdue: diff > 0 ? diff : 0 };
      }));
    }).catch(() => {});
  }, []);

  const overdueCount = overdueBooks.length;
  const books = data.libraryBooks;
  const filtered = books.filter(b =>
    !search || b.title.toLowerCase().includes(search.toLowerCase()) || b.code.toLowerCase().includes(search.toLowerCase())
  );
  const totalAvailable = books.reduce((sum, b) => sum + (b.available || 0), 0);
  const totalBorrowed = books.reduce((sum, b) => sum + (b.borrowed || 0), 0);
  const pendingRequests = data.requestedBooks.filter(r => r.status === "Pending" || r.status === "pending");

  const handleIssueStudentSearch = (val: string) => {
    setIssueStudent(val);
    setIssueStudentId(null);
    if (val.length < 2) return;
    const match = data.students.find(s =>
      s.name?.toLowerCase().includes(val.toLowerCase()) ||
      s.admissionNo?.toLowerCase().includes(val.toLowerCase())
    );
    if (match && match.userId) setIssueStudentId(match.userId);
  };

  const handleIssue = async () => {
    if (!issueStudentId || !issueCode || !issueDue) { setIssueMsg("Fill all fields (student must have a user account)"); return; }
    setIssueLoading(true);
    try {
      await issueBook({
        book_id: Number(issueCode),
        borrower_id: issueStudentId,
        due_date: new Date(issueDue).toISOString(),
      });
      setIssueMsg("✓ Book issued successfully");
      setIssueStudent(""); setIssueCode(""); setIssueDue(""); setIssueStudentId(null);
      const fresh = await fetchLibrarianActiveBorrows();
      setActiveBorrows(fresh);
    } catch (err: any) {
      setIssueMsg(err?.message || "Failed to issue book");
    } finally {
      setIssueLoading(false);
      setTimeout(() => setIssueMsg(""), 4000);
    }
  };

  const handleReturn = async () => {
    if (!returnCode) { setReturnMsg("Enter borrow ID"); return; }
    setReturnLoading(true);
    try {
      await returnBook(Number(returnCode));
      setReturnMsg("✓ Book returned — stock updated");
      setReturnCode(""); setReturnCondition("Good");
      const fresh = await fetchLibrarianActiveBorrows();
      setActiveBorrows(fresh);
    } catch (err: any) {
      setReturnMsg(err?.message || "Failed to return book");
    } finally {
      setReturnLoading(false);
      setTimeout(() => setReturnMsg(""), 4000);
    }
  };

  const handleAddBook = async () => {
    if (!addForm.title) { setAddBookMsg("Title is required"); return; }
    setAddBookLoading(true);
    try {
      await addLibraryBook({
        title: addForm.title,
        author: addForm.author || undefined,
        isbn: addForm.isbn || undefined,
        shelf_location: addForm.shelf || undefined,
        total_copies: Number(addForm.copies) || 1,
        available_copies: Number(addForm.copies) || 1,
        subject_area: addForm.subject || undefined,
      });
      setAddBookMsg("✓ Book added to catalog");
      setAddForm({ title:"", author:"", subject:"", shelf:"", isbn:"", copies:"1" });
    } catch (err: any) {
      setAddBookMsg(err?.message || "Failed to add book");
    } finally {
      setAddBookLoading(false);
      setTimeout(() => setAddBookMsg(""), 4000);
    }
  };

  const handleRequest = async () => {
    if (!requestForm.title) { setRequestMsg("Title is required"); return; }
    try {
      await submitBookRequest({
        title: requestForm.title,
        subject: requestForm.author || undefined,
        reason: requestForm.reason || undefined,
      });
      setRequestMsg("✓ Request submitted for approval");
      setRequestForm({ title:"", author:"", subject:"", reason:"" });
    } catch (err: any) {
      setRequestMsg(err?.message || "Failed to submit request");
    } finally {
      setTimeout(() => setRequestMsg(""), 4000);
    }
  };

  const handleDistribute = () => {
    if (!selectedBook || !targetClass) { setDistributeMsg("Select book and class"); return; }
    setDistributeMsg(`✓ Distributed to ${targetClass}`);
    setSelectedBook(""); setTargetClass("");
  };

  if (view === "Catalog") {
    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Library Management</h2>
          <p>Manage book catalog, issue/return, and track library resources.</p>
        </div>
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
          <div className="table-panel glass-card">
            <div className="office-filters">
              <label><Search size={15} /><input placeholder="Search title or code…" value={search} onChange={e => setSearch(e.target.value)} /></label>
              <button className="tool-button primary" onClick={() => printElement("export-library-catalog")}><FileText size={15} />Export PDF</button>
            </div>
            <div id="export-library-catalog" className="table-wrap">
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
          <div className="detail-panel glass-card">
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
              {addBookMsg && <p className={`notice-strip ${addBookMsg.startsWith("✓") ? "success" : "error"}`}>{addBookMsg}</p>}
              <button className="tool-button primary" style={{marginTop:4}} onClick={handleAddBook} disabled={addBookLoading}>
                <Plus size={15} />{addBookLoading ? "Adding…" : "Add to Catalog"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Issue & Return") {
    return (
      <div style={{display:"grid",gap:14}}>
        {overdueCount > 0 && (
          <div className="notice-strip" style={{background:"#fee2e2",color:"#b91c1c",display:"flex",alignItems:"center",gap:8}}>
            <AlertCircle size={16} />{overdueCount} overdue {overdueCount === 1 ? "book" : "books"} — notify borrowers
          </div>
        )}
        <div className="office-layout">
          {/* Issue */}
          <div className="detail-panel glass-card">
            <div className="panel-title">
              <div className="panel-title-left"><p className="eyebrow">Circulation</p><strong>Issue Book</strong></div>
              <BookOpen size={18} />
            </div>
            <div className="office-form">
              <label>Student Name / Admission No
                <input placeholder="Search student…" value={issueStudent} onChange={e => handleIssueStudentSearch(e.target.value)} />
                {issueStudentId && <span style={{fontSize:"0.75rem",color:"#10b981",marginTop:2,display:"block"}}>✓ Student found (user #{issueStudentId})</span>}
              </label>
              <label>Book Code (ID)<input placeholder="Enter book ID from catalog" value={issueCode} onChange={e => setIssueCode(e.target.value)} /></label>
              <label>Due Date<input type="date" value={issueDue} onChange={e => setIssueDue(e.target.value)} /></label>
              {issueMsg && <p className={`notice-strip ${issueMsg.startsWith("✓") ? "success" : "error"}`}>{issueMsg}</p>}
              <button className="tool-button primary" onClick={handleIssue} disabled={issueLoading}><BookOpen size={15} />{issueLoading ? "Issuing…" : "Issue Book"}</button>
            </div>
          </div>

          {/* Return */}
          <div className="detail-panel glass-card">
            <div className="panel-title">
              <div className="panel-title-left"><p className="eyebrow">Circulation</p><strong>Return Book</strong></div>
              <RotateCcw size={18} />
            </div>
            <div className="office-form">
              <label>Borrow ID<input placeholder="Enter borrow record ID" value={returnCode} onChange={e => setReturnCode(e.target.value)} /></label>
              <label>Condition
                <select value={returnCondition} onChange={e => setReturnCondition(e.target.value)}>
                  <option>Good</option><option>Damaged</option><option>Lost</option>
                </select>
              </label>
              {returnMsg && <p className={`notice-strip ${returnMsg.startsWith("✓") ? "success" : "error"}`}>{returnMsg}</p>}
              <button className="tool-button primary" onClick={handleReturn} disabled={returnLoading}><RotateCcw size={15} />{returnLoading ? "Processing…" : "Process Return"}</button>
            </div>

            {/* Active loans mini-list */}
            <div className="panel-title" style={{marginTop:8}}>
              <strong style={{fontSize:"0.9rem"}}>Active Loans</strong>
            </div>
            <div className="stack-list">
              {activeBorrows.slice(0,5).map((b) => (
                <div key={b.id} className="list-row">
                  <div className="dot" />
                  <div><strong style={{fontSize:"0.88rem"}}>{b.book_title}</strong><br/><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{b.borrower_name} · due {b.due_date}</span></div>
                  <span className="badge warning">{b.status}</span>
                </div>
              ))}
              {activeBorrows.length === 0 && <p className="empty-state">No active loans</p>}
            </div>
          </div>
        </div>

        {/* Overdue table */}
        <div className="list-panel glass-card">
          <div className="panel-title">
            <strong style={{fontSize:"0.9rem"}}>Overdue Books</strong>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Title</th><th>Borrower</th><th>Due Date</th><th>Overdue</th><th>Action</th></tr>
              </thead>
              <tbody>
                {overdueBooks.map((o, i) => (
                  <tr key={i}>
                    <td>{o.title}</td>
                    <td>{o.borrower_name}</td>
                    <td>{o.due_date}</td>
                    <td><span className="badge error">{o.daysOverdue} days</span></td>
                    <td><button className="tool-button" style={{minHeight:26,fontSize:"0.78rem"}}>Notify</button></td>
                  </tr>
                ))}
                {overdueBooks.length === 0 && <tr><td colSpan={5} className="empty-state">No overdue books</td></tr>}
              </tbody>
            </table>
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

        <div className="detail-panel glass-card">
          <div className="panel-title">
            <div className="panel-title-left"><p className="eyebrow">New</p><strong>Add Book Request</strong></div>
            <Plus size={18} />
          </div>
          <div className="office-form">
            <label>Book Title<input placeholder="Enter book title" value={requestForm.title} onChange={e => setRequestForm(p => ({...p, title: e.target.value}))} /></label>
            <label>Author<input placeholder="Author name" value={requestForm.author} onChange={e => setRequestForm(p => ({...p, author: e.target.value}))} /></label>
            <label>Subject<input placeholder="e.g. Mathematics" value={requestForm.subject} onChange={e => setRequestForm(p => ({...p, subject: e.target.value}))} /></label>
            <label>Reason<textarea placeholder="Why is this book needed?" rows={3} value={requestForm.reason} onChange={e => setRequestForm(p => ({...p, reason: e.target.value}))} /></label>
            {requestMsg && <p className={`notice-strip ${requestMsg.startsWith("✓") ? "success" : "error"}`}>{requestMsg}</p>}
            <button className="tool-button primary" onClick={handleRequest}><Plus size={15} />Submit Request</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Upload to Students") {
    return (
      <div className="office-layout">
        <div className="detail-panel glass-card">
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

        <div className="list-panel glass-card">
          <div className="panel-title"><strong style={{fontSize:"0.9rem"}}>Recent Distributions</strong></div>
          <div className="stack-list">
            {activeBorrows.length > 0 ? activeBorrows.slice(0, 5).map((b: any, i: number) => (
              <div key={i} className="list-row">
                <div className="dot" />
                <div><strong style={{fontSize:"0.88rem"}}>{b.book_title || `Book #${b.book_id}`}</strong> → {b.borrower_name || "Student"}<br/><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>Due: {b.due_date?.split("T")[0] ?? "—"}</span></div>
                <span className="badge info">Active</span>
              </div>
            )) : (
              <div className="empty-state" style={{padding:24}}>No recent distributions</div>
            )}
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
            <div key={title} className="detail-panel glass-card" style={{padding:20,display:"grid",gap:10}}>
              <FileText size={28} style={{color:"var(--primary)"}} />
              <strong>{title}</strong>
              <span style={{fontSize:"0.82rem",color:"var(--muted)"}}>{desc}</span>
              <button className="tool-button" onClick={() => printElement("export-" + title.toLowerCase().replace(/\s+/g, "-"))}><FileText size={14}/>Export</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default dashboard
  return (
    <div className="content-grid">
      {overdueCount > 0 && (
        <div className="notice-strip" style={{background:"#fee2e2",color:"#b91c1c",display:"flex",alignItems:"center",gap:8}}>
          <AlertCircle size={16} />{overdueCount} overdue {overdueCount === 1 ? "book" : "books"} — check Issue &amp; Return
        </div>
      )}
      <div className="metric-grid">
        <div className="metric teal"><div className="metric-icon"><LibraryBig size={22}/></div><div className="metric-body"><strong>{books.length}</strong><span>Total Books</span></div></div>
        <div className="metric green"><div className="metric-icon"><Package size={22}/></div><div className="metric-body"><strong>{totalAvailable}</strong><span>Available</span></div></div>
        <div className="metric amber"><div className="metric-icon"><BookOpen size={22}/></div><div className="metric-body"><strong>{totalBorrowed}</strong><span>Borrowed</span></div></div>
        <div className="metric red"><div className="metric-icon"><AlertCircle size={22}/></div><div className="metric-body"><strong>{pendingRequests.length}</strong><span>Requests</span></div></div>
      </div>
      <div className="notice-strip" style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between"}}>
        <span>Select a view from the sidebar — Catalog, Issue &amp; Return, Book Requests, Upload to Students, or Reports.</span>
      </div>
    </div>
  );
}
