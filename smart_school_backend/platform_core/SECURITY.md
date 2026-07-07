# Security Notes

The backend scaffold follows the agreed security direction:

- No production passwords are hardcoded.
- Seed passwords are loaded from environment variables.
- Passwords are hashed before storage.
- Role checks must be enforced by backend endpoints when real authentication is added.
- Finance, admissions, imports, library requests, and staff changes must write audit logs.
- Cashless schools should not expose a cash-receipt workflow to bursars.

Production authentication still needs:

- Secure sessions or JWT refresh flow.
- Permission middleware.
- Tenant isolation.
- Rate limiting.
- Audit logging.
- File upload validation.
- SMS/email/push provider secret storage.
