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

const API_URL = import.meta.env.VITE_API_URL ?? "https://sms-msku.onrender.com";

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

export const roleMap: Record<number, RoleKey> = {
  1: "super-admin", 2: "admin", 3: "teacher",
  4: "parent", 5: "student", 6: "bursar", 7: "secretary", 8: "librarian", 9: "ict-admin"
};

export const roleLabels: Record<RoleKey, string> = {
  "super-admin": "Super Admin", admin: "Admin", teacher: "Teacher",
  parent: "Parent", student: "Student", bursar: "Bursar",
  secretary: "Secretary", librarian: "Librarian", "ict-admin": "ICT Admin"
};

export function mapUserToSession(result: { access_token: string; refresh_token: string; user: { id: number; name: string; email: string; role_id: number; school_id: number | null; school?: { name: string } | null } }): Session {
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
      school: result.user.school?.name ?? "NOVARA School"
    }
  };
}

export interface TwoFactorChallenge {
  requires_2fa: true;
  temp_token: string;
}

export async function login(email: string, password: string): Promise<Session | TwoFactorChallenge> {
  const result = await apiRequest<any>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (result.requires_2fa) {
    return { requires_2fa: true, temp_token: result.temp_token };
  }

  return mapUserToSession(result);
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
    id: s.id ?? 0,
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
  "super-admin": ["Dashboard", "Schools", "Registrations", "Keys", "Plans", "Audit Log", "Users", "System Alerts", "Support"],
  admin: ["Home", "Approvals", "Students", "Staff", "Finance", "Communication", "Reports", "Settings", "Notifications"],
  secretary: ["Register Student", "Student Profiles", "Import Students", "Guardians", "Documents"],
  bursar: ["Home", "Payments", "Receipts", "Cashbook", "Quotations", "Requisitions", "Reports", "Settings"],
  librarian: ["Catalog", "Issue & Return", "Book Requests", "Upload to Students", "Reports"],
  teacher: ["My Classes", "Attendance", "Assessments", "Report Remarks", "Messages"],
  parent: ["Home", "Fees", "Receipts", "Attendance", "Report Card", "Messages"],
  student: ["Dashboard", "My Fees", "Attendance", "Report Card", "Library", "Announcements"],
  "ict-admin": ["Dashboard", "School Health", "System Health", "Maintenance", "Notifications"]
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
      { id: "all-ict-admins", label: "All ICT Admins", count: 0, description: "", roleId: 9 },
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
    "all-admins": 2,
    "all-ict-admins": 9
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

// ===================== Registration =====================

export async function registerSchool(payload: {
  school_name: string;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  address?: string;
  payment_method: "mobile_money" | "bank_account";
  payment_details: string;
}): Promise<{ id: number; message: string }> {
  return apiRequest("/api/v1/registration/register-school", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function completeRegistration(payload: {
  key: string;
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}): Promise<{ message: string; school_name: string; school_code: string }> {
  return apiRequest("/api/v1/registration/complete", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ===================== 2FA =====================

export async function get2faStatus(): Promise<{ is_2fa_enabled: boolean }> {
  return apiRequest("/api/v1/auth/2fa/status");
}

export async function setup2fa(): Promise<{ secret: string; qr_uri: string; manual_code: string }> {
  return apiRequest("/api/v1/auth/2fa/setup", { method: "POST" });
}

export async function enable2fa(code: string): Promise<{ detail: string }> {
  return apiRequest("/api/v1/auth/2fa/enable", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function disable2fa(code: string): Promise<{ detail: string }> {
  return apiRequest("/api/v1/auth/2fa/disable", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function verify2faLogin(tempToken: string, code: string): Promise<{
  access_token: string;
  refresh_token: string;
  user: { id: number; name: string; email: string; role_id: number; school_id: number | null };
}> {
  return apiRequest("/api/v1/auth/verify-2fa-login", {
    method: "POST",
    body: JSON.stringify({ temp_token: tempToken, code }),
  });
}

// ===================== Attendance & Assessment =====================

export async function attendanceMark(payload: { attendance_date: string; records: { student_id: number; status: string; remarks?: string }[] }): Promise<any> {
  return apiRequest("/api/v1/attendance/mark", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitAssessment(payload: { student_id: number; academic_year: string; term: string; subject: string; assessment_type: string; score: number; remarks?: string }): Promise<any> {
  return apiRequest("/api/v1/assessments/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitBulkAssessments(records: any[]): Promise<any> {
  return apiRequest("/api/v1/assessments/bulk", {
    method: "POST",
    body: JSON.stringify({ records }),
  });
}

export async function fetchClassAssessments(class_name: string, academic_year?: string, term?: string): Promise<any[]> {
  const params = new URLSearchParams();
  if (academic_year) params.set("academic_year", academic_year);
  if (term) params.set("term", term);
  const qs = params.toString();
  return apiRequest(`/api/v1/assessments/class/${encodeURIComponent(class_name)}${qs ? `?${qs}` : ""}`);
}

// ===================== Platform Admin =====================

export interface PlatformStats {
  total_schools: number;
  active_schools: number;
  total_students: number;
  total_users: number;
  pending_registrations: number;
  active_subscriptions: number;
  expired_subscriptions: number;
  keys_generated_30d: number;
}

export interface SchoolAdminItem {
  id: number;
  name: string;
  school_code: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  subscription_status: string;
  user_count: number;
  student_count: number;
  created_at: string;
}

export interface SchoolDetail {
  id: number;
  name: string;
  school_code: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  subscription_status: string;
  country: string;
  admin_name: string | null;
  admin_email: string | null;
  student_count: number;
  user_count: number;
  created_at: string;
}

export interface RegistrationRequestItem {
  id: number;
  school_name: string;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  payment_method: string;
  payment_details: string;
  status: string;
  created_at: string;
}

export interface PlanItem {
  id: number;
  name: string;
  price: number;
  currency_code: string;
  duration_days: number;
  max_students: number | null;
  max_staff: number | null;
  features: Record<string, boolean>;
  is_active: boolean;
}

export interface KeyItem {
  id: number;
  school_name: string | null;
  plan_name: string | null;
  is_used: boolean;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  action: string;
  actor_name: string | null;
  entity: string | null;
  detail: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface PlatformUserItem {
  id: number;
  name: string;
  email: string;
  role: string | null;
  school: string | null;
  is_active: boolean;
  is_2fa_enabled: boolean;
  last_login: string | null;
  created_at: string;
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  return apiRequest("/api/v1/platform/stats");
}

export async function fetchPlatformSchools(search?: string, status?: string): Promise<SchoolAdminItem[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  const qs = params.toString();
  return apiRequest(`/api/v1/platform/schools${qs ? `?${qs}` : ""}`);
}

export async function fetchSchoolDetail(schoolId: number): Promise<SchoolDetail> {
  return apiRequest(`/api/v1/platform/schools/${schoolId}`);
}

export async function toggleSchoolStatus(schoolId: number, status: string): Promise<{ detail: string }> {
  return apiRequest(`/api/v1/platform/schools/${schoolId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function fetchRegistrations(status?: string): Promise<RegistrationRequestItem[]> {
  const qs = status ? `?status=${status}` : "";
  return apiRequest(`/api/v1/platform/registrations${qs}`);
}

export async function approveRegistration(requestId: number): Promise<{ product_key: string; expires_at: string; message: string }> {
  return apiRequest(`/api/v1/platform/registrations/${requestId}/approve`, { method: "POST" });
}

export async function fetchPlans(): Promise<PlanItem[]> {
  return apiRequest("/api/v1/platform/plans");
}

export async function createPlan(payload: {
  name: string; price: number; currency_code?: string; duration_days?: number;
  max_students?: number | null; max_staff?: number | null; features?: Record<string, boolean>;
}): Promise<PlanItem> {
  return apiRequest("/api/v1/platform/plans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchKeys(schoolId?: number, used?: boolean): Promise<KeyItem[]> {
  const params = new URLSearchParams();
  if (schoolId) params.set("school_id", String(schoolId));
  if (used !== undefined) params.set("used", String(used));
  const qs = params.toString();
  return apiRequest(`/api/v1/platform/keys${qs ? `?${qs}` : ""}`);
}

export async function generateKey(schoolId: number, planId: number): Promise<{ product_key: string; expires_at: string; message: string }> {
  return apiRequest("/api/v1/platform/keys/generate", {
    method: "POST",
    body: JSON.stringify({ school_id: schoolId, plan_id: planId }),
  });
}

export async function fetchPlatformAuditLogs(limit?: number): Promise<AuditLogItem[]> {
  const qs = limit ? `?limit=${limit}` : "";
  return apiRequest(`/api/v1/platform/audit-logs${qs}`);
}

export async function fetchPlatformUsers(): Promise<PlatformUserItem[]> {
  return apiRequest("/api/v1/platform/users");
}
