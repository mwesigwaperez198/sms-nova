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
  SmsRecipientGroup,
  StudentSelfData,
  ChildInfo,
  ChildData,
  TeacherClassInfo,
  ICTSystemHealth,
  GuardianInfo,
  LibraryBorrow,
  OverdueBook
} from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "https://sms-msku.onrender.com";
const REQUEST_TIMEOUT = 30_000;

// In-memory token refresh lock to prevent multiple simultaneous refreshes
let refreshPromise: Promise<string> | null = null;

export async function apiRequest<T>(path: string, init?: RequestInit, timeout?: number): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const token = sessionStorage.getItem("novara_token");
  const ms = timeout ?? REQUEST_TIMEOUT;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
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
          signal: controller.signal,
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
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error(`Request timed out after ${ms / 1000}s: ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
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
    profile_photo?: string;
  };
}

export const roleMap: Record<number, RoleKey> = {
  1: "super-admin", 2: "admin", 3: "teacher",
  4: "parent", 5: "student", 6: "bursar", 7: "secretary", 8: "librarian", 9: "ict-admin", 10: "headteacher"
};

export const roleLabels: Record<RoleKey, string> = {
  "super-admin": "Super Admin", admin: "Admin", teacher: "Teacher",
  parent: "Parent", student: "Student", bursar: "Bursar",
  secretary: "Secretary", librarian: "Librarian", "ict-admin": "ICT Admin", headteacher: "Head Teacher"
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
      school: result.user.school?.name ?? "NOVARA School",
      profile_photo: (result.user as any).profile_photo ?? ""
    }
  };
}

export interface TwoFactorChallenge {
  requires_2fa: true;
  temp_token: string;
}

export interface FaceChallenge {
  requires_face: true;
  temp_token: string;
}

export type LoginChallenge = Session | TwoFactorChallenge | FaceChallenge;

export async function login(email: string, password: string): Promise<LoginChallenge> {
  const result = await apiRequest<any>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (result.requires_2fa) {
    return { requires_2fa: true, temp_token: result.temp_token };
  }

  if (result.requires_face) {
    return { requires_face: true, temp_token: result.temp_token };
  }

  return mapUserToSession(result);
}

export async function verify2faLogin(tempToken: string, code: string): Promise<Session | FaceChallenge> {
  const result = await apiRequest<any>("/api/v1/auth/verify-2fa-login", {
    method: "POST",
    body: JSON.stringify({ temp_token: tempToken, code }),
  });

  if (result.requires_face) {
    return { requires_face: true, temp_token: result.temp_token };
  }

  return mapUserToSession(result);
}

export async function verifyFaceLogin(tempToken: string, imageData: string): Promise<Session> {
  const result = await apiRequest<any>("/api/v1/auth/verify-face-login", {
    method: "POST",
    body: JSON.stringify({ temp_token: tempToken, image_data: imageData }),
  });

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
    status: s.is_active ? "Active" : "Inactive",
    userId: s.user_id ?? null,
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

// ===================== Device Cache (role-based) =====================

interface CacheEntry {
  data: ConnectedData;
  timestamp: number;
}

function cacheKey(role: RoleKey): string {
  return `novara_cache_${role}`;
}

function getCachedData(role: RoleKey): ConnectedData | null {
  try {
    const raw = localStorage.getItem(cacheKey(role));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    return entry.data as ConnectedData;
  } catch {
    return null;
  }
}

function setCachedData(role: RoleKey, data: ConnectedData): void {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(cacheKey(role), JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable
  }
}

export function clearCachedData(role?: RoleKey): void {
  if (role) {
    localStorage.removeItem(cacheKey(role));
  } else {
    Object.keys(localStorage)
      .filter(k => k.startsWith("novara_cache_"))
      .forEach(k => localStorage.removeItem(k));
  }
}

export function getCacheAge(role: RoleKey): number | null {
  try {
    const raw = localStorage.getItem(cacheKey(role));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    return Math.floor((Date.now() - entry.timestamp) / 1000);
  } catch {
    return null;
  }
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
  "super-admin": ["Dashboard", "Schools", "Registrations", "Keys", "Plans", "Audit Log", "Users", "System Alerts", "System Check", "Support"],
  admin: ["Home", "Approvals", "Students", "Staff", "Finance", "Communication", "Reports", "Settings", "Notifications"],
  headteacher: ["Dashboard", "Staff", "Attendance", "Performance", "Leave Requests", "Messages"],
  secretary: ["Register Student", "Student Profiles", "Import Students", "Guardians", "Documents"],
  bursar: ["Home", "Payments", "Receipts", "Cashbook", "Quotations", "Requisitions", "Reports", "Settings"],
  librarian: ["Catalog", "Issue & Return", "Book Requests", "Upload to Students", "Reports"],
  teacher: ["My Classes", "Attendance", "Assessments", "Report Remarks", "Messages"],
  parent: ["Home", "Fees", "Receipts", "Attendance", "Report Card", "Messages"],
  student: ["Dashboard", "My Fees", "Attendance", "Report Card", "Library", "Announcements"],
  "ict-admin": ["Dashboard", "User Verification", "System Health", "Notifications"]
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

async function fetchConnectedData(role: RoleKey): Promise<ConnectedData> {
  const results = await Promise.allSettled([
    apiRequest<any>("/api/v1/admin/overview").catch(() => null),
    apiRequest<any[]>("/api/v1/students/list").catch(() => []),
    apiRequest<any[]>("/api/v1/admin/teachers").catch(() => []),
    apiRequest<any[]>("/api/v1/library/books?limit=50").catch(() => []),
    apiRequest<any[]>("/api/v1/admin/audit-logs").catch(() => []),
    apiRequest<any[]>("/api/v1/notifications").catch(() => []),
    apiRequest<any[]>("/api/v1/fees/payments/list").catch(() => []),
    apiRequest<any[]>("/api/v1/fees/receipts/list").catch(() => []),
    apiRequest<any[]>("/api/v1/fees/balances").catch(() => []),
    apiRequest<any[]>("/api/v1/fees/invoices/list").catch(() => []),
    apiRequest<any[]>("/api/v1/fees/categories/list").catch(() => []),
  ]);

  const [overview, studentsList, teachersList, libraryBooksList, auditLogsList, notificationsList, paymentsList, receiptsList, balancesList, invoicesList, categoriesList] = results.map(r => r.status === "fulfilled" ? r.value : null);

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
    entity: l.entity_type ?? l.entity ?? "",
    detail: l.entity_id ? `#${l.entity_id}` : (l.detail ?? ""),
    timestamp: l.created_at ?? "",
    severity: "info"
  }));

  const payments: PaymentRecord[] = (paymentsList ?? []).map((p: any) => ({
    reference: String(p.id ?? p.reference ?? ""),
    student: p.student_name ?? p.admission_number ?? "",
    method: p.payment_method ?? p.method ?? "",
    amount: p.amount != null ? `UGX ${Number(p.amount).toLocaleString()}` : "UGX 0",
    date: p.created_at ?? p.date ?? "",
    status: p.status ?? "Pending",
  }));

  const receipts: ReceiptRecord[] = (receiptsList ?? []).map((r: any) => ({
    receiptNo: String(r.id ?? r.receipt_number ?? ""),
    student: r.student_name ?? "",
    amount: r.amount != null ? `UGX ${Number(r.amount).toLocaleString()}` : "UGX 0",
    method: r.payment_method ?? "",
    date: r.created_at ?? r.date ?? "",
    issuedBy: r.issued_by_name ?? "",
  }));

  const feeBalances: FeeBalance[] = (balancesList ?? []).map((b: any) => ({
    student: b.student_name ?? b.name ?? "",
    className: b.class_name ?? "",
    expected: b.total_invoiced != null ? `UGX ${Number(b.total_invoiced).toLocaleString()}` : "UGX 0",
    paid: b.total_paid != null ? `UGX ${Number(b.total_paid).toLocaleString()}` : "UGX 0",
    balance: b.balance != null ? `UGX ${Number(b.balance).toLocaleString()}` : "UGX 0",
    status: (b.balance ?? 0) > 0 ? "Owing" : "Cleared",
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
    payments,
    receipts,
    feeBalances,
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

export async function loadConnectedData(role: RoleKey, onRefresh?: (fresh: ConnectedData) => void): Promise<ConnectedData> {
  const cached = getCachedData(role);

  if (cached) {
    fetchConnectedData(role).then(fresh => {
      setCachedData(role, fresh);
      onRefresh?.(fresh);
    }).catch(() => {
      // API unavailable — cached data already returned
    });
    return cached;
  }

  try {
    const fresh = await fetchConnectedData(role);
    setCachedData(role, fresh);
    return fresh;
  } catch (error) {
    throw error;
  }
}

// ===================== Legacy stubs (transitional) =====================

export async function shareFinanceDocument(_docId: string, _targetRole: string = ""): Promise<string> {
  return "Document shared.";
}

export async function shareRequestedBooks(): Promise<string> {
  return "Book requests forwarded for approval.";
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
  plan_id?: number | null;
  payment_method: "mobile_money" | "bank_account";
  payment_details: string;
}): Promise<{ id: number; message: string }> {
  return apiRequest("/api/v1/registration/register-school", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function checkRegistrationEmail(email: string): Promise<{ registered: boolean; status: string | null; request_id: number | null; school_name?: string }> {
  return apiRequest(`/api/v1/registration/check-email/${encodeURIComponent(email)}`);
}

export async function completeRegistration(payload: {
  key: string;
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  profile_photo?: string;
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
  plan_id: number | null;
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
  entity_id: number | null;
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
  return apiRequest("/api/v1/subscriptions/plans");
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

// ─── API Key Endpoints ──────────────────────────────────────

export interface ApiKeyItem {
  id: number;
  key_prefix: string;
  description: string | null;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export async function fetchApiKeys(schoolId?: number): Promise<ApiKeyItem[]> {
  const qs = schoolId ? `?school_id=${schoolId}` : "";
  return apiRequest(`/api/v1/platform/api-keys${qs}`);
}

export async function generateApiKey(schoolId: number, description?: string, expiresInDays?: number): Promise<{ api_key: string; id: number; message: string }> {
  return apiRequest("/api/v1/platform/api-keys/generate", {
    method: "POST",
    body: JSON.stringify({ school_id: schoolId, description, expires_in_days: expiresInDays ?? 365 }),
  });
}

export async function revokeApiKey(keyId: number): Promise<{ detail: string }> {
  return apiRequest(`/api/v1/platform/api-keys/${keyId}/revoke`, { method: "POST" });
}

// ─── System Check Endpoints ─────────────────────────────────

export interface SystemCheckItem {
  id: number;
  triggered_by_name: string | null;
  status: string;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  summary: string | null;
  results: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
}

export async function triggerSystemCheck(): Promise<{ id: number; scheduled_for: string; message: string }> {
  return apiRequest("/api/v1/platform/system-check/trigger", { method: "POST" });
}

export async function fetchSystemChecks(limit?: number): Promise<SystemCheckItem[]> {
  const qs = limit ? `?limit=${limit}` : "";
  return apiRequest(`/api/v1/platform/system-checks${qs}`);
}

// ─── Add School Endpoint ────────────────────────────────────

export interface AddSchoolPayload {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  country?: string;
  timezone?: string;
  admin_name: string;
  admin_email: string;
  admin_password?: string;
  plan_id: number;
}

export interface AddSchoolResult {
  school_id: number;
  school_code: string;
  admin_user_id: number;
  message: string;
}

export async function addSchool(payload: AddSchoolPayload): Promise<AddSchoolResult> {
  return apiRequest("/api/v1/platform/add-school", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Role-Specific Endpoints ─────────────────────────────────

export async function fetchStudentSelfData(): Promise<any> {
  return apiRequest("/api/v1/me/student-data");
}

export async function fetchParentChildren(): Promise<any[]> {
  return apiRequest("/api/v1/me/children");
}

export async function fetchParentChildData(studentId: number): Promise<any> {
  return apiRequest(`/api/v1/me/child/${studentId}/data`);
}

export async function fetchTeacherClasses(): Promise<any[]> {
  return apiRequest("/api/v1/teacher/classes");
}

export async function fetchICTSystemHealth(): Promise<any> {
  return apiRequest("/api/v1/ict/system-health");
}

export async function fetchSecretaryGuardianList(): Promise<any[]> {
  return apiRequest("/api/v1/secretary/guardian-list");
}

export async function fetchLibrarianActiveBorrows(): Promise<any[]> {
  return apiRequest("/api/v1/librarian/active-borrows");
}

export async function fetchLibrarianOverdue(): Promise<any[]> {
  return apiRequest("/api/v1/librarian/overdue");
}

// ─── Finance Endpoints (DB-backed) ───────────────────────────

export async function fetchCashbook(): Promise<any[]> {
  return apiRequest("/api/v1/finance/cashbook");
}

export async function createCashEntry(payload: {
  date: string;
  description: string;
  amount: number;
  paid_by: string;
  payment_method: string;
  entry_type?: string;
}): Promise<any> {
  return apiRequest("/api/v1/finance/cash-entry", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchQuotations(): Promise<any[]> {
  return apiRequest("/api/v1/finance/quotations");
}

export async function createQuotation(payload: {
  customer: string;
  date: string;
  items: Array<{ description: string; qty: number; unit_price: number; total: number }>;
  notes?: string;
}): Promise<any> {
  return apiRequest("/api/v1/finance/quotations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchRequisitions(): Promise<any[]> {
  return apiRequest("/api/v1/finance/requisitions");
}

export async function createRequisition(payload: {
  department: string;
  requested_by: string;
  date: string;
  items: Array<{ description: string; qty: number; estimated_cost: number; total: number }>;
  purpose?: string;
}): Promise<any> {
  return apiRequest("/api/v1/finance/requisitions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchBankAccount(): Promise<any> {
  return apiRequest("/api/v1/finance/bank-account");
}

export async function updateBankAccount(payload: {
  bank_name: string;
  account_name: string;
  account_number: string;
}): Promise<any> {
  return apiRequest("/api/v1/finance/bank-account", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ─── School Settings ─────────────────────────────────────────

export async function fetchSchoolSettings() {
  return apiRequest<any>("/api/v1/admin/school-settings");
}

export async function updateSchoolSettings(data: { name?: string; email?: string; phone?: string; address?: string }) {
  return apiRequest<any>("/api/v1/admin/school-settings", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ─── Fee Endpoints ───────────────────────────────────────────

export async function fetchFeePayments() {
  return apiRequest<any[]>("/api/v1/fees/payments/list").catch(() => []);
}

export async function fetchFeeReceipts() {
  return apiRequest<any[]>("/api/v1/fees/receipts/list").catch(() => []);
}

export async function fetchFeeBalances() {
  return apiRequest<any[]>("/api/v1/fees/balances").catch(() => []);
}

export async function fetchFeeInvoices() {
  return apiRequest<any[]>("/api/v1/fees/invoices/list").catch(() => []);
}

export async function fetchFeeCategories() {
  return apiRequest<any[]>("/api/v1/fees/categories/list").catch(() => []);
}

// ─── Student Endpoints ───────────────────────────────────────

export async function uploadStudentPhoto(studentId: number, photoData: string): Promise<any> {
  return apiRequest(`/api/v1/students/${studentId}/photo`, {
    method: "POST",
    body: JSON.stringify({ photo_data: photoData }),
  });
}

// ─── Secretary: Create Student + Link Guardian ────────────────

export async function createStudent(payload: {
  name: string;
  admission_number?: string;
  class_name?: string;
  stream_name?: string;
}): Promise<any> {
  return apiRequest("/api/v1/students/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function linkStudentGuardian(studentId: number, payload: {
  guardian_id: number;
  relationship?: string;
  is_primary?: boolean;
}): Promise<any> {
  return apiRequest(`/api/v1/students/${studentId}/guardians`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Librarian: Issue / Return ────────────────────────────────

export async function issueBook(payload: {
  book_id: number;
  borrower_id: number;
  due_date: string;
}): Promise<any> {
  return apiRequest("/api/v1/library/borrows", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function returnBook(borrowId: number): Promise<any> {
  return apiRequest(`/api/v1/library/borrows/${borrowId}/return`, {
    method: "PATCH",
  });
}

// ─── Librarian: Add Book ──────────────────────────────────────

export async function addLibraryBook(payload: {
  title: string;
  author?: string;
  isbn?: string;
  shelf_location?: string;
  total_copies?: number;
  available_copies?: number;
  subject_area?: string;
}): Promise<any> {
  return apiRequest("/api/v1/library/books", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Librarian: Submit Book Request ───────────────────────────

export async function submitBookRequest(payload: {
  title: string;
  subject?: string;
  reason?: string;
  priority?: string;
}): Promise<any> {
  return apiRequest("/api/v1/library/requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
