# Library Management — Simple PHP Demo

Quick demo app using PHP + SQLite. Provides two seeded accounts:

- admin: `admini` / `admin123`
- librarian: `librarian` / `lib123`

Steps:

1. Ensure PHP is installed (PHP 7.4+ recommended).
2. Start the built-in server from the project folder:

```bash
php -S localhost:8000
```

3. Initialize the database (once) by visiting in a browser:

http://localhost:8000/db_init.php

Or run from CLI:

```bash
php db_init.php
```

4. Open http://localhost:8000/login.php and sign in.

Files:

- [index.php](index.php): redirects to login.
- [login.php](login.php): login form and auth.
- [logout.php](logout.php): destroys session.
- [admin.php](admin.php): admin dashboard.
- [librarian.php](librarian.php): librarian dashboard.
- [db_init.php](db_init.php): creates `data/library.db` and seeds users.
- [style.css](style.css): simple styles.
