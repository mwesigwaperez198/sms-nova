import { useState, useRef, useEffect } from "react";
import { GraduationCap, BookOpen, LibraryBig, Camera, Download, ExternalLink, Calendar, FileText, Bell } from "lucide-react";
import type { ConnectedData } from "../api";

interface StudentWorkspaceProps {
  view: string;
  data: ConnectedData;
}

const TILES = [
  { key: "Dashboard", icon: GraduationCap, label: "Dashboard" },
  { key: "My Fees", icon: FileText, label: "My Fees" },
  { key: "Attendance", icon: Calendar, label: "Attendance" },
  { key: "Report Card", icon: FileText, label: "Report Card" },
  { key: "Library", icon: LibraryBig, label: "Library" },
  { key: "Announcements", icon: Bell, label: "Announcements" },
];

const student = {
  name: "Okello Brian",
  class: "S2",
  stream: "East",
  admNo: "NDS-2024-0087",
  desiredSkills: ["Coding", "Agribusiness", "Entrepreneurship"],
};

export function StudentWorkspace({ view, data }: StudentWorkspaceProps) {
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [libTab, setLibTab] = useState<"library" | "online" | "skills">("library");
  const [biometricPhoto, setBiometricPhoto] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const libraryBooks = data.studentLibraryBooks.filter(b => b.source === "library");
  const onlineBooks = data.studentLibraryBooks.filter(b => b.source === "online");
  const skillBooks = onlineBooks.filter(b =>
    student.desiredSkills.some(sk =>
      b.title.toLowerCase().includes(sk.toLowerCase()) ||
      b.subject.toLowerCase().includes(sk.toLowerCase())
    )
  );

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

  useEffect(() => () => stopCamera(), []);

  if (view === "Dashboard") {
    const renderTileContent = () => {
      switch (selectedTile) {
        case "My Fees":
          const feeInfo = data.feeBalances.find(f => f.student === student.name);
          return (
            <>
              <div className="metric-grid">
                <div className="metric amber"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{feeInfo ? feeInfo.expected : "UGX 450,000"}</strong><span>Total Invoiced</span></div></div>
                <div className="metric green"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{feeInfo ? feeInfo.paid : "UGX 130,000"}</strong><span>Paid</span></div></div>
                <div className="metric red"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{feeInfo ? feeInfo.balance : "UGX 320,000"}</strong><span>Balance</span></div></div>
                <div className="metric blue"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{data.receipts.length}</strong><span>Receipts</span></div></div>
              </div>
              <div className="table-panel">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Receipt No</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead>
                    <tbody>
                      {data.receipts.map(r => (
                        <tr key={r.receiptNo}>
                          <td><code>{r.receiptNo}</code></td>
                          <td><strong>{r.amount}</strong></td>
                          <td>{r.method}</td>
                          <td>{r.date}</td>
                        </tr>
                      ))}
                      {data.receipts.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: "24px 0" }}>No fee records yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          );

        case "Attendance":
          const today = new Date().toISOString().slice(0, 10);
          const attendanceRecords = Object.values(data.attendanceData).flat();
          const myAttendance = attendanceRecords.filter(r => r.studentName === student.name || r.admissionNo === student.admNo);
          const displayHistory = myAttendance.length > 0
            ? myAttendance.map(r => ({ date: today, status: r.status as "Present" | "Late" | "Absent", time: r.time || "—" }))
            : [
                { date: "Today", status: "Present" as const, time: "7:52 AM" },
                { date: "Yesterday", status: "Present" as const, time: "7:58 AM" },
                { date: "Mon", status: "Late" as const, time: "8:41 AM" },
                { date: "Fri", status: "Present" as const, time: "7:50 AM" },
                { date: "Thu", status: "Absent" as const, time: "—" },
              ];
          const presentCount = displayHistory.filter(h => h.status === "Present").length;
          const lateCount = displayHistory.filter(h => h.status === "Late").length;
          const absentCount = displayHistory.filter(h => h.status === "Absent").length;
          const total = displayHistory.length;
          const pct = total > 0 ? Math.round((presentCount / total) * 100) : 94;
          return (
            <>
              <div className="metric-grid">
                <div className="metric green"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{displayHistory[0]?.status || "Present"}</strong><span>Today</span></div></div>
                <div className="metric teal"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{pct}%</strong><span>This Term</span></div></div>
                <div className="metric amber"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{lateCount}</strong><span>Late Days</span></div></div>
                <div className="metric red"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>{absentCount}</strong><span>Absent Days</span></div></div>
              </div>
              <div className="stack-list list-panel">
                {displayHistory.map((h, i) => (
                  <div key={i} className="list-row">
                    <div className="dot" style={{ background: h.status === "Present" ? "#10b981" : h.status === "Late" ? "#f59e0b" : "#ef4444" }} />
                    <div>
                      <strong style={{ fontSize: "0.9rem" }}>{h.date}</strong>
                      <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{h.time}</span>
                    </div>
                    <span className={`badge ${h.status === "Present" ? "success" : h.status === "Late" ? "warning" : "error"}`}>{h.status}</span>
                  </div>
                ))}
              </div>
            </>
          );

        case "Report Card":
          const subjects = [
            { name: "Mathematics", bot: 68, mot: 72, eot: 70, grade: "C4" },
            { name: "English", bot: 75, mot: 78, eot: 80, grade: "D2" },
            { name: "Biology", bot: 60, mot: 65, eot: 63, grade: "C5" },
            { name: "Chemistry", bot: 55, mot: 58, eot: 60, grade: "C6" },
            { name: "Physics", bot: 70, mot: 72, eot: 75, grade: "C4" },
          ];
          return (
            <>
              <div className="table-panel">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Subject</th><th>BOT</th><th>MOT</th><th>EOT</th><th>Average</th><th>Grade</th></tr></thead>
                    <tbody>
                      {subjects.map(s => {
                        const avg = ((s.bot + s.mot + s.eot) / 3).toFixed(1);
                        return (
                          <tr key={s.name}>
                            <td><strong>{s.name}</strong></td>
                            <td>{s.bot}</td><td>{s.mot}</td><td>{s.eot}</td>
                            <td><strong>{avg}</strong></td>
                            <td><span className="badge info">{s.grade}</span></td>
                          </tr>
                        );
                      })}
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
                <div className="metric amber"><div className="metric-icon"><GraduationCap size={22} /></div><div className="metric-body"><strong>{skillBooks.length}</strong><span>Recommended</span></div></div>
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
              {data.studentMessages.map(msg => (
                <div key={msg.id} className="list-row">
                  <div className="dot" style={{ background: msg.read ? "var(--muted)" : "#4fc3f7" }} />
                  <div>
                    <strong style={{ fontSize: "0.9rem" }}>{msg.subject}</strong>
                    <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{msg.from} · {msg.date}</span>
                    <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#e2e8f0" }}>{msg.body}</p>
                  </div>
                  <span className={`badge ${msg.read ? "muted" : "info"}`}>{msg.read ? "Read" : "New"}</span>
                </div>
              ))}
              {data.studentMessages.length === 0 && <p className="empty-state">No announcements</p>}
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div className="content-grid">
        <div className="student-hero-grad">
          <div className="student-avatar-lg">{student.name.charAt(0)}</div>
          <div>
            <strong style={{ fontSize: "1.2rem" }}>{student.name}</strong>
            <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: "0.9rem" }}>{student.class} {student.stream} · {student.admNo}</p>
            <p style={{ margin: "4px 0 0", opacity: 0.75, fontSize: "0.82rem" }}>Interests: {student.desiredSkills.join(", ")}</p>
          </div>
        </div>

        <div className="metric-grid">
          <div className="metric teal"><div className="metric-icon"><BookOpen size={22} /></div><div className="metric-body"><strong>{libraryBooks.length}</strong><span>Library Books</span></div></div>
          <div className="metric green"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>Present</strong><span>Today</span></div></div>
          <div className="metric blue"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>B+</strong><span>Last Grade</span></div></div>
          <div className="metric amber"><div className="metric-icon"><Bell size={22} /></div><div className="metric-body"><strong>{data.studentMessages.filter(m => !m.read).length}</strong><span>Announcements</span></div></div>
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
          <button className={`tab-btn ${libTab === "skills" ? "active" : ""}`} onClick={() => setLibTab("skills")}><GraduationCap size={15} />For You</button>
        </div>

        {libTab === "library" && (
          <div className="content-grid">
            <div className="metric-grid">
              <div className="metric teal"><div className="metric-icon"><BookOpen size={22} /></div><div className="metric-body"><strong>{libraryBooks.length}</strong><span>Available</span></div></div>
              <div className="metric green"><div className="metric-icon"><Download size={22} /></div><div className="metric-body"><strong>{libraryBooks.filter(b => b.hasDigital).length}</strong><span>Digital</span></div></div>
              <div className="metric blue"><div className="metric-icon"><LibraryBig size={22} /></div><div className="metric-body"><strong>{onlineBooks.length}</strong><span>Online</span></div></div>
              <div className="metric amber"><div className="metric-icon"><GraduationCap size={22} /></div><div className="metric-body"><strong>{skillBooks.length}</strong><span>Recommended</span></div></div>
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

        {libTab === "skills" && (
          <div className="content-grid">
            <div className="notice-strip">Based on your interests: <strong>{student.desiredSkills.join(", ")}</strong></div>
            <div className="book-grid-cards">
              {skillBooks.length > 0 ? skillBooks.map(b => (
                <div key={b.code} className="book-card-item">
                  <div className="book-cover-emoji">{b.coverEmoji}</div>
                  <div className="book-card-title">{b.title}</div>
                  <div className="book-card-author">{b.author}</div>
                  <span className="badge success" style={{ fontSize: "0.72rem" }}>Recommended</span>
                  <div style={{ marginTop: 8 }}>
                    <button className="tool-button primary" style={{ width: "100%", minHeight: 32 }}><ExternalLink size={13} />Access</button>
                  </div>
                </div>
              )) : (
                <div className="empty-state">
                  <GraduationCap size={40} />
                  <p>No skill-matched resources yet. Update your profile interests.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === "Report Card") {
    const subjects = [
      { name: "Mathematics", bot: 68, mot: 72, eot: 70, grade: "C4" },
      { name: "English", bot: 75, mot: 78, eot: 80, grade: "D2" },
      { name: "Biology", bot: 60, mot: 65, eot: 63, grade: "C5" },
      { name: "Chemistry", bot: 55, mot: 58, eot: 60, grade: "C6" },
      { name: "Physics", bot: 70, mot: 72, eot: 75, grade: "C4" },
    ];
    return (
      <div className="content-grid">
        <div className="student-hero-grad">
          <div className="student-avatar-lg">{student.name.charAt(0)}</div>
          <div>
            <strong style={{ fontSize: "1.1rem" }}>{student.name}</strong>
            <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: "0.88rem" }}>{student.class} {student.stream} · Term 1, 2026</p>
          </div>
          <button className="tool-button" style={{ marginLeft: "auto", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff" }} onClick={() => window.print()}>
            <Download size={15} />Download
          </button>
        </div>
        <div className="table-panel">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Subject</th><th>BOT</th><th>MOT</th><th>EOT</th><th>Average</th><th>Grade</th></tr></thead>
              <tbody>
                {subjects.map(s => {
                  const avg = ((s.bot + s.mot + s.eot) / 3).toFixed(1);
                  return (
                    <tr key={s.name}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.bot}</td><td>{s.mot}</td><td>{s.eot}</td>
                      <td><strong>{avg}</strong></td>
                      <td><span className="badge info">{s.grade}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Attendance") {
    const history = [
      { date: "Today", status: "Present", time: "7:52 AM" },
      { date: "Yesterday", status: "Present", time: "7:58 AM" },
      { date: "Mon", status: "Late", time: "8:41 AM" },
      { date: "Fri", status: "Present", time: "7:50 AM" },
      { date: "Thu", status: "Absent", time: "—" },
    ];
    return (
      <div className="content-grid">
        <div className="metric-grid">
          <div className="metric green"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>Present</strong><span>Today</span></div></div>
          <div className="metric teal"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>94%</strong><span>This Term</span></div></div>
          <div className="metric amber"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>1</strong><span>Late Days</span></div></div>
          <div className="metric red"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>1</strong><span>Absent Days</span></div></div>
        </div>
        <div className="stack-list list-panel">
          {history.map((h, i) => (
            <div key={i} className="list-row">
              <div className="dot" style={{ background: h.status === "Present" ? "#10b981" : h.status === "Late" ? "#f59e0b" : "#ef4444" }} />
              <div>
                <strong style={{ fontSize: "0.9rem" }}>{h.date}</strong>
                <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{h.time}</span>
              </div>
              <span className={`badge ${h.status === "Present" ? "success" : h.status === "Late" ? "warning" : "error"}`}>{h.status}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === "My Fees") {
    const feeInfo = data.feeBalances.find(f => f.student === student.name);
    return (
      <div className="content-grid">
        <div className="metric-grid">
          <div className="metric amber"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{feeInfo ? feeInfo.expected : "UGX 450,000"}</strong><span>Total Invoiced</span></div></div>
          <div className="metric green"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{feeInfo ? feeInfo.paid : "UGX 130,000"}</strong><span>Paid</span></div></div>
          <div className="metric red"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{feeInfo ? feeInfo.balance : "UGX 320,000"}</strong><span>Balance</span></div></div>
          <div className="metric blue"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>{data.receipts.length}</strong><span>Receipts</span></div></div>
        </div>
        <div className="table-panel">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Receipt No</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead>
              <tbody>
                {data.receipts.map(r => (
                  <tr key={r.receiptNo}>
                    <td><code>{r.receiptNo}</code></td>
                    <td><strong>{r.amount}</strong></td>
                    <td>{r.method}</td>
                    <td>{r.date}</td>
                  </tr>
                ))}
                {data.receipts.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: "24px 0" }}>No fee records yet</td></tr>
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
          {data.studentMessages.map(msg => (
            <div key={msg.id} className="list-row">
              <div className="dot" style={{ background: msg.read ? "var(--muted)" : "#4fc3f7" }} />
              <div>
                <strong style={{ fontSize: "0.9rem" }}>{msg.subject}</strong>
                <br /><span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{msg.from} · {msg.date}</span>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#e2e8f0" }}>{msg.body}</p>
              </div>
              <span className={`badge ${msg.read ? "muted" : "info"}`}>{msg.read ? "Read" : "New"}</span>
            </div>
          ))}
          {data.studentMessages.length === 0 && <p className="empty-state">No announcements</p>}
        </div>
      </div>
    );
  }

  if (view === "Biometric Setup") {
    return (
      <div className="content-grid">
        <div className="detail-panel" style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
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
                <button className="tool-button primary" onClick={() => alert("Photo uploaded!")}>Confirm &amp; Upload</button>
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
      <div className="student-hero-grad">
        <div className="student-avatar-lg">{student.name.charAt(0)}</div>
        <div>
          <strong style={{ fontSize: "1.2rem" }}>{student.name}</strong>
          <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: "0.9rem" }}>{student.class} {student.stream} · {student.admNo}</p>
        </div>
      </div>
      <div className="metric-grid">
        <div className="metric teal"><div className="metric-icon"><BookOpen size={22} /></div><div className="metric-body"><strong>{libraryBooks.length}</strong><span>Library Books</span></div></div>
        <div className="metric green"><div className="metric-icon"><Calendar size={22} /></div><div className="metric-body"><strong>Present</strong><span>Today</span></div></div>
        <div className="metric blue"><div className="metric-icon"><FileText size={22} /></div><div className="metric-body"><strong>B+</strong><span>Last Grade</span></div></div>
        <div className="metric amber"><div className="metric-icon"><Bell size={22} /></div><div className="metric-body"><strong>{data.studentMessages.filter(m => !m.read).length}</strong><span>Announcements</span></div></div>
      </div>
      <div className="notice-strip">Select a view — Dashboard, My Fees, Attendance, Report Card, Library, or Announcements.</div>
    </div>
  );
}
