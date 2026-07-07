# Smart School Backend

Production-focused backend workspace for the multi-school School Management System.

This is the clean implementation folder for the real backend. The build should follow the workflow in:

```text
docs/BACKEND_WORKFLOW.md
```

## Locked Stack

- Python
- FastAPI
- PostgreSQL
- SQLAlchemy
- Alembic
- Pydantic
- JWT authentication
- RBAC with normalized roles
- Docker deployment

## First Build Order

1. Foundation configuration
2. PostgreSQL database setup
3. Alembic migrations
4. Schools, roles, users, students
5. JWT auth and RBAC
6. Tenant-safe onboarding flow
7. Fees module
8. Attendance, report cards, notifications, admin dashboard

## Local Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

API docs:

```text
http://127.0.0.1:8000/docs
```

Swagger authorization:

1. Login with `POST /api/v1/auth/login`.
2. Copy `access_token`.
3. Click `Authorize`.
4. Paste only the token value into the HTTP bearer field.

Health check:

```text
GET /api/health
```

For PostgreSQL setup, see:

```text
docs/POSTGRESQL_SETUP.md
```

## MVP Onboarding Flow

1. Seed roles and the first `super_admin`.
2. `super_admin` creates a school and first school admin through `POST /api/v1/platform/schools`.
3. School admin logs in and creates teachers, parents, and student records.
4. School admin links guardians to students.
5. Fees, attendance, report cards, notifications, and dashboards build on this foundation.

## Implemented Backend Surface

Foundation:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/profile`
- `POST /api/v1/platform/schools`
- `POST /api/v1/users/`
- `POST /api/v1/students/`
- `POST /api/v1/students/{student_id}/guardians`

Fees:

- `POST /api/v1/fees/categories`
- `POST /api/v1/fees/invoices`
- `GET /api/v1/fees/student/{student_id}`
- `POST /api/v1/fees/payment`
- `GET /api/v1/fees/payments/{payment_id}`
- `GET /api/v1/fees/receipt/{receipt_id}`
- `GET /api/v1/fees/report`
- `GET /api/v1/fees/report/students`

Attendance:

- `POST /api/v1/attendance/mark`
- `GET /api/v1/attendance/student/{student_id}`
- `GET /api/v1/attendance/class/{class_name}`
- `PUT /api/v1/attendance/{attendance_id}`

Report cards:

- `POST /api/v1/report-cards/submit`
- `GET /api/v1/report-cards/student/{student_id}`
- `POST /api/v1/report-cards/{report_card_id}/approve`
- `POST /api/v1/report-cards/{report_card_id}/publish`
- `GET /api/v1/report-cards/download/{report_card_id}`

Notifications, admin, and sync:

- `POST /api/v1/notifications/send`
- `GET /api/v1/notifications/user/{user_id}`
- `GET /api/v1/admin/overview`
- `GET /api/v1/admin/teachers`
- `GET /api/v1/admin/analytics`
- `GET /api/v1/admin/audit-logs`
- `POST /api/v1/sync/upload`
- `GET /api/v1/sync/download`

## Verification

```bash
python -m compileall app
python -m pytest -q
alembic upgrade head
```

## Reset Demo Data

To remove local development records and seed one mock user for each role:

```powershell
python scripts\seed_mock_users.py
```

Seeded accounts:

```text
super_admin: owner@example.com / ChangeMe123!
admin:       admin@demo.ac.ug / DemoPass123!
teacher:     teacher@demo.ac.ug / DemoPass123!
parent:      parent@demo.ac.ug / DemoPass123!
student:     student@demo.ac.ug / DemoPass123!
```

## Product Direction

Build for real schools, not a demo:

- protect school money
- improve parent trust
- reduce admin chaos
- support low-bandwidth environments
- make schools look modern and organized
