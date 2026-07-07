# NovaLibrary (Online)

Modern PHP + MySQL digital library platform with:
- Public catalog and reader
- Authentication and role-based access
- Admin portal
- Institution portal
- Reader APIs (progress, bookmarks, highlights, analytics)

## Project Analysis

### Architecture
- Backend: plain PHP (no framework), PDO for MySQL
- Frontend: server-rendered PHP templates + Tailwind (CDN), Alpine.js
- Routing:
  - Public pages via `index.php?page=...`
  - Admin pages in `admin/`
  - Institution pages in `institution/`
  - APIs in `api/`

### Roles in Use
- `1` Guest
- `2` Student
- `3` Individual User
- `4` School Account
- `5` Organization Account
- `6` Librarian
- `7` Admin
- `8` Super Admin (ProsAdmin)

### Important Findings
- `novalibrary.sql` is the recommended DB import for this codebase.
- `database/schema.sql` is partial/outdated for current features (it misses tables/columns used by APIs and institution flows, such as `bookmarks`, `highlights`, `ratings`, `reading_analytics`, and `books.institution_id`).

## Requirements

- PHP 8.1+ (tested locally with PHP 8.3)
- MySQL or MariaDB
- PHP extensions: `pdo`, `pdo_mysql`
- Optional: Node.js/NPM (only if you want to use the Tailwind build scripts)

## Local Setup

1. Create database:

```sql
CREATE DATABASE IF NOT EXISTS novalibrary CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Import the recommended SQL dump:
- File: `novalibrary.sql`

3. Verify DB connection config in `backend/Database.php`:
- Host: `localhost`
- DB name: `novalibrary`
- User: `root`
- Password: `` (empty by default)

4. Start local PHP server from project root:

```bash
php -S localhost:8000
```

5. Open the app in browser:
- `http://localhost:8000`

## Admin Bootstrap

Use this once if you need to create the default admin account:
- `http://localhost:8000/create_admin.php`

Default credentials created by that script:
- Email: `admin@novalibrary.com`
- Password: `AdminPassword123!`

Security note:
- Delete `create_admin.php` after use.
- Delete `repair_inst.php` after use.

## Localhost URL Map

If using PHP built-in server (`php -S localhost:8000`), use this base:
- `http://localhost:8000`

If using Apache/XAMPP under a folder named `online`, base is typically:
- `http://localhost/online`

### Public Pages
- `<BASE_URL>/`
- `<BASE_URL>/index.php?page=home`
- `<BASE_URL>/index.php?page=books`
- `<BASE_URL>/index.php?page=book_details&id={book_id}`
- `<BASE_URL>/index.php?page=reader&id={book_id}`
- `<BASE_URL>/index.php?page=categories`
- `<BASE_URL>/index.php?page=institutions`
- `<BASE_URL>/index.php?page=login`
- `<BASE_URL>/index.php?page=register`

### Admin Pages
- `<BASE_URL>/admin/dashboard.php`
- `<BASE_URL>/admin/books.php`
- `<BASE_URL>/admin/users.php`

### Institution Pages
- `<BASE_URL>/institution/dashboard.php`
- `<BASE_URL>/institution/books.php`
- `<BASE_URL>/institution/members.php`
- `<BASE_URL>/institution/settings.php`

### Setup / Utility Pages
- `<BASE_URL>/create_admin.php`
- `<BASE_URL>/repair_inst.php`
- `<BASE_URL>/healthcheck.php`

### API Endpoints (called by frontend)
- `<BASE_URL>/api/auth.php?action=login`
- `<BASE_URL>/api/auth.php?action=register`
- `<BASE_URL>/api/interact.php?action=like`
- `<BASE_URL>/api/interact.php?action=rate`
- `<BASE_URL>/api/interact.php?action=comment`
- `<BASE_URL>/api/reader.php?action=save_progress`
- `<BASE_URL>/api/reader.php?action=get_progress&book_id={book_id}`
- `<BASE_URL>/api/reader.php?action=add_bookmark`
- `<BASE_URL>/api/reader.php?action=get_bookmarks&book_id={book_id}`
- `<BASE_URL>/api/reader.php?action=delete_bookmark`
- `<BASE_URL>/api/reader.php?action=add_highlight`
- `<BASE_URL>/api/reader.php?action=get_highlights`
- `<BASE_URL>/api/reader.php?action=delete_highlight`
- `<BASE_URL>/api/reader.php?action=log_analytics`

## Troubleshooting

- Blank pages or DB errors:
  - Confirm MySQL is running.
  - Confirm `novalibrary` DB exists and was imported.
  - Recheck `backend/Database.php` credentials.

- Upload issues for books/covers:
  - Ensure write permissions for:
    - `uploads/books/`
    - `uploads/covers/`

- Admin login not working:
  - Run `create_admin.php` once to create known admin credentials.
