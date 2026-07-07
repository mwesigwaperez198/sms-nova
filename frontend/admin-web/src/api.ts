import type {
  AttendanceRecord,
  AuditLogEntry,
  FeeBalance,
  FinanceDocument,
  FullStudentRecord,
  ImportBatch,
  LibraryBook,
  MessageBatch,
  MessageRecord,
  Metric,
  PaymentRecord,
  ReceiptRecord,
  RequestedBook,
  RoleKey,
  SecretaryDocument,
  StaffRecord,
  StatusItem,
  StudentAssessment,
  StudentLibraryBook,
  StudentRecord,
  SystemAlert,
  SystemSchool,
  TeacherClass,
  AdminHomeData,
  AdminNotification,
  ApprovalItem,
  SchoolProfile,
  SmsRecipientGroup
} from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

// In-memory token refresh lock to prevent multiple simultaneous refreshes
let refreshPromise: Promise<string> | null = null;

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const token = sessionStorage.getItem("novara_token");

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (response.status === 401 && token) {
    const newToken = await attemptTokenRefresh();
    if (newToken) {
      const retryResponse = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
          ...(init?.headers ?? {})
        }
      });
      if (retryResponse.ok) {
        return retryResponse.json() as Promise<T>;
      }
    }
    clearSessionTokens();
    throw new Error("Session expired. Please login again.");
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(detail.detail ?? "Request failed");
  }
  return response.json() as Promise<T>;
}

async function attemptTokenRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = sessionStorage.getItem("novara_refresh_token");
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const result = await fetch(`${API_URL}/api/v1/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      if (!result.ok) return null;
      const data = await result.json();
      sessionStorage.setItem("novara_token", data.access_token);
      return data.access_token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ===================== Auth =====================

export interface Session {
  token: string;
  refreshToken: string;
  user: {
    email: string;
    full_name: string;
    role: string;
    role_key: RoleKey;
    school: string;
  };
}

const roleMap: Record<number, RoleKey> = {
  1: "super-admin", 2: "admin", 3: "teacher",
  4: "parent", 5: "student", 6: "bursar", 7: "secretary", 8: "librarian"
};

const roleLabels: Record<RoleKey, string> = {
  "super-admin": "Super Admin", admin: "Admin", teacher: "Teacher",
  parent: "Parent", student: "Student", bursar: "Bursar",
  secretary: "Secretary", librarian: "Librarian"
};

export async function login(email: string, password: string): Promise<Session> {
  const result = await apiRequest<{
    access_token: string;
    refresh_token: string;
    user: { id: number; name: string; email: string; role_id: number; school_id: number | null };
  }>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

  const roleKey = roleMap[result.user.role_id] ?? "admin";
  sessionStorage.setItem("novara_token", result.access_token);
  sessionStorage.setItem("novara_refresh_token", result.refresh_token);

  return {
    token: result.access_token,
    refreshToken: result.refresh_token,
    user: {
      email: result.user.email,
      full_name: result.user.name,
      role: roleLabels[roleKey] ?? "User",
      role_key: roleKey,
      school: "NOVARA School"
    }
  };
}

export function clearSessionTokens(): void {
  sessionStorage.removeItem("novara_token");
  sessionStorage.removeItem("novara_refresh_token");
}

export async function resetPassword(currentPassword: string, newPassword: string): Promise<string> {
  const result = await apiRequest<{ detail: string }>("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
  });
  return result.detail;
}

// ===================== Helpers =====================

function mapStudent(s: any): StudentRecord {
  return {
    admissionNo: s.admission_number ?? "",
    name: s.name,
    gender: s.gender ?? "Male",
    className: s.class_name ?? "",
    stream: s.stream_name ?? "",
    guardian: s.guardian_name ?? "",
    status: s.is_active ? "Active" : "Inactive"
  };
}

function mapTeacherToStaff(t: any): StaffRecord {
  return {
    staffNo: String(t.id),
    name: t.name,
    role: "Teacher",
    department: t.department ?? "Academic",
    status: t.is_active ? "Active" : "Inactive"
  };
}

// ===================== Data Loading =====================

const DEFAULT_HOME: AdminHomeData = {
  student_summary: { total: 0, male: 0, female: 0, pending_admissions: 0, last_import_batch: "" },
  finance_summary: { expected: "UGX 0", collected: "UGX 0", outstanding: "UGX 0", collection_rate: 0 },
  enrollment_by_class: [],
  attendance_by_class: [],
  performance_by_class: [],
  finance_trend: []
};

const ROLE_NAV: Record<RoleKey, string[]> = {
  "super-admin": ["Dashboard", "Schools", "Audit Log", "System Alerts", "Support"],
  admin: ["Home", "Approvals", "Students", "Staff", "Finance", "Communication", "Reports", "Settings", "Notifications"],
  secretary: ["Register Student", "Student Profiles", "Import Students", "Guardians", "Documents"],
  bursar: ["Fee Accounts", "Payments", "Receipts", "Vouchers", "Cashbook", "Reports"],
  librarian: ["Catalog", "Issue & Return", "Book Requests", "Upload to Students", "Reports"],
  teacher: ["My Classes", "Attendance", "Assessments", "Report Remarks", "Messages"],
  parent: ["Home", "Fees", "Receipts", "Attendance", "Report Card", "Messages"],
  student: ["Dashboard", "My Fees", "Attendance", "Report Card", "Library", "Announcements"]
};

export interface ConnectedData {
  school: SchoolProfile;
  metrics: Metric[];
  nav: string[];
  home: AdminHomeData;
  notifications: AdminNotification[];
  approvals: ApprovalItem[];
  students: StudentRecord[];
  fullStudents: FullStudentRecord[];
  imports: ImportBatch[];
  financeDocuments: FinanceDocument[];
  payments: PaymentRecord[];
  receipts: ReceiptRecord[];
  feeBalances: FeeBalance[];
  libraryBooks: LibraryBook[];
  studentLibraryBooks: StudentLibraryBook[];
  requestedBooks: RequestedBook[];
  staff: StaffRecord[];
  messageBatches: MessageBatch[];
  parentMessages: MessageRecord[];
  studentMessages: MessageRecord[];
  smsGroups: SmsRecipientGroup[];
  redFlags: StatusItem[];
  teacherClasses: TeacherClass[];
  assessmentData: Record<string, StudentAssessment[]>;
  attendanceData: Record<string, AttendanceRecord[]>;
  secretaryDocuments: SecretaryDocument[];
  auditLogs: AuditLogEntry[];
  systemSchools: SystemSchool[];
  systemAlerts: SystemAlert[];
}

export async function loadConnectedData(role: RoleKey): Promise<ConnectedData> {
  const results = await Promise.allSettled([
    apiRequest<any>("/api/v1/admin/overview").catch(() => null),
    apiRequest<any[]>("/api/v1/students/list").catch(() => []),
    apiRequest<any[]>("/api/v1/admin/teachers").catch(() => []),
    apiRequest<any[]>("/api/v1/library/books?limit=50").catch(() => []),
    apiRequest<any[]>("/api/v1/admin/audit-logs").catch(() => []),
    apiRequest<any[]>("/api/v1/notifications").catch(() => []),
  ]);

  const [overview, studentsList, teachersList, libraryBooksList, auditLogsList, notificationsList] = results.map(r => r.status === "fulfilled" ? r.value : null);

  const students: StudentRecord[] = (studentsList ?? []).map(mapStudent);
  const staff: StaffRecord[] = (teachersList ?? []).map(mapTeacherToStaff);
  const libraryBooks: LibraryBook[] = (libraryBooksList ?? []).map((b: any) => ({
    code: String(b.id),
    title: b.title ?? b.name ?? "",
    shelf: b.shelf_location ?? "",
    available: b.available_copies ?? 0,
    borrowed: b.borrowed_copies ?? 0,
    status: (b.available_copies ?? 0) > 0 ? "Available" : "Borrowed"
  }));
  const auditLogs: AuditLogEntry[] = (auditLogsList ?? []).map((l: any) => ({
    id: String(l.id),
    action: l.action ?? "",
    actor: l.actor_name ?? "",
    role: String(l.actor_role_id ?? ""),
    school: "",
    entity: l.entity_type ?? "",
    timestamp: l.created_at ?? "",
    severity: "info"
  }));

  const home: AdminHomeData = overview ? {
    student_summary: {
      total: overview.students_count ?? 0,
      male: 0, female: 0,
      pending_admissions: 0,
      last_import_batch: ""
    },
    finance_summary: {
      expected: overview.total_invoiced ?? "UGX 0",
      collected: overview.total_paid ?? "UGX 0",
      outstanding: overview.outstanding_balance ?? "UGX 0",
      collection_rate: 0
    },
    enrollment_by_class: [],
    attendance_by_class: [],
    performance_by_class: [],
    finance_trend: []
  } : DEFAULT_HOME;

  return {
    school: {
      name: "NOVARA School",
      short_name: "NOVA",
      primary_color: "#1e40af",
      secondary_color: "#3b82f6",
      accent_color: "#f59e0b",
      term: "Term 2",
      academic_year: "2026",
      address: "",
      phone: "",
      email: "",
      cashless_enabled: false,
      admission_number_format: "NDS-{YEAR}-{SEQ4}"
    },
    metrics: [],
    nav: ROLE_NAV[role] ?? [],
    home,
    notifications: (notificationsList ?? []).map((n: any) => ({
      id: String(n.id),
      title: n.title ?? n.message ?? "",
      message: n.message ?? "",
      type: n.type ?? "info",
      severity: n.severity ?? "info",
      status: n.status ?? "Unread"
    })),
    approvals: [],
    students,
    fullStudents: [],
    imports: [],
    financeDocuments: [],
    payments: [],
    receipts: [],
    feeBalances: [],
    libraryBooks,
    studentLibraryBooks: [],
    requestedBooks: [],
    staff,
    messageBatches: [],
    parentMessages: [],
    studentMessages: [],
    smsGroups: [
      { id: "all-parents", label: "All Parents", count: 0, description: "", roleId: 4 },
      { id: "debtors", label: "Fee Debtors", count: 0, description: "", roleId: 4 },
      { id: "all-teachers", label: "All Teachers", count: 0, description: "", roleId: 3 },
      { id: "all-bursars", label: "All Bursars", count: 0, description: "", roleId: 6 },
      { id: "all-secretaries", label: "All Secretaries", count: 0, description: "", roleId: 7 },
      { id: "all-librarians", label: "All Librarians", count: 0, description: "", roleId: 8 },
    ],
    redFlags: [],
    teacherClasses: [],
    assessmentData: {},
    attendanceData: {},
    secretaryDocuments: [],
    auditLogs,
    systemSchools: [],
    systemAlerts: []
  };
}

// ===================== Legacy stubs (transitional) =====================

export async function shareFinanceDocument(_doc: string): Promise<string> {
  return "Document shared to Admin inbox.";
}

export async function shareRequestedBooks(): Promise<string> {
  return "Book requests forwarded to Admin for approval.";
}

export async function approvalDecision(id: string, decision: string): Promise<string> {
  return `${id} marked as ${decision}.`;
}

export async function sendSmsBatch(groupId: string, message: string, _comment: string): Promise<string> {
  const roleMap: Record<string, number> = {
    "all-parents": 4,
    "debtors": 4,
    "all-teachers": 3,
    "all-bursars": 6,
    "all-secretaries": 7,
    "all-librarians": 8,
    "all-admins": 2
  };
  const roleId = roleMap[groupId] ?? 4;
  const result = await apiRequest<{ queued: number; failed: number; details: string[] }>(
    "/api/v1/notifications/sms",
    {
      method: "POST",
      body: JSON.stringify({
        role_id: roleId,
        title: "SMS Broadcast",
        message
      })
    }
  );
  return `SMS queued: ${result.queued} sent, ${result.failed} failed.`;
}

export async function sendRoleNotification(roleId: number, title: string, message: string): Promise<void> {
  await apiRequest("/api/v1/notifications/role", {
    method: "POST",
    body: JSON.stringify({ role_id: roleId, title, message })
  });
}
