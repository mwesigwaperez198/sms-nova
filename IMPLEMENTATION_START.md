# SMS Implementation Start

The project has been split into the agreed folders:

- `frontend/`
- `smart_school_backend/`
- `database/`

## Frontend

The frontend is scaffolded but not connected to the backend.

- `frontend/admin-web`: role-based React dashboard.
- `frontend/mobile-app`: Expo mobile skeleton for parent, teacher, and student roles.

## Backend

The backend scaffold was added under the existing folder:

- `smart_school_backend/platform_core`

It includes mock endpoints and secure seed-password handling through environment variables.

## Database

The database folder contains draft schema updates and reference seed data:

- `database/schema_updates.sql`
- `database/seed_reference_data.sql`

## Seed Identity Security

The super admin and admin emails are captured as seed identities. Passwords should be placed in local environment variables before running seed logic and should not be committed to source files.

Required variables:

- `SMS_SUPER_ADMIN_PASSWORD`
- `SMS_ADMIN_PASSWORD`

## Current Connection State

Frontend, backend, and database are intentionally not connected yet. This keeps the first pass clean and lets us review each layer before integration.
