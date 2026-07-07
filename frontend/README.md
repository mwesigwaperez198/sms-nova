# SMS Frontend

This folder contains the standalone frontend work for the school management system.

## Current Apps

- `admin-web`: React + TypeScript + Vite role-based dashboard scaffold.
- `mobile-app`: Expo + React Native role-based parent/teacher/student scaffold.

## Current Scope

The frontend is currently using mock data only. It is intentionally not connected to the backend yet.

Included workspaces:

- Super Admin
- Admin / Headteacher
- Secretary / Front Desk
- Bursar / Accountant
- Librarian
- Teacher
- Parent
- Student

Included mock workflows:

- Student admissions
- Excel import preview with male/female counts
- Bursar finance documents
- Cashless payment reconciliation
- Share to Admin actions
- Printable/exportable document actions
- Staff management
- Library shelves, books, borrowed stock, unavailable books
- Requested books document flow
- SMS, email, push, and in-app communication batches

## Security Direction

The frontend should not store production passwords or sensitive tokens. Authentication will later use the backend session/token strategy.
