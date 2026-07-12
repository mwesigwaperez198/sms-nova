# AGENTS.md — Developer Profile & Project Preferences

## Developer
- **Name:** Mwesigwa Perez
- **Role:** Lead Developer
- **Team:** Youth developers, Uganda
- **Organization:** Novara System Software LTD
- **Slogan:** "Shaping a new era of tech in Uganda"
- **Email:** mwesigwagershom7@gmail.com
- **Phone:** 0765866555
- **Website:** https://novara-tech-africa.kesug.com

## Project Defaults
- Brand all projects to **NOVARA**
- Code must pass AI detectors — no AI signatures, traces, or boilerplate comments
- Code style: clean, personalized, human-written feel
- UI/UX: research, compare, and choose the best design before building

## Git & Auth
- Remote URLs must NOT contain embedded tokens (use gh auth instead)
- Push after every sanitized & verified testing session
- Use the same gh auth (`mwesigwaperez198`) for all repos across all projects

## Workflow
Plan → Code → Debug → Produce (with best UI/UX)

## Infrastructure
- **Render Deploy Hook:** `https://api.render.com/deploy/srv-d97185u7r5hc738lb5pg?key=p5gkwUtMvZI`
  - POST to this URL to trigger a backend deploy on Render (no auth needed, just the URL)
  - GitHub secret `RENDER_DEPLOY_KEY` = `p5gkwUtMvZI` (for GitHub Actions)
- **GitHub Actions workflow:** `.github/workflows/deploy.yml`
  - Runs on push to `main`: checks Python imports, then calls Render deploy hook
  - Can also be triggered manually via GitHub Actions UI (`workflow_dispatch`)

## Deploy Targets
- **Backend:** https://sms-msku.onrender.com (FastAPI, Render)
- **Admin Web:** https://sms-cms-brown.vercel.app (Vite + React, Vercel)
- **Control Web:** https://novara-cms.pages.dev (Vite + React, Cloudflare Pages)

## Two Frontends (Important!)
- **admin-web** (`/workspace/frontend/admin-web/`) — school-level dashboard, deployed to Vercel (`sms-cms-brown.vercel.app`) AND Cloudflare Pages via `sms-nova.git` repo (`sms-nova.pages.dev`)
  - Uses `VITE_API_URL` env var; on Vercel uses proxy rewrites to Render; on Cloudflare Pages calls Render directly via `functions/api/v1/[[path]].ts`
  - Cloudflare builds from `sms-nova.git` repo (NOT `SMS.git`)
- **novara-control-web** (`/workspace/frontend/novara-control-web/`) — platform-level control panel at `novara-cms.pages.dev`
  - Has Cloudflare Functions proxy at `functions/api/v1/[[path]].ts`
  - API client calls `/novara/*` routes

## Git Push
- Use classic PAT (`ghp_` prefix) — fine-grained tokens block git HTTPS push even with Contents:write
- Command: `git remote set-url origin https://<ghp_token>@github.com/mwesigwaperez198/SMS.git && git push origin main`
- After push: reset remote to clean URL: `git remote set-url origin https://github.com/mwesigwaperez198/SMS.git`
- Render deploy: `curl -X POST "https://api.render.com/deploy/srv-d97185u7r5hc738lb5pg?key=p5gkwUtMvZI"`

## Session Log — 2026-07-10

### Done (all pushed & deployed)
- **API key auth middleware** — `verify_api_key` dep in `deps.py`, hashes `X-API-Key` header, checks `api_keys` table, updates `last_used_at`, returns `School` context. Test endpoint: `GET /api/v1/api-auth/school-info`
- **Facial recognition endpoints** — rewrote `face_auth.py`: correct prefix `/face-auth`, all roles supported, unauthenticated `/face-auth/login` (email+face→tokens), `/face-auth/register`, `/face-auth/verify`, `/face-auth/status`, `/face-auth/remove`. `face_descriptor` widened to VARCHAR(5000) + migration `0006`
- **Headteacher role (id=10)** — added to `RoleId` enum + seed data. Routes: staff list/toggle-active, school-wide attendance summary, class performance averages, leave apply/list/decide. `LeaveRequest` model + migration `0007`
- **Alembic env.py fix** — bypass `config.set_main_option` to avoid `%` interpolation error with Supabase URL. Use `create_engine` directly
- **Migrations applied** — stamped DB at `0005`, ran `0006` + `0007` successfully against live Supabase DB
- **Pushed & deployed** — commit `2fed53f` pushed to `main`, Render deploy triggered

### Next session
1. Build frontend workspaces for headteacher role
2. Wire face-auth login button on frontend LoginScreen
3. Any other backend features needed

## Session Log — 2026-07-11

### Done (all pushed & deployed — commit `3b11a37`)
- **Cloudflare Pages API proxy for admin-web** — Added `functions/api/v1/[[path]].ts` to `admin-web/` so API calls on `sms-nova.pages.dev` proxy through to `sms-msku.onrender.com` (same pattern as control-web). Fixes CORS/proxy issue where Cloudflare Pages had no backend connection.
- **No-cache headers** — Added `public/_headers` to prevent Cloudflare CDN from serving stale JS bundles. Every page load fetches fresh assets.
- **SPA routing for Cloudflare** — Added `public/_redirects` so Cloudflare Pages serves `index.html` for all routes (client-side routing).
- **RegistrationWizard retry** — Plans section now shows a Retry button when plans fail to load, instead of a dead error state. Also extracted `loadPlans()` helper for reuse.
- **Two-repo push** — Pushed to both `origin` (SMS.git → Vercel auto-deploy) and `cloudflare` (sms-nova.git → Cloudflare Pages auto-deploy)
- Backend not changed — CORS defaults to `["*"]` when `BACKEND_CORS_ORIGINS` env is empty, which covers all origins.

### What caused the `sms-nova.pages.dev` issues
- admin-web on Cloudflare Pages had NO API proxy function (only Vercel had rewrites in `vercel.json`)
- API calls went to `sms-nova.pages.dev/api/v1/*` which doesn't exist → CORS/404 errors
- Cloudflare CDN cached old JS bundles (without RegistrationWizard thank-you page)
- Fix: added `functions/api/v1/[[path]].ts` + `_headers` (no-cache) + `_redirects` (SPA)

### Next session — build these in order
1. **Headteacher workspace frontend** — wire headteacher-specific pages (staff management, attendance overview, class performance, leave requests)
2. **Face-auth login button** — wire face-recognition login on LoginScreen
3. **System Control backend** — add `POST /platform/system-check/trigger` and `POST /platform/maintenance/toggle` endpoints (SettingsPage.tsx calls these but backend may not have them)
4. **Full registration flow test** — verify Register → Thank You screen → Get Key → Activate works end-to-end on `sms-nova.pages.dev`
5. **Verify novara-cms login** — test `mwesigwaperez98@gmail.com` / `novara2026` on `novara-cms.pages.dev` (super admin role_id=1)
6. **Audit remaining workspaces** — check for any other mock data or blank sections
7. **Production readiness assessment** — current estimate ~80%

## Session Log — 2026-07-09

### Done (all pushed & deployed)
- **35/35 unit tests passing** — fixed test isolation, Notification model fields, seed SQLite compat, migrations inspector pattern
- **Fixes:** `platform_admin.py` — missing `AuditLog` import, AuditLogRead model fields mismatch (was 500); `students.py` — added `require_active_subscription` to list endpoint
- **40/40 live E2E tests pass** (zero 500s) — tested against deployed backend at `sms-msku.onrender.com`
  - Auth (login, refresh-token, role gates)
  - Registration (`/registration/register-school`)
  - School creation (`/platform/add-school`)
  - All 7 role users created (teacher→ict_admin)
  - API keys generate/revoke
  - Subscription enforcement (expired schools blocked)
  - System check trigger/list
  - Audit logs, stats, users endpoints

### Next session — build these in order
1. **API key auth middleware** — so generated `novara_` keys can authenticate API requests
2. **Facial recognition** endpoints (`/face-auth/*` currently returns 404)
3. Headteacher role hierarchy (optional, after facial recognition)
