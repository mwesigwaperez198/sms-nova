import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ShieldCheck, Activity, AlertTriangle, TrendingUp, Printer, Download,
  Users, BarChart3, Eye, RotateCcw, Camera, Scan, ArrowLeft
} from "lucide-react";
import {
  approvalDecision as submitApprovalDecision,
  clearSessionTokens,
  loadConnectedData,
  login,
  mapUserToSession,
  resetPassword,
  sendSmsBatch,
  shareFinanceDocument,
  shareRequestedBooks,
  verifyFaceLogin
} from "./api";
import type { ConnectedData, FaceChallenge, Session, TwoFactorChallenge } from "./api";
import { AppShell } from "./components/AppShell";
import { DataTable } from "./components/DataTable";
import { printElement, exportAsCSV } from "./utils/exportUtils";
import { LandingPage } from "./components/LandingPage";
import { LoginScreen } from "./components/LoginScreen";
import { ForgotPasswordScreen } from "./components/ForgotPasswordScreen";
import { RegisterSchoolScreen } from "./components/RegisterSchoolScreen";
import { SignUpScreen } from "./components/SignUpScreen";
import { TwoFactorSetup } from "./components/TwoFactorSetup";
import { PhotoCapture } from "./components/PhotoCapture";
import { FaceVerification } from "./components/FaceVerification";
import { StatusBadge } from "./components/StatusBadge";
import { roles } from "./data/mockData";
import type { RoleKey } from "./types";
import { TeacherWorkspace } from "./workspaces/TeacherWorkspace";
import { StudentWorkspace } from "./workspaces/StudentWorkspace";
import { LibrarianWorkspace } from "./workspaces/LibrarianWorkspace";
import { SecretaryWorkspace } from "./workspaces/SecretaryWorkspace";
import { BursarWorkspace } from "./workspaces/BursarWorkspace";
import { ParentWorkspace } from "./workspaces/ParentWorkspace";
import { SuperAdminWorkspace } from "./workspaces/SuperAdminWorkspace";
import { ICTWorkspace } from "./workspaces/ICTWorkspace";
import { HeadteacherWorkspace } from "./workspaces/HeadteacherWorkspace";

const studentColumns = [
  { key: "admissionNo", label: "Admission No" },
  { key: "name", label: "Student" },
  { key: "gender", label: "Gender" },
  { key: "className", label: "Class" },
  { key: "guardian", label: "Guardian" },
  { key: "status", label: "Status" }
] as const;

const importColumns = [
  { key: "batch", label: "Batch" },
  { key: "type", label: "Type" },
  { key: "total", label: "Total" },
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
  { key: "invalid", label: "Invalid" },
  { key: "status", label: "Status" }
] as const;

const financeColumns = [
  { key: "number", label: "Document No" },
  { key: "type", label: "Type" },
  { key: "title", label: "Title" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" }
] as const;

const paymentColumns = [
  { key: "reference", label: "Reference" },
  { key: "student", label: "Student" },
  { key: "method", label: "Method" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" }
] as const;

const approvalColumns = [
  { key: "id", label: "ID" },
  { key: "type", label: "Type" },
  { key: "title", label: "Title" },
  { key: "submitted_by", label: "Submitted By" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" }
] as const;

const notificationColumns = [
  { key: "id", label: "ID" },
  { key: "type", label: "Type" },
  { key: "title", label: "Title" },
  { key: "message", label: "Message" },
  { key: "severity", label: "Severity" },
  { key: "status", label: "Status" }
] as const;

const staffColumns = [
  { key: "staffNo", label: "Staff No" },
  { key: "name", label: "Name" },
  { key: "role", label: "Role" },
  { key: "department", label: "Department" },
  { key: "status", label: "Status" }
] as const;

const messageColumns = [
  { key: "batch", label: "Batch" },
  { key: "channel", label: "Channel" },
  { key: "recipients", label: "Recipients" },
  { key: "message", label: "Message" },
  { key: "status", label: "Status" }
] as const;

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [roleKey, setRoleKey] = useState<RoleKey>("admin");
  const [view, setView] = useState("Home");
  const [data, setData] = useState<ConnectedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showLanding, setShowLanding] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);
  const [pendingFaceToken, setPendingFaceToken] = useState<string | null>(null);

  const activeRole = useMemo(() => roles.find((role) => role.key === roleKey) ?? roles[1], [roleKey]);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    setConnectionError(null);

    loadConnectedData(
      roleKey,
      (fresh) => {
        if (!cancelled) {
          setData(fresh);
          setView((currentView) => (fresh.nav.includes(currentView) ? currentView : fresh.nav[0] ?? "Home"));
        }
      }
    ).then((result) => {
      if (!cancelled) {
        setData(result);
        if (result.nav.length > 0) {
          setView((currentView) => (result.nav.includes(currentView) ? currentView : result.nav[0]));
        }
      }
    }).catch((error: Error) => {
      if (!cancelled) setConnectionError(error.message);
    });

    return () => {
      cancelled = true;
    };
  }, [roleKey, session]);

  const handleSession = (nextSession: Session) => {
    setSession(nextSession);
    setRoleKey(nextSession.user.role_key);
    setView("Home");
    setNotice(`Logged in as ${nextSession.user.full_name}`);
  };

  const FACE_AUTH_ROLES: RoleKey[] = ["super-admin", "admin"];

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setConnectionError(null);
    setTwoFactorChallenge(null);
    try {
      const result = await login(email, password);
      if ("requires_2fa" in result) {
        setTwoFactorChallenge(result as TwoFactorChallenge);
        return;
      }
      if ("requires_face" in result) {
        setPendingFaceToken((result as FaceChallenge).temp_token);
        return;
      }
      const nextSession = result as Session;
      setSession(nextSession);
      setRoleKey(nextSession.user.role_key);
      setView("Home");
      setNotice(`Logged in as ${nextSession.user.full_name}`);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handle2faLoginResult = (result: Session | FaceChallenge) => {
    if ("requires_face" in result) {
      setPendingFaceToken(result.temp_token);
    } else {
      const nextSession = result as Session;
      setSession(nextSession);
      setRoleKey(nextSession.user.role_key);
      setView("Home");
      setNotice(`Logged in as ${nextSession.user.full_name}`);
    }
  };

  const handleFaceVerified = (nextSession: Session) => {
    setPendingFaceToken(null);
    setSession(nextSession);
    setRoleKey(nextSession.user.role_key);
    setView("Home");
    setNotice(`Logged in as ${nextSession.user.full_name}`);
  };

  const onApprove = async (approvalId: string, decision: string) => {
    setNotice(await submitApprovalDecision(approvalId, decision));
  };

  const onShareFinance = async () => {
    const target = data?.financeDocuments[0]?.number;
    if (target) setNotice(await shareFinanceDocument(target));
  };

  const onShareRequestedBooks = async () => {
    setNotice(await shareRequestedBooks());
  };

  const onSendSms = async (groupId: string, message: string, comment: string) => {
    setNotice(await sendSmsBatch(groupId, message, comment));
  };

  if (!session) {
    if (showLanding) {
      return <LandingPage onEnterApp={() => setShowLanding(false)} />;
    }
    if (showForgotPassword) {
      return <ForgotPasswordScreen onBack={() => setShowForgotPassword(false)} />;
    }
    if (showRegister) {
      return <RegisterSchoolScreen onBack={() => setShowRegister(false)} />;
    }
    if (showSignUp) {
      return <SignUpScreen onBack={() => setShowSignUp(false)} onComplete={() => { setShowSignUp(false); }} />;
    }
    if (twoFactorChallenge) {
      return <LoginScreen loading={false} error={null} onLogin={handleLogin} onSession={handleSession} twoFactorChallenge={twoFactorChallenge} onClearChallenge={() => setTwoFactorChallenge(null)} on2faResult={handle2faLoginResult} />;
    }
    if (pendingFaceToken) {
      return (
        <main className="login-screen">
          <div className="login-background-orb login-orb-1" />
          <div className="login-background-orb login-orb-2" />
          <section className="login-panel">
            <div className="login-brand">
              <div className="brand-mark">N</div>
              <div>
                <p>Smart School Management</p>
                <h1>Face Verification</h1>
              </div>
            </div>
            <div className="login-card">
              <div className="login-card-title">
                <Scan size={22} />
                <div>
                  <p>Enhanced security required</p>
                  <h2>Verify your identity</h2>
                </div>
              </div>
              <p style={{ color: "var(--muted)", fontSize: "0.88rem", margin: 0 }}>
                This role requires facial verification for login.
              </p>
              <div style={{ marginTop: 8 }}>
                <FaceVerification
                  mode="verify"
                  roleKey=""
                  loading={loading}
                  onCustomVerify={async (imageData: string) => {
                    if (!pendingFaceToken) return;
                    setLoading(true);
                    try {
                      const nextSession = await verifyFaceLogin(pendingFaceToken, imageData);
                      handleFaceVerified(nextSession);
                    } catch (err: any) {
                      throw new Error(err.message || "Face verification failed");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  onComplete={(success) => {
                    if (!success) setPendingFaceToken(null);
                  }}
                />
              </div>
              <div className="login-actions" style={{ gridTemplateColumns: "1fr" }}>
                <button type="button" className="secondary-button" onClick={() => setPendingFaceToken(null)}>
                  <ArrowLeft size={16} /> Back to Login
                </button>
              </div>
            </div>
          </section>
        </main>
      );
    }
    return (
      <LoginScreen
        loading={loading}
        error={connectionError}
        onLogin={handleLogin}
        onSession={handleSession}
        onForgotPassword={() => setShowForgotPassword(true)}
        onSwitchToRegister={() => setShowRegister(true)}
        onSwitchToSignUp={() => setShowSignUp(true)}
      />
    );
  }

  return (
    <AppShell
      roles={roles}
      activeRole={activeRole}
      onRoleChange={setRoleKey}
      navItems={data?.nav}
      activeView={view}
      onViewChange={setView}
      showRoleSwitcher={false}
      onLogout={() => {
        clearSessionTokens();
        setSession(null);
        setData(null);
        setNotice("Signed out. You can log in again whenever you are ready.");
      }}
      onOpenNotifications={() => setView("Notifications")}
      onOpenProfile={() => setShowProfile(true)}
    >
      {showProfile && session && <ProfileModal session={session} data={data} roleKey={roleKey} onClose={() => setShowProfile(false)} />}
      {notice || connectionError ? <div className={connectionError ? "notice notice-error" : "notice"}>{connectionError ?? notice}</div> : null}
      {!data ? (
        <section className="panel">Loading connected dashboard...</section>
      ) : (
        <RoleWorkspace
          role={roleKey}
          view={view}
          data={data}
          onViewChange={setView}
          onApprove={onApprove}
          onShareFinance={onShareFinance}
          onShareRequestedBooks={onShareRequestedBooks}
          onSendSms={onSendSms}
        />
      )}
    </AppShell>
  );
}

interface WorkspaceProps {
  role: RoleKey;
  view: string;
  data: ConnectedData;
  onViewChange: (view: string) => void;
  onApprove: (approvalId: string, decision: string) => void;
  onShareFinance: () => void;
  onShareRequestedBooks: () => void;
  onSendSms: (groupId: string, message: string, comment: string) => void;
}

function RoleWorkspace(props: WorkspaceProps) {
  switch (props.role) {
    case "admin":
      return <AdminWorkspaceFull view={props.view} data={props.data} onViewChange={props.onViewChange} onApprove={props.onApprove} onShareFinance={props.onShareFinance} onShareRequestedBooks={props.onShareRequestedBooks} onSendSms={props.onSendSms} />;
    case "ict-admin":
      return <ICTWorkspace view={props.view} data={props.data} onViewChange={props.onViewChange} />;
    case "secretary":
      return <SecretaryWorkspace view={props.view} data={props.data} onViewChange={props.onViewChange} />;
    case "bursar":
      return <BursarWorkspace view={props.view} data={props.data} onShareFinance={props.onShareFinance} />;
    case "librarian":
      return <LibrarianWorkspace view={props.view} data={props.data} onShareRequestedBooks={props.onShareRequestedBooks} roleKey={props.role} />;
    case "headteacher":
      return <HeadteacherWorkspace view={props.view} data={props.data} onViewChange={props.onViewChange} onSendSms={props.onSendSms} />;
    case "teacher":
      return <TeacherWorkspace view={props.view} data={props.data} onSendSms={props.onSendSms} />;
    case "parent":
      return <ParentWorkspace view={props.view} data={props.data} />;
    case "student":
      return <StudentWorkspace view={props.view} data={props.data} />;
    default:
      return <SuperAdminWorkspace view={props.view} data={props.data} onViewChange={props.onViewChange} />;
  }
}

interface AdminWorkspaceFullProps {
  view: string;
  data: ConnectedData;
  onViewChange: (view: string) => void;
  onApprove: (approvalId: string, decision: string) => void;
  onShareFinance: () => void;
  onShareRequestedBooks: () => void;
  onSendSms: (groupId: string, message: string, comment: string) => void;
}

function AdminWorkspaceFull(props: AdminWorkspaceFullProps) {
  if (props.view === "Approvals") return <ApprovalsView data={props.data} onApprove={props.onApprove} />;
  if (props.view === "Notifications") return <NotificationsView data={props.data} roleKey="admin" />;
  if (props.view === "Students") return <StudentsView data={props.data} />;
  if (props.view === "Staff") return <StaffView data={props.data} />;
  if (props.view === "Finance") return <FinanceWorkspace data={props.data} onShareFinance={props.onShareFinance} />;
  if (props.view === "Communication") return <CommunicationView data={props.data} onSendSms={props.onSendSms} />;
  if (props.view === "Reports") return <ReportsView data={props.data} />;
  if (props.view === "Settings") return <SettingsView data={props.data} onResetPassword={resetPassword} />;
  return <AdminHome data={props.data} onViewChange={props.onViewChange} />;
}







function AdminHome({ data, onViewChange }: { data: ConnectedData; onViewChange: (view: string) => void }) {
  const summary = data.home.student_summary;
  const finance = data.home.finance_summary;

  return (
    <section className="dashboard-grid improved">
      <div className="compact-stats">
        <CompactStat label="Total Students" value={summary.total} hint="From current records and latest import" tone="info" />
        <CompactStat label="Male" value={summary.male} hint="Auto-detected from gender" tone="info" />
        <CompactStat label="Female" value={summary.female} hint="Auto-detected from gender" tone="success" />
        <CompactStat label="Pending Admissions" value={summary.pending_admissions} hint="Awaiting approval" tone="warning" />
      </div>

      <div className="notification-strip">
        {data.notifications.slice(0, 3).map((notification) => (
                     <button className={`notification-card ${notification.severity === "critical" ? "high" : ""}`} key={notification.id} onClick={() => onViewChange("Notifications")}>
            <strong>{notification.title}</strong>
            <span>{notification.message}</span>
          </button>
        ))}
      </div>

      <section className="panel third-panel">
        <PanelTitle eyebrow="Finance" title="Fees Collection" aside={<StatusBadge value={`${finance.collection_rate}%`} tone="success" />} />
        <CompactStat label="Collected" value={finance.collected} hint={`Expected ${finance.expected}`} tone="success" />
        <CompactStat label="Outstanding" value={finance.outstanding} hint="Debtors need follow-up" tone="warning" />
      </section>

      <section className="panel third-panel">
        <PanelTitle eyebrow="Enrollment" title="Male/Female By Class" />
        <EnrollmentBars data={data} />
      </section>

      <section className="panel third-panel">
        <PanelTitle eyebrow="Attendance" title="Present Rate" />
        <Bars rows={data.home.attendance_by_class} valueKey="present" color="green" />
      </section>

      <section className="panel half-panel">
        <PanelTitle eyebrow="Performance" title="Class Average" />
        <Bars rows={data.home.performance_by_class} valueKey="average" />
      </section>

      <section className="panel half-panel">
        <PanelTitle eyebrow="Finance Trend" title="Collection Progress" />
        <Bars rows={data.home.finance_trend} valueKey="collected" color="green" />
      </section>
    </section>
  );
}

function CompactStat({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone: "success" | "warning" | "danger" | "info" }) {
  return (
    <article className="compact-stat">
      <StatusBadge value={label} tone={tone} />
      <strong>{value}</strong>
      <span>{hint}</span>
    </article>
  );
}

function PanelTitle({ eyebrow, title, aside }: { eyebrow: string; title: string; aside?: ReactNode }) {
  return (
    <div className="panel-header">
      <div>
        <p>{eyebrow}</p>
        <h3>{title}</h3>
      </div>
      {aside}
    </div>
  );
}

function Bars<T extends { label: string }>({ rows, valueKey, color = "" }: { rows: T[]; valueKey: keyof T; color?: string }) {
  return (
    <div className="chart-bars">
      {rows.map((row) => (
        <div className="bar-row" key={String(row.label)}>
          <span>{row.label}</span>
          <div className="bar-track">
            <div className={`bar-fill ${color}`} style={{ width: `${Math.min(Number(row[valueKey]), 100)}%` }} />
          </div>
          <strong>{String(row[valueKey])}%</strong>
        </div>
      ))}
    </div>
  );
}

function EnrollmentBars({ data }: { data: ConnectedData }) {
  return (
    <div className="chart-bars">
      {data.home.enrollment_by_class.map((row) => {
        const maleWidth = Math.round((row.male / row.total) * 100);
        return (
          <div className="bar-row" key={row.label}>
            <span>{row.label}</span>
            <div className="stacked">
              <div className="stack-male" style={{ width: `${maleWidth}%` }} />
              <div className="stack-female" style={{ width: `${100 - maleWidth}%` }} />
            </div>
            <strong>{row.total}</strong>
          </div>
        );
      })}
    </div>
  );
}

function ApprovalsView({ data, onApprove }: { data: ConnectedData; onApprove: (approvalId: string, decision: string) => void }) {
  return (
    <section className="panel">
      <PanelTitle eyebrow="Admin approval inbox" title="Approve, reject, or request changes" />
      <DataTable columns={approvalColumns} rows={data.approvals} />
      <div className="approval-actions">
        {data.approvals.map((item) => (
          <div className="approval-row" key={item.id}>
            <strong>{item.id}</strong>
            <button className="primary-button" onClick={() => onApprove(item.id, "approve")}>Approve</button>
            <button className="secondary-button" onClick={() => onApprove(item.id, "changes requested")}>Changes</button>
            <button className="danger-button" onClick={() => onApprove(item.id, "reject")}>Reject</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotificationsView({ data, roleKey }: { data: ConnectedData; roleKey: string }) {
  const [filter, setFilter] = useState<"all" | "info" | "warning" | "high">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const roleFiltered = roleFilter === "all" ? data.notifications : data.notifications.filter(n => (n.type ?? "").toLowerCase().includes(roleFilter));
  const filtered = filter === "all" ? roleFiltered : roleFiltered.filter(n => n.severity.toLowerCase() === filter);
  const severityCounts = {
    all: roleFiltered.length,
    high: roleFiltered.filter(n => n.severity === "critical").length,
    warning: roleFiltered.filter(n => n.severity === "warning").length,
    info: roleFiltered.filter(n => n.severity === "info").length,
  };
  const roleLabel = roleKey.charAt(0).toUpperCase() + roleKey.slice(1).replace("-", " ");
  const roleOptions = ["all", "approval", "payment", "attendance", "system", roleKey];
  const uniqueRoleOptions = [...new Set(roleOptions)];
  return (
    <section className="content-grid">
      <section className="panel">
        <PanelTitle eyebrow={`${roleLabel} Notifications`} title="Alerts, approvals and system messages" />
        <div className="office-filters" style={{marginBottom:8}}>
          {(["all", "high", "warning", "info"] as const).map(s => (
            <button key={s} className={`tool-button ${filter === s ? "primary" : ""}`} onClick={() => setFilter(s)}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className={`badge ${s === "high" ? "error" : s === "warning" ? "warning" : "info"}`} style={{marginLeft:6}}>{severityCounts[s]}</span>
            </button>
          ))}
        </div>
        <div className="office-filters">
          <span style={{fontSize:"0.82rem",color:"var(--muted)"}}>Filter by type:</span>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{fontSize:"0.82rem",padding:"4px 8px",border:"1px solid var(--border)",borderRadius:6,background:"var(--bg)"}}>
            {uniqueRoleOptions.map(r => (
              <option key={r} value={r}>{r === "all" ? "All Types" : r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>
        {filtered.length === 0 ? (
          <p className="empty-state">No {filter !== "all" ? filter : ""} notifications{roleFilter !== "all" ? ` (${roleFilter})` : ""}</p>
        ) : (
          <div style={{display:"grid",gap:8,padding:"8px 0"}}>
            {filtered.map(n => (
              <div key={n.id} className="list-row">
                <div className="dot" style={{background: n.severity === "critical" ? "#ef4444" : n.severity === "warning" ? "#f59e0b" : "#10b981"}} />
                <div>
                  <strong style={{fontSize:"0.9rem"}}>{n.title}</strong>
                  <br /><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{n.message} · {n.type}</span>
                </div>
                <span className={`badge ${n.severity === "critical" ? "error" : n.severity === "warning" ? "warning" : "info"}`}>{n.severity}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function StudentsView({ data }: { data: ConnectedData }) {
  return (
    <section className="workspace-grid">
      <section className="panel subpanel">
        <PanelTitle eyebrow="Students" title="Admissions and profiles" />
        <DataTable columns={studentColumns} rows={data.students} />
      </section>
      <section className="panel subpanel">
        <PanelTitle eyebrow="Excel Import" title="Detected totals and validation" />
        <DataTable columns={importColumns} rows={data.imports} />
      </section>
    </section>
  );
}

function StaffView({ data }: { data: ConnectedData }) {
  const [staffNotice, setStaffNotice] = useState<string | null>(null);

  return (
    <section className="panel">
      <PanelTitle eyebrow="Staff management" title="Teaching and non-teaching staff" aside={<button className="primary-button" onClick={() => setStaffNotice("Staff profile draft prepared for review.")}>Add Staff</button>} />
      {staffNotice ? <div className="notice">{staffNotice}</div> : null}
      <DataTable columns={staffColumns} rows={data.staff} />
    </section>
  );
}

function FinanceWorkspace({ data }: { data: ConnectedData; onShareFinance: () => void }) {
  const fs = data.home.finance_summary;
  const auditEntries = data.auditLogs.slice(0, 10);
  const reconciliations = [
    { period: "Term 1 2026", expected: "UGX 48,000,000", actual: "UGX 46,200,000", variance: "UGX 1,800,000", status: "Reviewed" },
    { period: "Term 2 2026", expected: "UGX 52,000,000", actual: "UGX 51,100,000", variance: "UGX 900,000", status: "Pending Review" },
  ];
  return (
    <section className="content-grid">
      <div className="metric-grid">
        <div className="metric purple"><div className="metric-icon"><ShieldCheck size={22}/></div><div className="metric-body"><strong>{fs.expected}</strong><span>Expected Revenue</span></div></div>
        <div className="metric green"><div className="metric-icon"><Activity size={22}/></div><div className="metric-body"><strong>{fs.collected}</strong><span>Verified Collections</span></div></div>
        <div className="metric red"><div className="metric-icon"><AlertTriangle size={22}/></div><div className="metric-body"><strong>{fs.outstanding}</strong><span>Outstanding</span></div></div>
        <div className="metric amber"><div className="metric-icon"><TrendingUp size={22}/></div><div className="metric-body"><strong>{fs.collection_rate}%</strong><span>Audit Confidence</span></div></div>
      </div>

      <section className="panel">
        <PanelTitle eyebrow="Reconciliation" title="Period Statements" />
        {reconciliations.map(r => (
          <div key={r.period} className="detail-cell" style={{borderLeft:`4px solid ${r.status === "Reviewed" ? "#10b981" : "#f59e0b"}`, marginBottom:8}}>
            <span>{r.period}</span>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginTop:6,fontSize:"0.88rem"}}>
              <span>Expected: <strong>{r.expected}</strong></span>
              <span>Actual: <strong>{r.actual}</strong></span>
              <span>Variance: <strong>{r.variance}</strong></span>
            </div>
            <StatusBadge value={r.status} tone={r.status === "Reviewed" ? "success" : "warning"} />
          </div>
        ))}
      </section>

      <section className="panel">
        <PanelTitle eyebrow="Audit Trail" title="Transaction Log" aside={<StatusBadge value={`${auditEntries.length} entries`} tone="info" />} />
        <div style={{display:"grid",gap:8}}>
          {auditEntries.map(a => (
            <div key={a.id} className="flag-item">
              <span><strong>{a.action}</strong><br /><small style={{color:"var(--muted)"}}>{a.actor} · {a.entity} · {a.timestamp}</small></span>
              <StatusBadge value={a.severity} tone={a.severity === "critical" ? "danger" : a.severity === "warning" ? "warning" : "info"} />
            </div>
          ))}
          {auditEntries.length === 0 && <p style={{color:"var(--muted)",padding:12}}>No audit entries recorded yet</p>}
        </div>
      </section>
    </section>
  );
}

function CommunicationView({ data, onSendSms }: { data: ConnectedData; onSendSms: (groupId: string, message: string, comment: string) => void }) {
  const [group, setGroup] = useState("all-parents");
  const [message, setMessage] = useState("Dear parent, please check the latest update about your student from Nova Demonstration School.");
  const [comment, setComment] = useState("");

  return (
    <section className="workspace-grid">
      <section className="panel subpanel">
        <PanelTitle eyebrow="SMS composer" title="Select parents and send information" />
        <div className="sms-groups">
          {data.smsGroups.map((item) => (
            <label className="sms-group" key={item.id}>
              <input type="radio" checked={group === item.id} onChange={() => setGroup(item.id)} />
              <span>
                <strong>{item.label} ({item.count})</strong>
                <small>{item.description}</small>
              </span>
            </label>
          ))}
        </div>
        <label className="form-label">
          Message
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
        </label>
        <label className="form-label">
          Admin comment
          <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Optional internal note" />
        </label>
        <button className="primary-button" onClick={() => onSendSms(group, message, comment)}>Preview and Queue SMS</button>
      </section>
      <section className="panel subpanel">
        <PanelTitle eyebrow="Communication history" title="SMS, push, email and in-app batches" />
        <DataTable columns={messageColumns} rows={data.messageBatches} />
      </section>
    </section>
  );
}

function ReportsView({ data }: { data: ConnectedData }) {
  const ss = data.home.student_summary;
  const fs = data.home.finance_summary;
  const reportSections = [
    { title: "Enrollment Analysis", icon: <Users size={20}/>, metrics: [
      { label: "Total Students", value: ss.total },
      { label: "Male/Female Ratio", value: `${ss.male}:${ss.female}` },
      { label: "Pending Admissions", value: ss.pending_admissions },
      { label: "Last Import", value: ss.last_import_batch || "N/A" },
    ]},
    { title: "Financial Health", icon: <TrendingUp size={20}/>, metrics: [
      { label: "Collection Rate", value: `${fs.collection_rate}%` },
      { label: "Outstanding", value: fs.outstanding },
      { label: "Total Collected", value: fs.collected },
      { label: "Expected Revenue", value: fs.expected },
    ]},
    { title: "Operational Overview", icon: <BarChart3 size={20}/>, metrics: [
      { label: "Active Staff", value: data.staff.length },
      { label: "Library Books", value: data.libraryBooks.length },
      { label: "Notifications", value: data.notifications.length },
      { label: "Audit Entries", value: data.auditLogs.length },
    ]},
  ];
  const reportData = reportSections.flatMap(s =>
    s.metrics.map(m => ({ Section: s.title, Metric: m.label, Value: m.value ?? "-" }))
  );
  return (
    <section className="content-grid">
      <section className="panel">
        <PanelTitle eyebrow="System Analysis" title="Full Report" />
        <div id="export-full-report" style={{display:"grid",gap:16}}>
          {reportSections.map(section => (
            <div key={section.title} className="panel" style={{padding:16}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <span style={{color:"#0891b2"}}>{section.icon}</span>
                <strong style={{fontSize:"0.95rem"}}>{section.title}</strong>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
                {section.metrics.map(m => (
                  <div key={m.label} className="detail-cell" style={{borderLeft:"3px solid #0891b2"}}>
                    <span>{m.label}</span>
                    <strong>{m.value ?? "-"}</strong>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button className="primary-button" onClick={() => printElement("export-full-report", "System Report")}><Printer size={15}/>Generate Full Report</button>
          <button className="secondary-button" onClick={() => { exportAsCSV(reportData, "system-report.csv"); }}><Download size={15}/>Export CSV</button>
        </div>
      </section>
    </section>
  );
}

function SettingsView({
  data,
  onResetPassword
}: {
  data: ConnectedData;
  onResetPassword: (currentPassword: string, newPassword: string) => Promise<string>;
}) {
  const school = data.school;
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const items = [
    ["School Name", school.name],
    ["Short Name", school.short_name],
    ["Phone", school.phone],
    ["Email", school.email],
    ["Address", school.address],
    ["Admission Format", school.admission_number_format],
    ["Primary Color", school.primary_color],
    ["Secondary Color", school.secondary_color],
    ["Cashless Payments", school.cashless_enabled ? "Enabled" : "Disabled"]
  ];

  return (
    <section className="workspace-grid">
      <section className="panel subpanel">
        <PanelTitle eyebrow="Settings" title="School profile and branding" aside={<button className="primary-button" onClick={() => setSettingsNotice("School settings queued for sync.")}>Save Settings</button>} />
        {settingsNotice ? <div className="notice">{settingsNotice}</div> : null}
        <div className="profile-grid">
          {items.map(([label, value]) => (
            <div className="profile-item" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel subpanel">
        <PanelTitle eyebrow="Account security" title="Change password" />
        {passwordNotice ? <div className="notice">{passwordNotice}</div> : null}
        {passwordError ? <div className="notice notice-error">{passwordError}</div> : null}
        <form
          className="security-form"
          onSubmit={(event) => {
            event.preventDefault();
            setPasswordNotice(null);
            setPasswordError(null);

            if (passwordForm.newPassword !== passwordForm.confirmPassword) {
              setPasswordError("New password and confirmation do not match.");
              return;
            }

            setPasswordSaving(true);
            onResetPassword(passwordForm.currentPassword, passwordForm.newPassword)
              .then((message) => {
                setPasswordNotice(message);
                setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
              })
              .catch((error: Error) => setPasswordError(error.message))
              .finally(() => setPasswordSaving(false));
          }}
        >
          <label className="form-label">
            Current password
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((form) => ({ ...form, currentPassword: event.target.value }))}
              required
            />
          </label>
          <label className="form-label">
            New password
            <input
              type="password"
              minLength={8}
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm((form) => ({ ...form, newPassword: event.target.value }))}
              required
            />
          </label>
          <label className="form-label">
            Confirm password
            <input
              type="password"
              minLength={8}
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm((form) => ({ ...form, confirmPassword: event.target.value }))}
              required
            />
          </label>
          <div className="security-actions">
            <button className="primary-button" type="submit" disabled={passwordSaving}>
              {passwordSaving ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

const ROLE_COLORS: Record<string, string> = {
  "super-admin": "#dc2626", admin: "#0891b2", teacher: "#059669",
  bursar: "#7c3aed", secretary: "#ea580c", librarian: "#4f46e5",
  parent: "#e11d48", student: "#ca8a04", "ict-admin": "#6366f1",
};

function ProfileModal({ session, data, roleKey, onClose }: { session: Session; data: ConnectedData | null; roleKey: string; onClose: () => void }) {
  if (!data) return null;
  const accent = ROLE_COLORS[roleKey] ?? "#0891b2";
  const roleNav = data.nav;
  const [photo, setPhoto] = useState(session.user.profile_photo || "");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div id="profile-modal" className="modal-panel" onClick={e => e.stopPropagation()} style={{borderTop:`4px solid ${accent}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            {photo ? (
              <img src={photo} alt="" style={{width:52,height:52,borderRadius:"50%",objectFit:"cover",border:`3px solid ${accent}`}} />
            ) : (
              <div className="user-avatar" style={{width:52,height:52,fontSize:"1.3rem",background:`linear-gradient(135deg,${accent},#764ba2)`}}>
                {session.user.full_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <strong style={{fontSize:"1.1rem"}}>{session.user.full_name}</strong>
              <br /><span style={{color:"var(--muted)",fontSize:"0.85rem"}}>{session.user.role} · {session.user.school}</span>
            </div>
          </div>
          <button className="tool-button" style={{minHeight:32,minWidth:32,padding:0}} onClick={onClose}>✕</button>
        </div>

        <div style={{marginBottom:16}}>
          <span style={{fontSize:"0.82rem",color:"var(--muted)",fontWeight:600}}>Passport Photo</span>
          <PhotoCapture onPhoto={setPhoto} initialPhoto={photo} compact />
        </div>

        <div className="profile-grid-detail">
          <div className="detail-cell" style={{borderLeft:`3px solid ${accent}`}}>
            <span>Email</span>
            <strong>{session.user.email}</strong>
          </div>
          <div className="detail-cell" style={{borderLeft:`3px solid ${accent}`}}>
            <span>Role</span>
            <strong>{session.user.role}</strong>
          </div>
          <div className="detail-cell" style={{borderLeft:`3px solid ${accent}`}}>
            <span>School</span>
            <strong>{session.user.school}</strong>
          </div>
          <div className="detail-cell" style={{borderLeft:`3px solid ${accent}`}}>
            <span>Dashboard Views</span>
            <strong>{roleNav.length}</strong>
          </div>
        </div>

        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12}}>
          {roleNav.map(n => (
            <span key={n} className="badge" style={{borderColor:`${accent}40`,color:accent,background:`${accent}15`}}>{n}</span>
          ))}
        </div>

        <div style={{marginTop:20,borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:16}}>
          <TwoFactorSetup />
        </div>
        <p style={{color:"var(--muted)",fontSize:"0.82rem",marginTop:20,marginBottom:0}}>
          Logged in since this session · Role-based dashboard active
        </p>
      </div>
    </div>
  );
}

export default App;
