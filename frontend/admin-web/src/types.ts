import type { LucideIcon } from "lucide-react";

export type RoleKey =
  | "super-admin"
  | "admin"
  | "secretary"
  | "bursar"
  | "librarian"
  | "teacher"
  | "parent"
  | "student";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface RoleProfile {
  key: RoleKey;
  label: string;
  email: string;
  title: string;
  accent: string;
  icon: LucideIcon;
  nav: string[];
}

export interface Metric {
  label: string;
  value: string;
  hint: string;
  tone: StatusTone;
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
}

export interface StatusItem {
  label: string;
  value: string;
  tone: StatusTone;
}

export interface StudentRecord {
  admissionNo: string;
  name: string;
  gender: "Male" | "Female";
  className: string;
  stream: string;
  guardian: string;
  guardianPhone?: string;
  status: string;
}

export interface FullStudentRecord {
  admissionNo: string;
  name: string;
  gender: "Male" | "Female";
  dob: string;
  className: string;
  stream: string;
  previousSchool: string;
  guardian: string;
  guardianContact: string;
  guardianAddress: string;
  parentsAlive: string;
  skills: string[];
  desiredSkills: string[];
  status: string;
  photoUrl?: string;
}

export interface FinanceDocument {
  number: string;
  type: string;
  title: string;
  amount: string;
  preparedBy: string;
  status: string;
}

export interface PaymentRecord {
  reference: string;
  student: string;
  method: string;
  amount: string;
  date: string;
  status: string;
}

export interface ReceiptRecord {
  receiptNo: string;
  student: string;
  amount: string;
  method: string;
  date: string;
  issuedBy: string;
}

export interface FeeBalance {
  student: string;
  className: string;
  expected: string;
  paid: string;
  balance: string;
  status: string;
}

export interface ImportBatch {
  batch: string;
  type: string;
  total: number;
  male: number;
  female: number;
  invalid: number;
  status: string;
}

export interface LibraryBook {
  code: string;
  title: string;
  shelf: string;
  available: number;
  borrowed: number;
  status: string;
}

export interface StudentLibraryBook {
  code: string;
  title: string;
  author: string;
  subject: string;
  tier: string;
  coverEmoji: string;
  hasDigital: boolean;
  available: boolean;
  source: "library" | "online";
}

export interface RequestedBook {
  title: string;
  subject: string;
  requests: number;
  priority: string;
  status: string;
  requestedBy?: string;
}

export interface StaffRecord {
  staffNo: string;
  name: string;
  role: string;
  department: string;
  status: string;
}

export interface MessageRecord {
  id: string;
  from: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  type: "announcement" | "personal" | "fee" | "attendance";
}

export interface MessageBatch {
  batch: string;
  channel: string;
  recipients: string;
  message: string;
  status: string;
}

export interface SchoolProfile {
  name: string;
  short_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  term: string;
  academic_year: string;
  address: string;
  phone: string;
  email: string;
  cashless_enabled: boolean;
  admission_number_format: string;
}

export interface ApprovalItem {
  id: string;
  type: string;
  title: string;
  submitted_by: string;
  status: string;
  priority: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: string;
  status: string;
}

export interface SmsRecipientGroup {
  id: string;
  label: string;
  count: number;
  description: string;
  roleId?: number;
}

export interface PhoneContact {
  id: number;
  name: string;
  phone: string;
  role: string;
}

export interface AdminHomeData {
  student_summary: {
    total: number;
    male: number;
    female: number;
    pending_admissions: number;
    last_import_batch: string;
  };
  finance_summary: {
    expected: string;
    collected: string;
    outstanding: string;
    collection_rate: number;
  };
  enrollment_by_class: Array<{ label: string; male: number; female: number; total: number }>;
  attendance_by_class: Array<{ label: string; present: number; absent: number; late: number }>;
  performance_by_class: Array<{ label: string; average: number; pass_rate: number }>;
  finance_trend: Array<{ label: string; collected: number; outstanding: number }>;
}

export interface TeacherClass {
  id: string;
  name: string;
  stream: string;
  subject: string;
  totalStudents: number;
}

export interface StudentAssessment {
  studentId: string;
  studentName: string;
  admissionNo: string;
  bot: number | null;
  mot: number | null;
  eot: number | null;
  average: number | null;
  grade: string;
  remarks: string;
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  admissionNo: string;
  status: "Present" | "Absent" | "Late" | "Excused";
  time?: string;
}

export interface SecretaryDocument {
  id: string;
  title: string;
  type: "admission" | "transfer" | "report" | "circular" | "upload";
  student?: string;
  date: string;
  size: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  role: string;
  school: string;
  entity: string;
  timestamp: string;
  severity: "info" | "warning" | "critical";
}

export interface SystemSchool {
  id: string;
  name: string;
  code: string;
  tier: string;
  plan: string;
  students: number;
  status: string;
  activeSince: string;
}

export interface SystemAlert {
  id: string;
  type: string;
  message: string;
  school?: string;
  severity: "info" | "warning" | "critical";
  time: string;
}
