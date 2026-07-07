import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ShieldCheck, Activity, AlertTriangle, TrendingUp, Printer, Download,
  Users, BarChart3, Eye, RotateCcw
} from "lucide-react";
import {
  approvalDecision as submitApprovalDecision,
  clearSessionTokens,
  loadConnectedData,
  login,
  resetPassword,
  sendSmsBatch,
  shareFinanceDocument,
  shareRequestedBooks
} from "./api";
import type { ConnectedData, Session } from "./api";
import { AppShell } from "./components/AppShell";
import { DataTable } from "./components/DataTable";
import { LandingPage } from "./components/LandingPage";
import { LoginScreen } from "./components/LoginScreen";
import { ForgotPasswordScreen } from "./components/ForgotPasswordScreen";
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

  const activeRole = useMemo(() => roles.find((role) => role.key === roleKey) ?? roles[1], [roleKey]);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    setConnectionError(null);
    loadConnectedData(roleKey)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setView((currentView) => (result.nav.includes(currentView) ? currentView : result.nav[0] ?? "Home"));
        }
      })
      .catch((error: Error) => {
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

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setConnectionError(null);
    try {
      const nextSession = await login(email, password);
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
    return <LoginScreen loading={loading} error={connectionError} onLogin={handleLogin} onSession={handleSession} onForgotPassword={() => setShowForgotPassword(true)} />;
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
    >
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
    case "secretary":
      return <SecretaryWorkspace view={props.view} data={props.data} onViewChange={props.onViewChange} />;
    case "bursar":
      return <BursarWorkspace view={props.view} data={props.data} onShareFinance={props.onShareFinance} />;
    case "librarian":
      return <LibrarianWorkspace view={props.view} data={props.data} onShareRequestedBooks={props.onShareRequestedBooks} roleKey={props.role} />;
    case "teacher":
      return <TeacherWorkspace view={props.view} data={props.data} onSendSms={props.onSendSms} />;
    case "parent":
      return <ParentWorkspace view={props.view} data={props.data} />;
    case "student":
      return <StudentWorkspace view={props.view} data={props.data} />;
    default:
      return <SuperAdminWorkspace view={props.view} data={props.data} />;
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
  if (props.view === "Notifications") return <NotificationsView data={props.data} />;
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
          <button className={`notification-card ${notification.severity === "High" ? "high" : ""}`} key={notification.id} onClick={() => onViewChange("Notifications")}>
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

function NotificationsView({ data }: { data: ConnectedData }) {
  return (
    <section className="panel">
      <PanelTitle eyebrow="Notifications center" title="Approvals, red flags, attendance and finance alerts" />
      <DataTable columns={notificationColumns} rows={data.notifications} />
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
              <StatusBadge value={a.severity} tone={a.severity === "High" ? "danger" : a.severity === "Medium" ? "warning" : "info"} />
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
  return (
    <section className="content-grid">
      <section className="panel">
        <PanelTitle eyebrow="System Analysis" title="Full Report" />
        <div style={{display:"grid",gap:16}}>
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
          <button className="primary-button" onClick={() => window.print()}><Printer size={15}/>Generate Full Report</button>
          <button className="secondary-button"><Download size={15}/>Export PDF</button>
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

export default App;
