from __future__ import annotations

from copy import deepcopy
from typing import Any

from .security import hash_password
from .settings import get_settings


settings = get_settings()


def _seed_user(email: str, role: str, name: str, password: str | None = None) -> dict[str, Any]:
    return {
        "email": email,
        "full_name": name,
        "role": role,
        "school": "Nova Demonstration School",
        "password_hash": hash_password(password) if password else None,
        "requires_password_setup": password is None,
        "is_active": True,
    }


def seed_users() -> list[dict[str, Any]]:
    return [
        _seed_user(settings.super_admin_email, "Super Admin", "School Administrator", settings.super_admin_password),
        _seed_user("secretary@novasms.local", "Secretary", "Demo Secretary"),
        _seed_user("bursar@novasms.local", "Bursar", "Demo Bursar"),
        _seed_user("librarian@novasms.local", "Librarian", "Demo Librarian"),
        _seed_user("teacher@novasms.local", "Teacher", "Demo Teacher"),
        _seed_user("parent@novasms.local", "Parent", "Demo Parent"),
        _seed_user("student@novasms.local", "Student", "Demo Student"),
    ]


def find_user_by_email(email: str) -> dict[str, Any] | None:
    normalized = email.strip().lower()
    return next((user for user in seed_users() if user["email"].lower() == normalized), None)


def find_user_by_role(role: str) -> dict[str, Any] | None:
    normalized = role.strip().lower()
    return next((user for user in seed_users() if user["role"].lower() == normalized), None)


students = [
    {
        "admission_number": "NDS-2026-0001",
        "name": "Ariho Grace",
        "gender": "Female",
        "class": "P5",
        "stream": "Blue",
        "guardian": "Mugisha Sarah",
        "status": "Approved",
    },
    {
        "admission_number": "NDS-2026-0002",
        "name": "Kato Brian",
        "gender": "Male",
        "class": "P4",
        "stream": "Green",
        "guardian": "Kato James",
        "status": "Pending Review",
    },
    {
        "admission_number": "NDS-2026-0003",
        "name": "Namara Hope",
        "gender": "Female",
        "class": "P7",
        "stream": "Blue",
        "guardian": "Atuheire Joan",
        "status": "Approved",
    },
]

imports = [
    {
        "batch": "IMP-STU-0007",
        "type": "Student Excel",
        "total": 412,
        "male": 218,
        "female": 194,
        "invalid": 9,
        "status": "Needs Fixes",
    },
    {
        "batch": "IMP-FIN-0003",
        "type": "Opening Balances",
        "total": 402,
        "male": 0,
        "female": 0,
        "invalid": 3,
        "status": "Admin Review",
    },
    {
        "batch": "IMP-LIB-0002",
        "type": "Library Stock",
        "total": 1280,
        "male": 0,
        "female": 0,
        "invalid": 12,
        "status": "Validated",
    },
]

finance_documents = [
    {
        "document_number": "PV-2026-0042",
        "document_type": "Payment Voucher",
        "title": "Science laboratory supplies",
        "amount": 2450000,
        "currency": "UGX",
        "prepared_by": "Demo Bursar",
        "status": "Submitted to Admin",
    },
    {
        "document_number": "REQ-2026-0031",
        "document_type": "Requisition",
        "title": "Library textbooks",
        "amount": 6800000,
        "currency": "UGX",
        "prepared_by": "Demo Librarian",
        "status": "Under Review",
    },
]

payments = [
    {
        "reference": "BANK-882901",
        "student": "Ariho Grace",
        "method": "Bank Deposit",
        "amount": "UGX 650,000",
        "status": "Confirmed",
    },
    {
        "reference": "MM-774812",
        "student": "Kato Brian",
        "method": "Mobile Money",
        "amount": "UGX 320,000",
        "status": "Matched",
    },
    {
        "reference": "BANK-UNKNOWN-14",
        "student": "Unmatched",
        "method": "Bank Deposit",
        "amount": "UGX 500,000",
        "status": "Unmatched",
    },
    {
        "reference": "CODE-NDS0003",
        "student": "Namara Hope",
        "method": "Student Code",
        "amount": "UGX 900,000",
        "status": "Receipt Generated",
    },
]

library_books = [
    {
        "code": "BK-ENG-0045",
        "title": "Primary English Reader 5",
        "shelf": "ENG-P5-A",
        "available": 43,
        "borrowed": 18,
        "status": "Available",
    },
    {
        "code": "BK-SCI-0028",
        "title": "Integrated Science S1",
        "shelf": "SCI-S1-C",
        "available": 0,
        "borrowed": 32,
        "status": "Unavailable",
    },
]

requested_books = [
    {
        "title": "Integrated Science S1",
        "subject": "Science",
        "requests": 22,
        "priority": "High",
        "status": "Ready to Share",
    },
    {
        "title": "Atlas for East Africa",
        "subject": "Geography",
        "requests": 11,
        "priority": "Medium",
        "status": "Draft",
    },
    {
        "title": "Primary English Reader 6",
        "subject": "English",
        "requests": 9,
        "priority": "Medium",
        "status": "Draft",
    },
]

staff = [
    {
        "staff_no": "STF-001",
        "name": "Achieng Ruth",
        "role": "Headteacher",
        "department": "Administration",
        "status": "Active",
    },
    {
        "staff_no": "STF-014",
        "name": "Mugisha Paul",
        "role": "Bursar",
        "department": "Finance",
        "status": "Active",
    },
    {
        "staff_no": "STF-029",
        "name": "Nabirye Lydia",
        "role": "Librarian",
        "department": "Library",
        "status": "Active",
    },
    {
        "staff_no": "STF-033",
        "name": "Tumusiime David",
        "role": "Teacher",
        "department": "Upper Primary",
        "status": "On Leave",
    },
]

communication_batches = [
    {
        "batch": "SMS-2026-0109",
        "channel": "SMS",
        "recipients": "P5 Blue parents",
        "message": "Attendance update and class meeting reminder",
        "status": "Delivered 98%",
    },
    {
        "batch": "PUSH-2026-0072",
        "channel": "Push",
        "recipients": "All app parents",
        "message": "Term 1 report cards are available",
        "status": "Sent",
    },
    {
        "batch": "EMAIL-2026-0024",
        "channel": "Email",
        "recipients": "Board and admin",
        "message": "Monthly income and expenditure statement",
        "status": "Queued",
    },
]

red_flags = [
    {
        "label": "Money received but no receipt issued",
        "value": "2",
        "severity": "High",
        "status": "Open",
    },
    {
        "label": "Voucher missing support document",
        "value": "1",
        "severity": "Medium",
        "status": "Open",
    },
    {
        "label": "No monthly bank reconciliation",
        "value": "May",
        "severity": "High",
        "status": "Open",
    },
    {
        "label": "Stock issued without approval",
        "value": "4",
        "severity": "Medium",
        "status": "Open",
    },
]

role_metrics = {
    "Super Admin": [
        {"label": "Active Schools", "value": "12", "hint": "2 pending onboarding", "tone": "info"},
        {"label": "System Alerts", "value": "3", "hint": "SMS provider warnings", "tone": "warning"},
        {"label": "Modules Enabled", "value": "9", "hint": "Finance and library active", "tone": "success"},
    ],
    "Admin": [
        {"label": "Approvals", "value": "18", "hint": "Admissions, vouchers, library requests", "tone": "warning"},
        {"label": "Fee Collection", "value": "UGX 184.2M", "hint": "Term 2 confirmed", "tone": "success"},
        {"label": "Red Flags", "value": "5", "hint": "Need finance review", "tone": "danger"},
    ],
    "Secretary": [
        {"label": "New Registrations", "value": "24", "hint": "This week", "tone": "info"},
        {"label": "Pending Review", "value": "9", "hint": "Awaiting admin approval", "tone": "warning"},
        {"label": "Import Accuracy", "value": "96%", "hint": "4 rows need fixes", "tone": "success"},
    ],
    "Bursar": [
        {"label": "Collected", "value": "UGX 184.2M", "hint": "Confirmed cashless payments", "tone": "success"},
        {"label": "Unmatched Deposits", "value": "7", "hint": "Bank slips need review", "tone": "warning"},
        {"label": "Outstanding", "value": "UGX 49.8M", "hint": "Debtors list updated", "tone": "danger"},
    ],
    "Librarian": [
        {"label": "Available Books", "value": "3,842", "hint": "Across 28 shelves", "tone": "success"},
        {"label": "Borrowed", "value": "614", "hint": "43 overdue", "tone": "warning"},
        {"label": "Requested", "value": "37", "hint": "Ready to share to admin", "tone": "info"},
    ],
    "Teacher": [
        {"label": "Classes Today", "value": "5", "hint": "2 attendance sheets pending", "tone": "warning"},
        {"label": "Marks Pending", "value": "48", "hint": "English P5", "tone": "info"},
        {"label": "Parent Messages", "value": "6", "hint": "Replies needed", "tone": "warning"},
    ],
    "Parent": [
        {"label": "Balance", "value": "UGX 320,000", "hint": "Due before week 6", "tone": "warning"},
        {"label": "Attendance", "value": "Present", "hint": "Today at 8:03 AM", "tone": "success"},
        {"label": "Report Card", "value": "Published", "hint": "Term 1 ready", "tone": "info"},
    ],
    "Student": [
        {"label": "Attendance", "value": "94%", "hint": "Term average", "tone": "success"},
        {"label": "Library Books", "value": "2", "hint": "1 due Friday", "tone": "warning"},
        {"label": "Performance", "value": "B+", "hint": "Term 1 aggregate", "tone": "info"},
    ],
}

school_profile = {
    "name": "Nova Demonstration School",
    "short_name": "NDS",
    "primary_color": "#166534",
    "secondary_color": "#1e3a8a",
    "accent_color": "#f59e0b",
    "term": "Term 2",
    "academic_year": "2026",
    "address": "Mbarara Road, Uganda",
    "phone": "+256 700 000 000",
    "email": "admin@novademo.school",
    "cashless_enabled": True,
    "admission_number_format": "NDS-{YEAR}-{SEQ}",
}

admin_home = {
    "student_summary": {
        "total": 412,
        "male": 218,
        "female": 194,
        "pending_admissions": 9,
        "last_import_batch": "IMP-STU-0007",
    },
    "finance_summary": {
        "expected": "UGX 234.0M",
        "collected": "UGX 184.2M",
        "outstanding": "UGX 49.8M",
        "collection_rate": 79,
    },
    "enrollment_by_class": [
        {"label": "P1", "male": 31, "female": 29, "total": 60},
        {"label": "P2", "male": 34, "female": 32, "total": 66},
        {"label": "P3", "male": 28, "female": 27, "total": 55},
        {"label": "P4", "male": 37, "female": 30, "total": 67},
        {"label": "P5", "male": 35, "female": 34, "total": 69},
        {"label": "P6", "male": 29, "female": 24, "total": 53},
        {"label": "P7", "male": 24, "female": 18, "total": 42},
    ],
    "attendance_by_class": [
        {"label": "P4 Green", "present": 91, "absent": 6, "late": 3},
        {"label": "P5 Blue", "present": 94, "absent": 4, "late": 2},
        {"label": "P6 Green", "present": 89, "absent": 8, "late": 3},
        {"label": "P7 Blue", "present": 96, "absent": 3, "late": 1},
    ],
    "performance_by_class": [
        {"label": "P4", "average": 72, "pass_rate": 86},
        {"label": "P5", "average": 78, "pass_rate": 91},
        {"label": "P6", "average": 69, "pass_rate": 81},
        {"label": "P7", "average": 82, "pass_rate": 94},
    ],
    "finance_trend": [
        {"label": "Feb", "collected": 42, "outstanding": 18},
        {"label": "Mar", "collected": 58, "outstanding": 22},
        {"label": "Apr", "collected": 71, "outstanding": 24},
        {"label": "May", "collected": 83, "outstanding": 21},
        {"label": "Jun", "collected": 92, "outstanding": 25},
    ],
}

approval_items = [
    {
        "id": "APR-ADM-009",
        "type": "Admission",
        "title": "9 imported student profiles",
        "submitted_by": "Demo Secretary",
        "status": "Pending",
        "priority": "High",
    },
    {
        "id": "APR-PV-042",
        "type": "Payment Voucher",
        "title": "Science laboratory supplies",
        "submitted_by": "Demo Bursar",
        "status": "Pending",
        "priority": "High",
    },
    {
        "id": "APR-LIB-031",
        "type": "Requested Books",
        "title": "Integrated Science S1 stock request",
        "submitted_by": "Demo Librarian",
        "status": "Under Review",
        "priority": "Medium",
    },
    {
        "id": "APR-BUD-2026",
        "type": "Budget",
        "title": "Annual budget revision",
        "submitted_by": "Demo Bursar",
        "status": "Changes Requested",
        "priority": "Medium",
    },
]

admin_notifications = [
    {
        "id": "NTF-001",
        "title": "Admissions awaiting approval",
        "message": "9 student records from Excel import need admin review.",
        "type": "Approval",
        "severity": "High",
        "status": "Unread",
    },
    {
        "id": "NTF-002",
        "title": "Finance red flag",
        "message": "2 payments have no generated receipts.",
        "type": "Finance",
        "severity": "High",
        "status": "Unread",
    },
    {
        "id": "NTF-003",
        "title": "Requested books shared",
        "message": "The librarian shared unavailable books needed by students.",
        "type": "Library",
        "severity": "Medium",
        "status": "Unread",
    },
    {
        "id": "NTF-004",
        "title": "Attendance drop",
        "message": "P6 Green attendance is below target today.",
        "type": "Attendance",
        "severity": "Medium",
        "status": "Read",
    },
]

sms_recipient_groups = [
    {"id": "all-parents", "label": "All parents", "count": 412, "description": "Every registered parent/guardian phone number."},
    {"id": "p5-blue", "label": "P5 Blue parents", "count": 69, "description": "Parents for students in P5 Blue."},
    {"id": "debtors", "label": "Debtors list", "count": 74, "description": "Parents with outstanding fee balances."},
    {"id": "absent-today", "label": "Absent today", "count": 21, "description": "Parents of students marked absent today."},
    {"id": "custom", "label": "Selected students", "count": 0, "description": "Manually select individual students before sending."},
]

role_nav = {
    "super-admin": ["Platform", "Schools", "Modules", "Integrations", "Global Audit", "Settings"],
    "admin": ["Home", "Approvals", "Notifications", "Students", "Staff", "Finance", "Communication", "Reports", "Settings"],
    "secretary": ["Home", "Register Student", "Import Students", "Student Profiles", "Guardians", "Documents"],
    "bursar": ["Home", "Student Accounts", "Payments", "Receipts", "Vouchers", "Cashbooks", "Reports"],
    "librarian": ["Home", "Book Catalog", "Shelves", "Borrow/Return", "Requested Books", "Reports"],
    "teacher": ["Home", "Attendance", "Marks", "Messages", "Report Remarks"],
    "parent": ["Home", "Fees", "Receipts", "Attendance", "Report Cards", "Messages"],
    "student": ["Home", "Fees", "Attendance", "Report Cards", "Library"],
}


def public_users() -> list[dict[str, Any]]:
    users = deepcopy(seed_users())
    for user in users:
        user.pop("password_hash", None)
    return users
