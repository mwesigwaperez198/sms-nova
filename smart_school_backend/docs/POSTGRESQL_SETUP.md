# PostgreSQL Setup

The backend is designed to run on PostgreSQL for real development and production.

## Local PostgreSQL

This machine has PostgreSQL installed at:

```text
C:\Program Files\PostgreSQL\18
```

The server should listen on:

```text
localhost:5432
```

Check readiness:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_isready.exe" -h localhost -p 5432
```

## Create The Database

Recommended local setup script:

```powershell
.\scripts\setup_postgres.ps1
```

It prompts for your PostgreSQL password, creates the database if needed, writes `.env`, and runs Alembic migrations.

Manual option:

Replace `<postgres-password>` with the password set during PostgreSQL installation.

```powershell
$env:PGPASSWORD="<postgres-password>"
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -h localhost -p 5432 -U postgres smart_school
```

If the database already exists, this command will fail harmlessly. You can verify it with:

```powershell
$env:PGPASSWORD="<postgres-password>"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -p 5432 -U postgres -d postgres -c "\l"
```

## Configure The Backend

Create a local `.env` file from `.env.example`, then set:

```text
DATABASE_URL=postgresql+psycopg://postgres:<postgres-password>@localhost:5432/smart_school
```

Keep:

```text
DEFAULT_COUNTRY=Uganda
DEFAULT_CURRENCY_CODE=UGX
DEFAULT_TIMEZONE=Africa/Kampala
```

Set the initial platform owner:

```text
INITIAL_SUPER_ADMIN_EMAIL=owner@example.com
INITIAL_SUPER_ADMIN_PASSWORD=ChangeMe123!
INITIAL_SUPER_ADMIN_NAME=Platform Owner
```

Use a stronger password before any public deployment.

## Run Migrations

```powershell
alembic upgrade head
alembic current
```

Expected current revision:

```text
0002_mvp_modules (head)
```

## Start The API

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open:

```text
http://127.0.0.1:8000/docs
```

## Production Note

For production, use a managed PostgreSQL database on DigitalOcean or AWS RDS and set `DATABASE_URL` from the provider credentials. Do not commit `.env`.
