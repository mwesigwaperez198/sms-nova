# NovaLib

NovaLib is a desktop library management starter system for Novara Team. It uses
Python, SQLite, and PyQt5, with optional library-card numbers for members.

For school staff instructions, see [USER_GUIDE.md](USER_GUIDE.md).

## Quick Start

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python main.py
```

Default librarian login:

- Username: `admin@novalib.local`
- Password: `admin123`

The database is created automatically in:

`%LOCALAPPDATA%\Novara Team\NovaLib\novalib.sqlite3`

To keep the database inside the project while testing, set:

```powershell
$env:NOVALIB_DB_PATH = "$PWD\local-novalib.sqlite3"
```

## Build Windows EXE

```powershell
.\scripts\build_exe.ps1
```

The executable will be placed at `dist\NovaLib.exe`.

## Included Flows

- Librarian login
- Dashboard stats
- Catalog search and book/copy creation
- Member registration with optional `library_card_number`
- Checkout by student ID, email, name, account ID, or library card
- Return with late-fine calculation
- Renew with reservation and unpaid-fine checks
- Reservation queue
- Daily overdue housekeeping job
