import {
  BadgeCheck,
  Banknote,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  LibraryBig,
  MessageSquareText,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  ClipboardCheck
} from "lucide-react";
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
  RoleProfile,
  SecretaryDocument,
  StaffRecord,
  StudentAssessment,
  StudentLibraryBook,
  StudentRecord,
  SystemAlert,
  SystemSchool,
  TeacherClass
} from "../types";

export const schoolProfile = {
  name: "Nova Demonstration School",
  shortName: "NDS",
  primaryColor: "#166534",
  secondaryColor: "#1e3a8a",
  accentColor: "#f59e0b",
  term: "Term 2",
  academicYear: "2026"
};

export const roles: RoleProfile[] = [
  {
    key: "super-admin",
    label: "Super Admin",
    email: "platform@novasms.local",
    title: "Platform Control",
    accent: "#111827",
    icon: ShieldCheck,
    nav: ["Dashboard", "Schools", "Audit Log", "System Alerts", "System Check", "Support"]
  },
  {
    key: "admin",
    label: "Headteacher",
    email: "admin@novasms.local",
    title: "School Control Center",
    accent: "#1e3a8a",
    icon: UserRoundCog,
    nav: ["Home", "Approvals", "Students", "Staff", "Finance", "Communication", "Reports", "Settings", "Notifications"]
  },
  {
    key: "headteacher",
    label: "Head Teacher",
    email: "headteacher@novasms.local",
    title: "Academic Leadership",
    accent: "#0f766e",
    icon: ClipboardCheck,
    nav: ["Dashboard", "Staff", "Attendance", "Performance", "Leave Requests", "Messages"]
  },
  {
    key: "secretary",
    label: "Secretary",
    email: "secretary@novasms.local",
    title: "Front Desk",
    accent: "#0f766e",
    icon: UsersRound,
    nav: ["Register Student", "Student Profiles", "Import Students", "Guardians", "Documents"]
  },
  {
    key: "bursar",
    label: "Bursar",
    email: "bursar@novasms.local",
    title: "Finance Office",
    accent: "#b45309",
    icon: Banknote,
    nav: ["Home", "Payments", "Receipts", "Cashbook", "Quotations", "Requisitions", "Reports", "Settings"]
  },
  {
    key: "librarian",
    label: "Librarian",
    email: "librarian@novasms.local",
    title: "Library Management",
    accent: "#4338ca",
    icon: LibraryBig,
    nav: ["Catalog", "Issue & Return", "Book Requests", "Upload to Students", "Reports"]
  },
  {
    key: "teacher",
    label: "Teacher",
    email: "teacher@novasms.local",
    title: "Teaching Workspace",
    accent: "#2563eb",
    icon: GraduationCap,
    nav: ["My Classes", "Attendance", "Assessments", "Report Remarks", "Messages"]
  },
  {
    key: "parent",
    label: "Parent",
    email: "parent@novasms.local",
    title: "Parent Portal",
    accent: "#15803d",
    icon: MessageSquareText,
    nav: ["Home", "Fees", "Receipts", "Attendance", "Report Card", "Messages"]
  },
  {
    key: "student",
    label: "Student",
    email: "student@novasms.local",
    title: "Student Portal",
    accent: "#7c3aed",
    icon: BookOpen,
    nav: ["Dashboard", "My Fees", "Attendance", "Report Card", "Library", "Announcements"]
  },
  {
    key: "ict-admin",
    label: "ICT Admin",
    email: "ict-admin@novasms.local",
    title: "System Maintenance",
    accent: "#6366f1",
    icon: UserRoundCog,
    nav: ["Home", "Approvals", "Students", "Staff", "Finance", "Communication", "Reports", "Settings", "Notifications", "System"]
  }
];

export const roleMetrics: Record<RoleKey, Metric[]> = {
  "super-admin": [
    { label: "Active Schools", value: "12", hint: "2 pending onboarding", tone: "info" },
    { label: "System Alerts", value: "3", hint: "Requires attention", tone: "warning" },
    { label: "Uptime", value: "99.8%", hint: "Last 30 days", tone: "success" }
  ],
  admin: [
    { label: "Pending Approvals", value: "7", hint: "Admissions & vouchers", tone: "warning" },
    { label: "Fee Collection", value: "79%", hint: "UGX 184.2M collected", tone: "success" },
    { label: "Today Attendance", value: "94%", hint: "52 absent across school", tone: "info" }
  ],
  headteacher: [
    { label: "Active Staff", value: "28", hint: "6 departments", tone: "info" },
    { label: "Attendance Rate", value: "91%", hint: "School-wide today", tone: "success" },
    { label: "Pending Leaves", value: "3", hint: "Awaiting decision", tone: "warning" }
  ],
  secretary: [
    { label: "New Admissions", value: "24", hint: "This week", tone: "info" },
    { label: "Pending Review", value: "9", hint: "Awaiting approval", tone: "warning" },
    { label: "Total Students", value: "1,284", hint: "Active this term", tone: "success" }
  ],
  bursar: [
    { label: "Collected", value: "UGX 184.2M", hint: "Term 2 confirmed", tone: "success" },
    { label: "Outstanding", value: "UGX 49.8M", hint: "342 debtors", tone: "danger" },
    { label: "Unmatched", value: "7", hint: "Bank slips need review", tone: "warning" }
  ],
  librarian: [
    { label: "Total Books", value: "4,456", hint: "Physical & digital", tone: "info" },
    { label: "Borrowed", value: "614", hint: "43 overdue", tone: "warning" },
    { label: "Requests", value: "37", hint: "Students awaiting books", tone: "info" }
  ],
  teacher: [
    { label: "My Classes", value: "3", hint: "P5B, P6G, S1E", tone: "info" },
    { label: "Marks Pending", value: "48", hint: "English P5 Blue", tone: "warning" },
    { label: "Messages", value: "6", hint: "Parent replies needed", tone: "warning" }
  ],
  parent: [
    { label: "Fee Balance", value: "UGX 320,000", hint: "Due end of term", tone: "warning" },
    { label: "Attendance", value: "Present", hint: "Today 8:03 AM", tone: "success" },
    { label: "Last Report", value: "B+", hint: "Term 1 — Published", tone: "info" }
  ],
  student: [
    { label: "Attendance", value: "94%", hint: "Term average", tone: "success" },
    { label: "Library Books", value: "2", hint: "1 due Friday", tone: "warning" },
    { label: "Average Score", value: "71%", hint: "Term 2 so far", tone: "info" }
  ],
  "ict-admin": [
    { label: "Pending Approvals", value: "7", hint: "Admissions & vouchers", tone: "warning" },
    { label: "Fee Collection", value: "79%", hint: "UGX 184.2M collected", tone: "success" },
    { label: "System Health", value: "Good", hint: "All services operational", tone: "success" }
  ]
};

export const students: StudentRecord[] = [
  { id: 1, admissionNo: "NDS-2026-0001", name: "Ariho Grace", gender: "Female", className: "P5", stream: "Blue", guardian: "Mugisha Sarah", status: "Active" },
  { id: 2, admissionNo: "NDS-2026-0002", name: "Namara Hope", gender: "Female", className: "P7", stream: "Blue", guardian: "Mugisha Sarah", status: "Active" },
  { id: 3, admissionNo: "NDS-2026-0003", name: "Tendo Alice", gender: "Female", className: "P5", stream: "Blue", guardian: "Tendo Robert", status: "Active" },
  { id: 4, admissionNo: "NDS-2026-0004", name: "Mugabi John", gender: "Male", className: "P4", stream: "Green", guardian: "Tendo Robert", status: "Active" },
  { id: 5, admissionNo: "NDS-2026-0005", name: "Okello Daniel", gender: "Male", className: "S1", stream: "East", guardian: "Okello Peter", status: "Pending" },
];

export const fullStudents: FullStudentRecord[] = [
  {
    admissionNo: "NDS-2026-0001",
    name: "Ariho Grace",
    gender: "Female",
    dob: "2014-03-12",
    className: "P5",
    stream: "Blue",
    previousSchool: "Kampala Junior School",
    guardian: "Mugisha Sarah",
    guardianContact: "+256 772 100001",
    guardianAddress: "Ntinda, Kampala",
    parentsAlive: "Both",
    skills: ["Art", "Music"],
    desiredSkills: ["Coding", "Design"],
    status: "Active"
  }
];

export const imports: ImportBatch[] = [
  { batch: "IMP-STU-0007", type: "Student Excel", total: 412, male: 218, female: 194, invalid: 9, status: "Needs Fixes" },
  { batch: "IMP-FIN-0003", type: "Opening Balances", total: 402, male: 0, female: 0, invalid: 3, status: "Under Review" },
  { batch: "IMP-LIB-0002", type: "Library Stock", total: 1280, male: 0, female: 0, invalid: 12, status: "Validated" }
];

export const financeDocuments: FinanceDocument[] = [
  { number: "PV-2026-042", type: "Payment Voucher", title: "Science lab supplies", amount: "UGX 2,450,000", preparedBy: "Bursar", status: "Submitted" },
  { number: "REQ-2026-031", type: "Requisition", title: "Library textbooks", amount: "UGX 6,800,000", preparedBy: "Librarian", status: "Under Review" },
  { number: "CB-2026-05", type: "Cashbook", title: "May bank cashbook", amount: "UGX 184,200,000", preparedBy: "Bursar", status: "Draft" },
  { number: "BUD-2026", type: "Annual Budget", title: "Approved annual budget", amount: "UGX 742,000,000", preparedBy: "Admin", status: "Approved" }
];

export const payments: PaymentRecord[] = [
  { reference: "BANK-882901", student: "Ariho Grace", method: "Bank Deposit", amount: "UGX 650,000", date: "2026-06-01", status: "Confirmed" },
  { reference: "MM-774812", student: "Kato Brian", method: "Mobile Money", amount: "UGX 320,000", date: "2026-06-03", status: "Confirmed" },
  { reference: "BANK-UNKNOWN-14", student: "Unmatched", method: "Bank Deposit", amount: "UGX 500,000", date: "2026-06-04", status: "Unmatched" },
  { reference: "CODE-NDS0003", student: "Namara Hope", method: "Student Code", amount: "UGX 900,000", date: "2026-06-05", status: "Confirmed" }
];

export const receipts: ReceiptRecord[] = [
  { receiptNo: "RCP-2026-0091", student: "Ariho Grace", amount: "UGX 650,000", method: "Bank Deposit", date: "2026-06-01", issuedBy: "Bursar" },
  { receiptNo: "RCP-2026-0092", student: "Kato Brian", amount: "UGX 320,000", method: "Mobile Money", date: "2026-06-03", issuedBy: "Bursar" },
  { receiptNo: "RCP-2026-0093", student: "Namara Hope", amount: "UGX 900,000", method: "Student Code", date: "2026-06-05", issuedBy: "Bursar" }
];

export const feeBalances: FeeBalance[] = [
  { student: "Ariho Grace", className: "P5 Blue", expected: "UGX 970,000", paid: "UGX 650,000", balance: "UGX 320,000", status: "Partial" },
  { student: "Kato Brian", className: "P4 Green", expected: "UGX 970,000", paid: "UGX 970,000", balance: "UGX 0", status: "Paid" },
  { student: "Namara Hope", className: "P7 Blue", expected: "UGX 970,000", paid: "UGX 900,000", balance: "UGX 70,000", status: "Partial" },
  { student: "Okello Daniel", className: "S1 East", expected: "UGX 1,200,000", paid: "UGX 0", balance: "UGX 1,200,000", status: "Unpaid" }
];

export const libraryBooks: LibraryBook[] = [
  { code: "BK-ENG-0045", title: "Primary English Reader 5", shelf: "ENG-P5-A", available: 43, borrowed: 18, status: "Available" },
  { code: "BK-MAT-0112", title: "Mathematics for Uganda P7", shelf: "MATH-P7-B", available: 3, borrowed: 27, status: "Low Stock" },
  { code: "BK-SCI-0028", title: "Integrated Science S1", shelf: "SCI-S1-C", available: 0, borrowed: 32, status: "Unavailable" },
  { code: "BK-SST-0019", title: "Social Studies P6", shelf: "SST-P6-A", available: 22, borrowed: 10, status: "Available" },
  { code: "BK-HIS-0033", title: "History & Political Education S2", shelf: "HIS-S2-B", available: 8, borrowed: 14, status: "Available" }
];

export const studentLibraryBooks: StudentLibraryBook[] = [
  { code: "SL-001", title: "Primary English Reader 5", author: "MK Publishers", subject: "English", tier: "Primary", coverEmoji: "📘", hasDigital: true, available: true, source: "library" },
  { code: "SL-002", title: "Mathematics for Uganda P5", author: "Fountain Publishers", subject: "Mathematics", tier: "Primary", coverEmoji: "📐", hasDigital: true, available: true, source: "library" },
  { code: "SL-003", title: "Integrated Science P5", author: "NCDC", subject: "Science", tier: "Primary", coverEmoji: "🔬", hasDigital: false, available: false, source: "library" },
  { code: "OL-001", title: "Khan Academy Mathematics", author: "Khan Academy", subject: "Mathematics", tier: "Primary", coverEmoji: "🌐", hasDigital: true, available: true, source: "online" },
  { code: "OL-002", title: "BBC Bitesize Science", author: "BBC Education", subject: "Science", tier: "Primary", coverEmoji: "🌐", hasDigital: true, available: true, source: "online" },
  { code: "OL-003", title: "UNEB Past Papers P7", author: "UNEB", subject: "All Subjects", tier: "Primary", coverEmoji: "📄", hasDigital: true, available: true, source: "online" }
];

export const requestedBooks: RequestedBook[] = [
  { title: "Integrated Science S1", subject: "Science", requests: 22, priority: "High", status: "Pending Approval", requestedBy: "S1 East" },
  { title: "Atlas for East Africa", subject: "Geography", requests: 11, priority: "Medium", status: "Draft", requestedBy: "P7 Blue" },
  { title: "Primary English Reader 6", subject: "English", requests: 9, priority: "Medium", status: "Draft", requestedBy: "P6 Green" }
];

export const staff: StaffRecord[] = [
  { staffNo: "STF-001", name: "Achieng Ruth", role: "Headteacher", department: "Administration", status: "Active" },
  { staffNo: "STF-014", name: "Mugisha Paul", role: "Bursar", department: "Finance", status: "Active" },
  { staffNo: "STF-029", name: "Nabirye Lydia", role: "Librarian", department: "Library", status: "Active" },
  { staffNo: "STF-033", name: "Tumusiime David", role: "Teacher", department: "Upper Primary", status: "On Leave" },
  { staffNo: "STF-041", name: "Ssekandi Moses", role: "Teacher", department: "Lower Secondary", status: "Active" }
];

export const messageBatches: MessageBatch[] = [
  { batch: "SMS-2026-0109", channel: "SMS", recipients: "P5 Blue Parents", message: "Attendance update and class meeting reminder", status: "Delivered" },
  { batch: "PUSH-2026-0072", channel: "Push", recipients: "All Parents", message: "Term 1 report cards are now available", status: "Sent" },
  { batch: "EMAIL-2026-0024", channel: "Email", recipients: "Board & Admin", message: "Monthly income and expenditure statement", status: "Queued" }
];

export const parentMessages: MessageRecord[] = [
  { id: "MSG-001", from: "Admin — Achieng Ruth", subject: "Term 2 Fee Reminder", body: "Dear parent, this is a reminder that Term 2 fees of UGX 970,000 are due by 30th June 2026. Please ensure timely payment to avoid disruption.", date: "2026-06-10", read: false, type: "fee" },
  { id: "MSG-002", from: "Teacher — Tumusiime David", subject: "Parent-Teacher Meeting", body: "We invite you to a parent-teacher meeting on Saturday 15th June at 10:00 AM. Your child's academic progress will be discussed.", date: "2026-06-08", read: true, type: "announcement" },
  { id: "MSG-003", from: "System", subject: "Attendance Alert", body: "Your child Ariho Grace was marked Late today at 8:47 AM. Please ensure punctuality.", date: "2026-06-12", read: false, type: "attendance" }
];

export const studentMessages: MessageRecord[] = [
  { id: "SMSG-001", from: "Administration", subject: "Term 2 Exam Timetable", body: "Term 2 examinations begin on 20th June 2026. Please collect your timetable from the secretary's office.", date: "2026-06-09", read: false, type: "announcement" },
  { id: "SMSG-002", from: "Librarian", subject: "Book Due Reminder", body: "Your borrowed copy of Primary English Reader 5 is due for return on Friday 14th June. Please return on time.", date: "2026-06-11", read: true, type: "announcement" }
];

export const teacherClasses: TeacherClass[] = [
  { id: "CLS-001", name: "P5", stream: "Blue", subject: "English", totalStudents: 42 },
  { id: "CLS-002", name: "P6", stream: "Green", subject: "English", totalStudents: 38 },
  { id: "CLS-003", name: "S1", stream: "East", subject: "Literature", totalStudents: 35 }
];

export const assessmentData: Record<string, StudentAssessment[]> = {
  "CLS-001": [
    { studentId: "NDS-2026-0001", studentName: "Ariho Grace", admissionNo: "NDS-2026-0001", bot: 72, mot: 68, eot: null, average: null, grade: "—", remarks: "" },
    { studentId: "NDS-2026-0003", studentName: "Tendo Alice", admissionNo: "NDS-2026-0003", bot: 85, mot: 80, eot: null, average: null, grade: "—", remarks: "" },
  ],
  "CLS-003": [
    { studentId: "NDS-2026-0005", studentName: "Okello Daniel", admissionNo: "NDS-2026-0005", bot: 55, mot: 60, eot: null, average: null, grade: "—", remarks: "" }
  ]
};

export const attendanceData: Record<string, AttendanceRecord[]> = {
  "CLS-001": [
    { studentId: "NDS-2026-0001", studentName: "Ariho Grace", admissionNo: "NDS-2026-0001", status: "Present", time: "7:55 AM" },
    { studentId: "NDS-2026-0003", studentName: "Tendo Alice", admissionNo: "NDS-2026-0003", status: "Late", time: "8:47 AM" },
  ],
  "CLS-003": [
    { studentId: "NDS-2026-0005", studentName: "Okello Daniel", admissionNo: "NDS-2026-0005", status: "Present", time: "7:50 AM" }
  ]
};

export const secretaryDocuments: SecretaryDocument[] = [
  { id: "DOC-001", title: "Ariho Grace — Admission Form", type: "admission", student: "Ariho Grace", date: "2026-01-10", size: "1.2 MB" },
  { id: "DOC-002", title: "Kato Brian — Transfer Letter", type: "transfer", student: "Kato Brian", date: "2026-02-14", size: "0.8 MB" },
  { id: "DOC-003", title: "Term 2 Circular — All Parents", type: "circular", date: "2026-05-30", size: "0.4 MB" },
  { id: "DOC-004", title: "Namara Hope — Admission Form", type: "admission", student: "Namara Hope", date: "2026-01-12", size: "1.1 MB" }
];

export const auditLogs: AuditLogEntry[] = [
  { id: "AUD-001", action: "User login", actor: "mwesigwaperez98@gmail.com", role: "Super Admin", school: "Platform", entity: "Session", timestamp: "2026-06-12 09:14:22", severity: "info" },
  { id: "AUD-002", action: "School onboarded", actor: "mwesigwaperez98@gmail.com", role: "Super Admin", school: "Nova Demo", entity: "School", timestamp: "2026-06-10 14:02:11", severity: "info" },
  { id: "AUD-003", action: "Payment voucher approved", actor: "admin@novasms.local", role: "Admin", school: "Nova Demo", entity: "Voucher PV-2026-042", timestamp: "2026-06-11 10:30:00", severity: "info" },
  { id: "AUD-004", action: "Failed login attempt x3", actor: "unknown@mail.com", role: "—", school: "Nova Demo", entity: "Auth", timestamp: "2026-06-12 07:45:00", severity: "critical" },
  { id: "AUD-005", action: "Student record edited", actor: "secretary@novasms.local", role: "Secretary", school: "Nova Demo", entity: "NDS-2026-0002", timestamp: "2026-06-11 11:22:00", severity: "warning" }
];

export const systemSchools: SystemSchool[] = [
  { id: "SCH-001", name: "Nova Demonstration School", code: "NDS", tier: "Primary + Secondary", plan: "Professional", students: 1284, status: "Active", activeSince: "2026-01-01" },
  { id: "SCH-002", name: "Kampala Junior Academy", code: "KJA", tier: "Primary", plan: "Growth", students: 420, status: "Active", activeSince: "2026-02-15" },
  { id: "SCH-003", name: "Entebbe High School", code: "EHS", tier: "Secondary", plan: "Starter", students: 680, status: "Trial", activeSince: "2026-06-01" },
  { id: "SCH-004", name: "Gulu Modern School", code: "GMS", tier: "Primary", plan: "Growth", students: 310, status: "Suspended", activeSince: "2025-09-01" }
];

export const systemAlerts: SystemAlert[] = [
  { id: "ALT-001", type: "Auth", message: "Multiple failed login attempts from IP 196.216.x.x", school: "Nova Demo", severity: "critical", time: "07:45 AM" },
  { id: "ALT-002", type: "Database", message: "Slow query detected on students table — P99 > 800ms", severity: "warning", time: "06:12 AM" },
  { id: "ALT-003", type: "Subscription", message: "Gulu Modern School subscription expired 3 days ago", school: "Gulu Modern", severity: "warning", time: "Yesterday" }
];

export const redFlags = [
  { label: "Payment received, no receipt issued", value: "2 cases", tone: "danger" as const },
  { label: "Voucher missing support document", value: "1 case", tone: "warning" as const },
  { label: "Bank reconciliation not done", value: "May 2026", tone: "danger" as const },
  { label: "Stock issued without approval", value: "4 items", tone: "warning" as const }
];

export const quickActions = [
  { label: "Register Student", icon: UsersRound },
  { label: "Share Finance Doc", icon: BadgeCheck },
  { label: "Send SMS", icon: Bell },
  { label: "Create Requisition", icon: BriefcaseBusiness },
  { label: "Library Request", icon: LibraryBig },
  { label: "Staff Record", icon: Building2 }
];
