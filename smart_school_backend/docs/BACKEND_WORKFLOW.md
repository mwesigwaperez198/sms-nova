# School Management System Backend Workflow

This document is the consolidated backend development workflow for the School Management System MVP. It captures the project direction, architecture, role behavior, database foundation, Fees module design, production hardening, and deployment path.

The backend goal is not just to create another school app. The goal is to help schools protect money, improve parent trust, reduce administrative chaos, support low-bandwidth environments, and look modern and organized.

## 1. Product Scope

The MVP focuses on the strongest school pain points:

- Fees management
- Parent communication
- Attendance tracking
- Report cards
- Admin dashboard

These modules create the first strong value proposition:

- School owners reduce fee leakages and improve financial visibility.
- Parents get transparency on fees, attendance, and academic performance.
- Teachers become more accountable with attendance and report submissions.
- Admins get dashboards for oversight and decision-making.
- Schools appear more modern, trusted, and organized.

Advanced features such as mobile money, branded exports, offline sync, performance prediction, and integrations should be designed for early, but implemented after the core backend is stable.

## 2. Technology Stack

Backend:

- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Validation and schemas: Pydantic
- Migrations: Alembic
- Authentication: JWT
- Authorization: RBAC with normalized roles table
- Database: PostgreSQL
- Containerization: Docker

External services planned later:

- Notifications: Firebase Cloud Messaging, SMS, email, WhatsApp provider
- Storage: AWS S3 or compatible object storage for receipts and report cards
- Monitoring: Sentry, CloudWatch, or DigitalOcean monitoring
- Hosting: AWS Elastic Beanstalk, AWS ECS, DigitalOcean Droplets, or App Platform

Frontend and clients:

- Admin web dashboard: React
- Mobile app: React Native
- Parent app: alerts, balances, attendance, report cards
- Teacher app: attendance entry and grade submission
- Student app: own records, progress, timetable later

## 3. Core Architecture

The backend should follow a layered structure:

```text
Routes
  -> dependencies for auth, RBAC, tenant context
  -> services for business logic
  -> SQLAlchemy models and database session
  -> PostgreSQL
```

Routes should stay thin. Business rules belong in service files.

Core backend responsibilities:

- Authenticate users with JWT.
- Enforce roles at endpoint level.
- Enforce school-level tenant isolation on every protected query.
- Keep financial operations transaction-safe.
- Keep audit-ready records for sensitive actions.
- Return mobile-friendly API responses.
- Support future offline sync without redesigning the schema.

## 4. Build Order

The backend should be developed in this order:

1. Project configuration
2. Database setup and Alembic migrations
3. Foundation schema: schools, roles, users, students
4. Auth, JWT, password hashing, current user dependency
5. RBAC and tenant-check dependencies
6. Fees module
7. Attendance module
8. Report cards module
9. Notifications module
10. Admin dashboard APIs
11. Audit logs
12. Offline sync support
13. Exports, branding, integrations, and analytics
14. Production hardening and deployment

The first real implementation phase is:

```text
schools + roles + users + students
then auth + RBAC
then Fees
```

## 5. Foundation Database Design

The foundation tables must exist before feature modules.

### schools

Purpose: enables multi-tenant support from day one.

Fields:

- id
- name
- address
- created_at

Use `address`, not `location`, for naming consistency.

### roles

Purpose: normalized role management.

Fields:

- id
- name
- description

Seed roles in deterministic order:

```text
1 admin
2 teacher
3 parent
4 student
```

Use role constants internally and role names externally.

Example internal enum:

```python
class RoleEnum(IntEnum):
    ADMIN = 1
    TEACHER = 2
    PARENT = 3
    STUDENT = 4
```

### users

Purpose: authentication actors.

Fields:

- id
- name
- email
- password_hash
- role_id
- school_id
- created_at

Relationships:

- users.role_id -> roles.id
- users.school_id -> schools.id

### students

Purpose: academic student records.

Students should be separate from users because not every student needs an auth account.

Initial fields:

- id
- school_id
- parent_id
- name
- class_name or class_id
- created_at

Relationships:

- students.school_id -> schools.id
- students.parent_id -> users.id

Later, `classes` can be normalized into its own table.

## 6. Authentication Workflow

Endpoints:

```text
POST /api/auth/register
POST /api/auth/login
GET /api/auth/profile
```

Implementation requirements:

- Hash passwords with bcrypt or Argon2.
- Never store plain passwords.
- Use JWT access tokens.
- JWT payload should include:
  - sub: user id or email
  - role_id
  - school_id
- Use `Authorization: Bearer <token>` for protected endpoints.
- Use environment variables for secrets.

Recommended dependencies:

- `get_current_user`
- `role_required`
- `school_id` tenant context from current user

Future production additions:

- Refresh tokens
- Logout or token revocation
- Password reset
- Rate limiting on auth endpoints
- Login audit logs

## 7. RBAC Matrix

Role IDs:

```text
1 = Admin
2 = Teacher
3 = Parent
4 = Student
```

Permissions:

```text
Admin
- Manage users
- View all fees inside their school
- Generate financial reports
- View all attendance inside their school
- View all report cards inside their school
- Full admin dashboard
- Send system-wide notifications
- Manage sync policies

Teacher
- Mark class attendance
- Submit grades and report cards
- Send class notifications
- Sync attendance and grades

Parent
- Register self where allowed
- View and pay child fees
- View child attendance
- View child report cards
- Receive alerts
- Sync child data

Student
- Register self where allowed
- View own fees
- View own attendance
- View own report cards
- Receive alerts
- Sync own data
```

RBAC alone is not enough. Every protected data request must also check tenant scope and ownership:

- Admin can access records from their own school only.
- Parent can access their own child's records only.
- Student can access their own records only.
- Teacher can access assigned classes or students only.

## 8. Fees Module Architecture

The Fees module is the financial backbone of the MVP.

It should solve:

- Fake receipts
- Unrecorded payments
- Delayed balance tracking
- Bursar/admin confusion
- Parent payment disputes
- Poor financial reporting

Use accounting-grade structure:

```text
invoices -> what is owed
payments -> what was paid
receipts -> proof of payment
```

Do not use one simple `fees` table for production-style accounting.

### Fees ERD

Relationships:

```text
School 1 -> many Students
School 1 -> many Invoices
School 1 -> many Payments

Student 1 -> many Invoices
Student 1 -> many Payments

Invoice 1 -> many Payments

Payment 1 -> 1 Receipt

User 1 -> many Payments
```

Important foreign keys:

```text
invoices.student_id -> students.id
payments.student_id -> students.id
payments.payer_id -> users.id
receipts.payment_id -> payments.id with UNIQUE constraint
invoices.school_id -> schools.id
payments.school_id -> schools.id
```

`students` must exist before the Fees module is fully correct.

### invoices

Fields:

- id
- student_id
- school_id
- academic_year
- term
- amount
- description
- due_date
- status
- created_at

Invoice status values:

```text
unpaid
partial
paid
```

### payments

Fields:

- id
- invoice_id
- student_id
- payer_id
- school_id
- amount
- method
- reference
- status
- created_at

Payment method values:

```text
cash
mobile_money
bank
```

Payment status values:

```text
pending
confirmed
failed
reversed
```

For MVP, confirmed payments can be created directly. Later, mobile money can start payments as pending and confirm through callbacks.

### receipts

Fields:

- id
- payment_id
- receipt_number
- issued_at
- pdf_url

Constraints:

- `payment_id` should be unique to enforce one receipt per payment.
- `receipt_number` should be unique.

## 9. Fees Routes

Final Fees endpoints:

```text
POST /api/fees/invoices
Allowed: Admin

GET /api/fees/student/{id}
Allowed: Admin, Parent, Student

POST /api/fees/payment
Allowed: Admin, Parent

GET /api/fees/payments/{id}
Allowed: Admin, Parent, Student

GET /api/fees/receipt/{id}
Allowed: Admin, Parent

GET /api/fees/report
Allowed: Admin

GET /api/fees/report/students
Allowed: Admin
```

Access rules:

- Teachers have no fees permissions.
- Parent can only pay for and view their own child.
- Student can only view own fees.
- Admin can only access fees inside their own school.

## 10. Fees Service Logic

Routes should call service functions. The service layer should enforce tenant safety, ownership checks, and financial consistency.

### Invoice Creation

Admin creates an invoice for a student.

Required checks:

- Current user is Admin.
- Student exists.
- Student belongs to current user's school.
- Invoice uses current user's `school_id`, not request-provided school ID.
- Amount is greater than zero.

### Payment Recording

Payment recording must be atomic.

Flow:

```text
begin transaction
  verify invoice exists
  verify invoice.school_id == current_user.school_id
  derive student_id from invoice
  verify parent ownership if current user is Parent
  create payment
  flush payment to get payment.id
  sum confirmed payments for invoice
  update invoice status
  create receipt
commit once
```

If any step fails after writes begin, rollback.

Do not blindly trust `student_id` or `school_id` from request data.

Preferred payment response:

```text
payment
invoice
receipt
```

Receipt number can use a simple MVP format first:

```text
R-{payment_id}-{timestamp}
```

Later, use a school/year/sequence format.

### Invoice Status Update

Use confirmed payments only:

```text
if total_paid == 0 -> unpaid
if total_paid < invoice.amount -> partial
if total_paid >= invoice.amount -> paid
```

Use Decimal-safe comparisons. Do not use floats for money.

### Balance Calculation

Balances should be derived, not stored.

Correct concept:

```text
balance = total invoice amount - total confirmed payment amount
```

Avoid join queries that duplicate invoice amounts when an invoice has multiple payments.

## 11. Fees Reporting

The Admin dashboard needs school-wide and per-student reports.

### School-Wide Report

Endpoint:

```text
GET /api/fees/report
```

Allowed:

```text
Admin only
```

Filters:

```text
academic_year
term
```

Use `school_id` from current user, not request input.

Response:

```text
school_id
academic_year
term
total_invoiced
total_paid
outstanding_balance
invoice_count
payment_count
paid_invoice_count
partial_invoice_count
unpaid_invoice_count
```

Implementation:

- Build an invoice IDs subquery scoped by `school_id`, academic year, and term.
- Sum invoices from that scope.
- Sum confirmed payments whose invoice IDs are in that scope.
- Return Decimal values as strings to avoid JSON precision issues.

### Per-Student Report

Endpoint:

```text
GET /api/fees/report/students
```

Allowed:

```text
Admin only
```

Response per student:

```text
student_id
school_id
academic_year
term
total_invoiced
total_paid
outstanding_balance
invoice_count
payment_count
paid_invoice_count
partial_invoice_count
unpaid_invoice_count
```

Implementation:

- Use grouped SQL aggregation.
- Do not use per-invoice loops that query payments one by one.
- Join invoice filters only once when filtering payments by academic year or term.

Later, join with students/classes to include:

```text
student_name
class_id
class_name
parent_id
```

## 12. Attendance Module

Attendance supports parent trust and student safety.

Planned endpoints:

```text
POST /api/attendance/mark
Allowed: Teacher

GET /api/attendance/student/{id}
Allowed: Admin, Parent, Student

GET /api/attendance/class/{id}
Allowed: Admin, Teacher
```

Core rules:

- Teacher can mark assigned class attendance.
- Parent can view own child attendance.
- Student can view own attendance.
- Admin can view school-wide attendance.
- Attendance records must include `school_id` directly or through student/class relationships.

Future addition:

- Trigger notification when a student is absent.

## 13. Report Cards Module

Report cards support academic trust and school reputation.

Planned endpoints:

```text
POST /api/report-cards/submit
Allowed: Teacher

GET /api/report-cards/student/{id}
Allowed: Admin, Parent, Student

GET /api/report-cards/download/{id}
Allowed: Admin, Parent, Student
```

Core rules:

- Teacher submits grades for assigned students/classes.
- Parent views own child's report cards.
- Student views own report cards.
- Admin views school-wide academic records.

Future additions:

- PDF report cards
- S3 storage
- Performance trends
- Student failure risk prediction
- Subject and class analytics

## 14. Notifications Module

Notifications create parent visibility and retention.

Planned endpoints:

```text
POST /api/notifications/send
GET /api/notifications/user/{id}
```

Notification channels:

- In-app
- FCM push
- SMS
- Email
- WhatsApp later

Initial notification events:

- Invoice issued
- Payment received
- Receipt generated
- Fee reminder
- Student absent
- Report card published

Design:

- Use an abstract notification service.
- Store notification history in the database.
- Let external providers be swapped without changing route logic.

## 15. Admin Dashboard

Admin dashboard should not be built before core data exists.

Planned endpoints:

```text
GET /api/admin/overview
GET /api/admin/teachers
GET /api/admin/analytics
```

Allowed:

```text
Admin only
```

Dashboard should eventually show:

- Total invoiced
- Total collected
- Outstanding balances
- Paid/partial/unpaid invoice counts
- Attendance rates
- Absent students
- Report card submission status
- Class and subject performance
- Notification activity
- Teacher accountability metrics

## 16. Audit Logs

Audit logs are critical for trust and financial accountability.

Track:

- Payment created
- Receipt issued
- Invoice created or edited
- User created
- Login attempts later
- Admin changes
- Report card submissions

Suggested fields:

- id
- school_id
- actor_user_id
- actor_role_id
- action
- entity_type
- entity_id
- before_data
- after_data
- ip_address
- user_agent
- created_at

Audit logs should be append-only.

## 17. Offline Sync Support

Offline sync is mostly a mobile/frontend concern, but the backend must support it.

Backend support should include:

- Idempotency keys
- Server timestamps
- Updated-at fields
- Soft deletes where needed
- Conflict detection
- Sync upload endpoint
- Sync download endpoint
- Change log table later

Planned endpoints:

```text
POST /api/sync/upload
GET /api/sync/download
```

Use cases:

- Teacher marks attendance offline.
- Teacher submits grades offline.
- Mobile app syncs later when network returns.

Payments should be handled carefully offline. For real money movement, avoid confirming payments offline unless there is a trusted reconciliation process.

## 18. Branding and Prestige Features

Schools care about image. The backend should support future branding.

Potential school branding fields:

- logo_url
- primary_color
- secondary_color
- receipt_footer_text
- report_card_template
- sender_name

Use branding for:

- Receipts
- Report cards
- SMS sender labels where supported
- Parent app experience
- School portal

## 19. Security Requirements

Required for production:

- HTTPS/TLS for all API traffic
- Secure JWT secret from environment
- Password hashing
- RBAC on protected endpoints
- Tenant checks using `school_id`
- Ownership checks for parent/student endpoints
- CORS configured for known frontend origins
- Rate limiting on auth and sensitive endpoints
- Audit logs for financial and admin actions
- Input validation
- Consistent error responses
- Avoid leaking internal errors
- Database backups
- Least-privilege database credentials

Future security:

- Refresh token rotation
- Token revocation
- mTLS for internal services if needed
- Encryption at rest for sensitive fields where required

## 20. Testing Strategy

Tests should grow with risk.

Foundation tests:

- Role seeding works.
- School seeding works.
- Register user.
- Login user.
- JWT payload includes role and school.
- Profile endpoint works.

RBAC tests:

- Admin-only endpoint rejects Teacher, Parent, Student.
- Teacher-only endpoint rejects Admin where appropriate if role-specific.
- Parent cannot view another parent's child.
- Student cannot view another student's data.
- Cross-school access is rejected.

Fees tests:

- Admin creates invoice for own school student.
- Admin cannot create invoice for another school student.
- Parent records payment for own child.
- Parent cannot pay another student's invoice.
- Student cannot record payment.
- Teacher cannot access fees.
- Payment creates receipt.
- Receipt payment_id uniqueness is enforced.
- Invoice status changes from unpaid to partial to paid.
- Report totals are correct.
- Per-student report uses correct grouping.

Production tests:

- Migration tests
- API integration tests
- Transaction rollback tests
- Idempotency tests for payments when added

## 21. Deployment Workflow

Development:

```text
local FastAPI
local PostgreSQL or Docker PostgreSQL
Alembic migrations
pytest
```

Staging:

```text
Dockerized backend
managed PostgreSQL
environment secrets
seed roles and test school
run migrations
run smoke tests
```

Production:

```text
Docker image
managed PostgreSQL
object storage for files
monitoring and error tracking
database backups
HTTPS
health checks
logs
rollback plan
```

Health endpoint:

```text
GET /api/health
```

Deployment checklist:

- Environment variables configured
- Database reachable
- Migrations applied
- Roles seeded
- Default school or onboarding flow ready
- Admin account created securely
- CORS configured
- Sentry or logging configured
- Backups enabled
- HTTPS enabled
- Smoke tests pass

## 22. Production Readiness Checklist

Before calling the backend production-ready:

- Alembic migrations are complete and reversible.
- PostgreSQL constraints and indexes are in place.
- Auth uses secure secrets.
- Passwords are hashed.
- RBAC is enforced.
- Tenant checks are enforced.
- Parent/student ownership checks are enforced.
- Payment flow is transaction-safe.
- Payment duplicate handling or idempotency is added.
- Audit logs exist for sensitive actions.
- Reports are tested.
- Error responses are consistent.
- Pagination exists for list endpoints.
- Logging and monitoring are configured.
- Database backups are configured.
- Docker production build works.
- Health checks exist.
- Tests pass in CI or before deployment.

## 23. Practical MVP Boundary

Build now:

- Foundation schema
- Auth and RBAC
- Students
- Fees core
- Fees reports
- Attendance basics
- Report card basics
- Notification history
- Admin overview

Design for later:

- Mobile money
- Full offline sync
- PDF generation
- S3 uploads
- WhatsApp integration
- Predictive performance analytics
- Advanced teacher accountability
- Bursar and finance officer roles
- External accounting integration

The MVP should stay simple, fast, and useful. The first version should make schools feel that money is safer, parents are better informed, and administration is more organized.

## 24. Final Development Principle

Every major feature should pass these checks:

```text
Is it tenant-safe?
Is it role-safe?
Is it audit-ready?
Is it simple for non-technical school staff?
Does it improve trust, money control, parent visibility, or admin speed?
```

If the answer is yes, it belongs in the product direction.
