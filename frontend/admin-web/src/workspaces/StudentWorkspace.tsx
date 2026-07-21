import { useState, useRef, useEffect } from "react";
import { GraduationCap, BookOpen, LibraryBig, Camera, Download, ExternalLink, Calendar, FileText, Bell, Loader2 } from "lucide-react";
import type { ConnectedData } from "../api";
import { fetchStudentSelfData, apiRequest, downloadReportCardPDF } from "../api";
import { downloadElement } from "../utils/exportUtils";
import type { StudentSelfData } from "../types";

interface StudentWorkspaceProps {
  view: string;
  data: ConnectedData;
  session: { user: { full_name: string; school: string } };
}

const TILES = [
  { key: "Dashboard", icon: GraduationCap, label: "Dashboard" },
  { key: "My Fees", icon: FileText, label: "My Fees" },
  { key: "Attendance", icon: Calendar, label: "Attendance" },
  { key: "Report Card", icon: FileText, label: "Report Card" },
  { key: "Library", icon: LibraryBig, label: "Library" },
  { key: "Announcements", icon: Bell, label: "Announcements" },
];

function parseFeeAmount(amt: string): number {
  if (!amt) return 0;
  const num = Number(amt.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? 0 : num;
}

export function StudentWorkspace({ view, data, session }: StudentWorkspaceProps) {
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [libTab, setLibTab] = useState<"library" | "online" | "skills">("library");
  const [biometricPhoto, setBiometricPhoto] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [studentData, setStudentData] = useState<StudentSelfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchStudentSelfData()
      .then(d => { if (mounted) setStudentData(d); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const studentName = studentData?.student_name ?? session.user.full_name;
  const admNo = studentData?.admission_number ?? "—";
  const className = studentData?.class_name ?? "—";
  const schoolName = studentData?.school_name ?? session.user.school;

  const fees = studentData?.fees ?? [];
  const attendance = studentData?.attendance ?? [];
  const assessments = studentData?.assessments ?? [];
  const reportCards = studentData?.report_cards ?? [];
  const notifications = studentData?.notifications ?? [];

  const totalInvoiced = fees.reduce((sum, f) => sum + parseFeeAmount(f.amount), 0);
  const totalPaid = fees.reduce((sum, f) => sum + parseFeeAmount(f.paid_amount), 0);
  const totalBalance = totalInvoiced - totalPaid;

  const presentCount = attendance.filter(a => a.status === "Present").length;
  const lateCount = attendance.filter(a => a.status === "Late").length;
  const absentCount = attendance.filter(a => a.status === "Absent").length;
  const attendancePct = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;

  const libraryBooks = data.studentLibraryBooks?.filter(b => b.source === "library") ?? [];
  const onlineBooks = data.studentLibraryBooks?.filter(b => b.source === "online") ?? [];

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert("Camera access denied. Enable camera permissions.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    setBiometricPhoto(c.toDataURL("image/jpeg", 0.8));
    stopCamera();
  };

  const stopCamera = () => {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
  };

  const handleUploadPhoto = async () => {
    if (!biometricPhoto || !studentData?.student_id) return;
    setUploading(true);
    try {
      await apiRequest(`/api/v1/students/${studentData.student_id}/photo`, {
        method: "POST",
        body: JSON.stringify({ photo_data: biometricPhoto }),
      });
      alert("Profile photo uploaded successfully!");
    } catch {
      alert("Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => () => stopCamera(), []);

  if (loading) {
    return (
      <div className="content-grid" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <Loader2 size={24} className="spin" style={{ color: "var(--muted)" }} />
        <span style={{ marginLeft: 8, color: "var(--muted)" }}>Loading your data...</span>
      </div>
    );
  }

  if (view === "Dashboard") {
    const renderTileContent = () => {
      switch (selectedTile) {
        case "My Fees":
          return (
            <>
              <div className="metric-grid">
                <div className="metric amber"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>UGX {totalInvoiced.toLocaleString()}</strong><span>Total Invoiced</span></div></div>
                <div className="metric green"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>UGX {totalPaid.toLocaleString()}</strong><span>Paid</span></div></div>
                <div className="metric red"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>UGX {totalBalance.toLocaleString()}</strong><span>Balance</span></div></div>
                <div className="metric blue"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{fees.length}</strong><span>Invoices</span></div></div>
              </div>
              <div className="table-panel glass-card">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Description</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Due</th></tr></thead>
                    <tbody>
                      {fees.map(f => {
                        const amt = parseFeeAmount(f.amount);
                        const paid = parseFeeAmount(f.paid_amount);
                        return (
                          <tr key={f.id}>
                            <td><strong>{f.description || f.category_name || "Fee"}</strong></td>
                            <td>{f.amount}</td>
                            <td>{f.paid_amount}</td>
                            <td>UGX {(amt - paid).toLocaleString()}</td>
                            <td><span className={`badge ${f.status === "paid" ? "success" : f.status === "partial" ? "warning" : "error"}`}>{f.status}</span></td>
                            <td>{f.due_date}</td>
                          </tr>
                        );
                      })}
                      {fees.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "24px 0" }}>No fee records yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          );

        case "Attendance":
          return (
            <>
              <div className="metric-grid">
                <div className="metric green"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{attendance.length > 0 ? attendance[0].status : "—"}</strong><span>Today</span></div></div>
                <div className="metric teal"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{attendancePct}%</strong><span>This Term</span></div></div>
                <div className="metric amber"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{lateCount}</strong><span>Late Days</span></div></div>
                <div className="metric red"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{absentCount}</strong><span>Absent Days</span></div></div>
              </div>
              <div className="stack-list list-panel">
                {attendance.map((a, i) => (
                  <div key={i} className="list-row">
                    <div className="dot" style={{ background: a.status === "Present" ? "#10b981" : a.status === "Late" ? "#f59e0b" : "#ef4444" }} />
                    <div>
                      <strong style={{ fontSize: "0.9rem" }}>{a.date}</strong>
                      {a.remarks && <br />}
                      {a.remarks && <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{a.remarks}</span>}
                    </div>
                    <span className={`badge ${a.status === "Present" ? "success" : a.status === "Late" ? "warning" : "error"}`}>{a.status}</span>
                  </div>
                ))}
                {attendance.length === 0 && <p className="empty-state">No attendance records yet</p>}
              </div>
            </>
          );

        case "Report Card":
          return (
            <>
              <div className="table-panel glass-card">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Subject</th><th>Score</th><th>Grade</th><th>Term</th><th>Year</th></tr></thead>
                    <tbody>
                      {reportCards.map(r => (
                        <tr key={r.id}>
                          <td><strong>{r.subject}</strong></td>
                          <td>{r.score}</td>
                          <td><span className="badge info">{r.grade}</span></td>
                          <td>{r.term}</td>
                          <td>{r.academic_year}</td>
                        </tr>
                      ))}
                      {reportCards.length === 0 && (
                        <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: "24px 0" }}>No report card data yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          );

        case "Library":
          return (
            <>
              <div className="metric-grid">
                <div className="metric teal"><div className="metric-icon"><BookOpen size={22} /></div><div className="metric-body"><strong>{libraryBooks.length}</strong><span>Available</span></div></div>
                <div className="metric green"><div className="metric-icon"><Download size={22} /></div><div className="metric-body"><strong>{libraryBooks.filter(b => b.hasDigital).length}</strong><span>Digital</span></div></div>
                <div className="metric blue"><div className="metric-icon"><LibraryBig size={22} /></div><div className="metric-body"><strong>{onlineBooks.length}</strong><span>Online</span></div></div>
              </div>
              <div className="book-grid-cards">
                {libraryBooks.map(b => (
                  <div key={b.code} className="book-card-item">
                    <div className="book-cover-emoji">{b.coverEmoji}</div>
                    <div className="book-card-title">{b.title}</div>
                    <div className="book-card-author">{b.author}</div>
                    <span className="badge info" style={{ fontSize: "0.72rem" }}>{b.subject}</span>
                    <div style={{ marginTop: 8 }}>
                      {b.hasDigital
                        ? <button className="tool-button primary" style={{ width: "100%", minHeight: 32 }}><Download size={13} />Access</button>
                        : <span className="badge muted">Physical Only</span>}
                    </div>
                  </div>
                ))}
                {libraryBooks.length === 0 && <p className="empty-state">No books pushed to your library yet</p>}
              </div>
            </>
          );

        case "Announcements":
          return (
            <div className="stack-list list-panel">
              {notifications.map(n => (
                <div key={n.id} className="list-row">
                  <div className="dot" style={{ background: n.status === "read" ? "var(--muted)" : "#4fc3f7" }} />
                  <div>
                    <strong style={{ fontSize: "0.9rem" }}>{n.title}</strong>
                    <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{n.type} · {n.created_at ? new Date(n.created_at).toLocaleDateString() : ""}</span>
                    <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#e2e8f0" }}>{n.message}</p>
                  </div>
                  <span className={`badge ${n.status === "read" ? "muted" : "info"}`}>{n.status === "read" ? "Read" : "New"}</span>
                </div>
              ))}
              {notifications.length === 0 && <p className="empty-state">No announcements</p>}
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div className="content-grid">
        <div className="student-hero-grad">
          <div className="student-avatar-lg">{studentName.charAt(0)}</div>
          <div>
            <strong style={{ fontSize: "1.2rem" }}>{studentName}</strong>
            <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: "0.9rem" }}>{className} · {admNo}</p>
            <p style={{ margin: "4px 0 0", opacity: 0.75, fontSize: "0.82rem" }}>{schoolName}</p>
          </div>
        </div>

        <div className="metric-grid">
          <div className="metric teal"><div className="metric-icon"><BookOpen size={22} /></div><div className="metric-body"><strong>{libraryBooks.length}</strong><span>Library Books</span></div></div>
          <div className="metric green"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{attendance.length > 0 ? attendance[0].status : "—"}</strong><span>Today</span></div></div>
          <div className="metric blue"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{reportCards.length > 0 ? reportCards[0].grade : "—"}</strong><span>Last Grade</span></div></div>
          <div className="metric amber"><div className="metric-icon"><Bell size={22} /></div><div className="metric-body"><strong>{notifications.filter(m => m.status !== "read").length}</strong><span>Announcements</span></div></div>
        </div>

        {!selectedTile ? (
          <div>
            <div className="student-hero-grad" style={{ minHeight: 0, padding: "12px 16px", borderRadius: "8px 8px 0 0" }}>
              <strong style={{ fontSize: "0.9rem" }}>Quick Navigation</strong>
            </div>
            <div className="student-grid">
              {TILES.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.key} className="student-tile"
                    onClick={() => t.key === "Dashboard" ? setSelectedTile(null) : setSelectedTile(t.key)}>
                    <Icon size={22} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <button className="tool-button" style={{ marginBottom: 12 }} onClick={() => setSelectedTile(null)}>
              ← Back to Dashboard
            </button>
            {renderTileContent()}
          </div>
        )}
      </div>
    );
  }

  if (view === "Library") {
    return (
      <div className="content-grid">
        <div className="tab-bar">
          <button className={`tab-btn ${libTab === "library" ? "active" : ""}`} onClick={() => setLibTab("library")}><BookOpen size={15} />School Library</button>
          <button className={`tab-btn ${libTab === "online" ? "active" : ""}`} onClick={() => setLibTab("online")}><ExternalLink size={15} />Online Hub</button>
        </div>

        {libTab === "library" && (
          <div className="content-grid">
            <div className="metric-grid">
              <div className="metric teal"><div className="metric-icon"><BookOpen size={22} /></div><div className="metric-body"><strong>{libraryBooks.length}</strong><span>Available</span></div></div>
              <div className="metric green"><div className="metric-icon"><Download size={22} /></div><div className="metric-body"><strong>{libraryBooks.filter(b => b.hasDigital).length}</strong><span>Digital</span></div></div>
            </div>
            <div className="book-grid-cards">
              {libraryBooks.map(b => (
                <div key={b.code} className="book-card-item">
                  <div className="book-cover-emoji">{b.coverEmoji}</div>
                  <div className="book-card-title">{b.title}</div>
                  <div className="book-card-author">{b.author}</div>
                  <span className="badge info" style={{ fontSize: "0.72rem" }}>{b.subject}</span>
                  <div style={{ marginTop: 8 }}>
                    {b.hasDigital
                      ? <button className="tool-button primary" style={{ width: "100%", minHeight: 32 }}><Download size={13} />Access</button>
                      : <span className="badge muted">Physical Only</span>}
                  </div>
                </div>
              ))}
              {libraryBooks.length === 0 && <p className="empty-state">No books pushed to your library yet</p>}
            </div>
          </div>
        )}

        {libTab === "online" && (
          <div className="content-grid">
            <div className="notice-strip">Online resources, UNEB past papers, Khan Academy, BBC Bitesize and more.</div>
            <div className="book-grid-cards">
              {onlineBooks.map(b => (
                <div key={b.code} className="book-card-item">
                  <div className="book-cover-emoji">{b.coverEmoji}</div>
                  <div className="book-card-title">{b.title}</div>
                  <div className="book-card-author">{b.author}</div>
                  <span className="badge purple" style={{ fontSize: "0.72rem" }}>{b.subject}</span>
                  <div style={{ marginTop: 8 }}>
                    <button className="tool-button primary" style={{ width: "100%", minHeight: 32 }}><ExternalLink size={13} />Open</button>
                  </div>
                </div>
              ))}
              {onlineBooks.length === 0 && <p className="empty-state">No online resources available</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === "Report Card") {
    return (
      <div className="content-grid">
        <div className="student-hero-grad">
          <div className="student-avatar-lg">{studentName.charAt(0)}</div>
          <div>
            <strong style={{ fontSize: "1.1rem" }}>{studentName}</strong>
            <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: "0.88rem" }}>{className} · {reportCards.length > 0 ? `${reportCards[0].term}, ${reportCards[0].academic_year}` : "Term 1, 2026"}</p>
          </div>
          <button className="tool-button" style={{ marginLeft: "auto", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff" }} onClick={async () => {
            if (reportCards.length > 0 && reportCards[0].id) {
              try { await downloadReportCardPDF(reportCards[0].id); } catch { downloadElement("export-report-card", studentName.replace(/\s+/g, "-") + "-report-card.html"); }
            } else {
              downloadElement("export-report-card", studentName.replace(/\s+/g, "-") + "-report-card.html");
            }
          }}>
            <Download size={15} />Download PDF
          </button>
        </div>
        <div id="export-report-card" className="table-panel glass-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Subject</th><th>Score</th><th>Grade</th><th>Term</th><th>Year</th></tr></thead>
              <tbody>
                {reportCards.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.subject}</strong></td>
                    <td>{r.score}</td>
                    <td><span className="badge info">{r.grade}</span></td>
                    <td>{r.term}</td>
                    <td>{r.academic_year}</td>
                  </tr>
                ))}
                {reportCards.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: "24px 0" }}>No report card data yet</td></tr>
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
        <div className="metric-grid">
          <div className="metric green"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{attendance.length > 0 ? attendance[0].status : "—"}</strong><span>Today</span></div></div>
          <div className="metric teal"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{attendancePct}%</strong><span>This Term</span></div></div>
          <div className="metric amber"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{lateCount}</strong><span>Late Days</span></div></div>
          <div className="metric red"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{absentCount}</strong><span>Absent Days</span></div></div>
        </div>
        <div className="stack-list list-panel">
          {attendance.map((h, i) => (
            <div key={i} className="list-row">
              <div className="dot" style={{ background: h.status === "Present" ? "#10b981" : h.status === "Late" ? "#f59e0b" : "#ef4444" }} />
              <div>
                <strong style={{ fontSize: "0.9rem" }}>{h.date}</strong>
                {h.remarks && <br />}
                {h.remarks && <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{h.remarks}</span>}
              </div>
              <span className={`badge ${h.status === "Present" ? "success" : h.status === "Late" ? "warning" : "error"}`}>{h.status}</span>
            </div>
          ))}
          {attendance.length === 0 && <p className="empty-state">No attendance records yet</p>}
        </div>
      </div>
    );
  }

  if (view === "My Fees") {
    return (
      <div className="content-grid">
        <div className="metric-grid">
          <div className="metric amber"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>UGX {totalInvoiced.toLocaleString()}</strong><span>Total Invoiced</span></div></div>
          <div className="metric green"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>UGX {totalPaid.toLocaleString()}</strong><span>Paid</span></div></div>
          <div className="metric red"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>UGX {totalBalance.toLocaleString()}</strong><span>Balance</span></div></div>
          <div className="metric blue"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{fees.length}</strong><span>Invoices</span></div></div>
        </div>
        <div className="table-panel glass-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Description</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Due</th></tr></thead>
              <tbody>
                {fees.map(f => {
                  const amt = parseFeeAmount(f.amount);
                  const paid = parseFeeAmount(f.paid_amount);
                  return (
                    <tr key={f.id}>
                      <td><strong>{f.description || f.category_name || "Fee"}</strong></td>
                      <td>{f.amount}</td>
                      <td>{f.paid_amount}</td>
                      <td>UGX {(amt - paid).toLocaleString()}</td>
                      <td><span className={`badge ${f.status === "paid" ? "success" : f.status === "partial" ? "warning" : "error"}`}>{f.status}</span></td>
                      <td>{f.due_date}</td>
                    </tr>
                  );
                })}
                {fees.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "24px 0" }}>No fee records yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Announcements") {
    return (
      <div className="content-grid">
        <div className="stack-list list-panel">
          {notifications.map(n => (
            <div key={n.id} className="list-row">
              <div className="dot" style={{ background: n.status === "read" ? "var(--muted)" : "#4fc3f7" }} />
              <div>
                <strong style={{ fontSize: "0.9rem" }}>{n.title}</strong>
                <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{n.type} · {n.created_at ? new Date(n.created_at).toLocaleDateString() : ""}</span>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#e2e8f0" }}>{n.message}</p>
              </div>
              <span className={`badge ${n.status === "read" ? "muted" : "info"}`}>{n.status === "read" ? "Read" : "New"}</span>
            </div>
          ))}
          {notifications.length === 0 && <p className="empty-state">No announcements</p>}
        </div>
      </div>
    );
  }

  if (view === "Biometric Setup") {
    return (
      <div className="content-grid">
        <div className="detail-panel glass-card" style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
          <div className="panel-title">
            <div className="panel-title-left"><p className="eyebrow">Identity</p><strong>Biometric Registration</strong></div>
            <Camera size={18} />
          </div>
          {!biometricPhoto ? (
            !cameraStream ? (
              <div style={{ textAlign: "center", padding: 32, display: "grid", gap: 14 }}>
                <Camera size={56} style={{ margin: "0 auto", color: "var(--muted)" }} />
                <p style={{ color: "var(--muted)", margin: 0 }}>Take a clear photo for your student ID profile.</p>
                <button className="tool-button primary" onClick={startCamera}><Camera size={15} />Start Camera</button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", borderRadius: 8 }} />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="tool-button primary" onClick={capturePhoto}><Camera size={15} />Capture</button>
                  <button className="tool-button" onClick={stopCamera}>Cancel</button>
                </div>
              </div>
            )
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <img src={biometricPhoto} alt="Captured" style={{ width: "100%", borderRadius: 8 }} />
              <div style={{ display: "flex", gap: 10 }}>
                <button className="tool-button primary" onClick={handleUploadPhoto} disabled={uploading}>
                  {uploading ? <><Loader2 size={15} className="spin" />Uploading...</> : "Confirm & Upload"}
                </button>
                <button className="tool-button" onClick={() => setBiometricPhoto(null)}>Retake</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Student Dashboard</h2>
          <p>View your fees, attendance, report cards, and library books.</p>
        </div>
        <div className="student-hero-grad">
          <div className="student-avatar-lg">{studentName.charAt(0)}</div>
        <div>
          <strong style={{ fontSize: "1.2rem" }}>{studentName}</strong>
          <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: "0.9rem" }}>{className} · {admNo}</p>
        </div>
      </div>
      <div className="metric-grid">
        <div className="metric teal"><div className="metric-icon"><BookOpen size={22} /></div><div className="metric-body"><strong>{libraryBooks.length}</strong><span>Library Books</span></div></div>
        <div className="metric green"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{attendance.length > 0 ? attendance[0].status : "—"}</strong><span>Today</span></div></div>
        <div className="metric blue"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{reportCards.length > 0 ? reportCards[0].grade : "—"}</strong><span>Last Grade</span></div></div>
        <div className="metric amber"><div className="metric-icon"><Bell size={22} /></div><div className="metric-body"><strong>{notifications.filter(m => m.status !== "read").length}</strong><span>Announcements</span></div></div>
      </div>
      <div className="notice-strip">Select a view — Dashboard, My Fees, Attendance, Report Card, Library, or Announcements.</div>
    </div>
  );
}
