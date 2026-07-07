# SMS Platform Backend Scaffold

This folder is a backend scaffold for the updated SMS plan. It is intentionally not connected to the frontend or database yet.

## Current Scope

Included mock API areas:

- Health check
- Mock users and roles
- Students
- Finance documents
- Share finance document to admin
- Library books
- Share requested books to admin
- Communication batches

## Security

Do not commit production passwords.

The provided super admin and admin emails are used as seed identities. Passwords are read from environment variables before seed hashing:

- `SMS_SUPER_ADMIN_PASSWORD`
- `SMS_ADMIN_PASSWORD`

The password hashing helper uses PBKDF2-SHA256 with per-password random salts.

## Local Run Later

After installing requirements:

```bash
uvicorn platform_core.main:app --reload
```

This backend is mock-only until the database phase is wired in.
