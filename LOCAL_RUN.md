# Local Run

The admin web dashboard now connects to the `platform_core` FastAPI mock backend.

## Backend

From `smart_school_backend`:

```powershell
$env:SMS_ENV='local'
$env:SMS_SUPER_ADMIN_EMAIL='mwesigwaperez98@gmail.com'
$env:SMS_SUPER_ADMIN_PASSWORD='novara2026'
$env:SMS_ADMIN_EMAIL='mwesigwaperez98@gmail.com'
$env:SMS_ADMIN_PASSWORD='novara2026'
python -m uvicorn platform_core.main:app --host 127.0.0.1 --port 8000 --reload
```

Or use the helper script:

```powershell
.\run_platform_core_local.ps1
```

## Frontend

From `frontend/admin-web`:

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open:

```text
http://127.0.0.1:5173
```

## No Node Fallback

If Node.js is not installed yet, the backend also serves a connected local preview at:

```text
http://127.0.0.1:8000
```

This preview uses the same backend APIs and shows the main role-based UI.

## Login

Use the local credentials supplied through environment variables, or use the local-only demo workspace selector to view each role.

Get-ChildItem -Filter package.json -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
dir -Recurse -Filter package.json
npm install
npm run dev -- --host 127.0.0.1 --port 5173
