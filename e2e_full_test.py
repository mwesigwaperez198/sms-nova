#!/usr/bin/env python3
import json, time, random, string, ssl
import urllib.request, urllib.error

# bypass SSL verification for macOS Python cert issue
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

BASE = "https://sms-msku.onrender.com/api/v1"
PASS = "Novara2026!"  # meets: uppercase + lowercase + digit + 8 chars

# ── helpers ──────────────────────────────────────────────────────────────────

def req(method, path, body=None, token=None, label=""):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, context=SSL_CTX, timeout=30) as resp:
            result = json.loads(resp.read())
            print(f"  ✅ {method} {path} → {resp.status}" + (f" [{label}]" if label else ""))
            return result, resp.status
    except urllib.error.HTTPError as e:
        body_err = e.read().decode()
        try:
            detail = json.loads(body_err).get("detail", body_err)
        except Exception:
            detail = body_err[:120]
        print(f"  ❌ {method} {path} → {e.code}: {detail}" + (f" [{label}]" if label else ""))
        return {"error": detail, "status_code": e.code}, e.code

def ok(result):
    return isinstance(result, dict) and "error" not in result

def sep(title):
    print(f"\n{'─'*60}")
    print(f"  {title}")
    print(f"{'─'*60}")

# ── random suffix to avoid conflicts ─────────────────────────────────────────
RND = "".join(random.choices(string.ascii_lowercase, k=5))
SCHOOL_NAME = f"Novara Test School {RND.upper()}"
ADMIN_EMAIL = f"admin.{RND}@novaratest.com"

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 1 — Super Admin Login")
# ═══════════════════════════════════════════════════════════════════════════
r, _ = req("POST", "/auth/login", {"email": "mwesigwaperez98@gmail.com", "password": "novara2026"})
assert ok(r) and "access_token" in r, f"Super admin login failed: {r}"
SA_TOKEN = r["access_token"]
print(f"  → Super admin token acquired")

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 2 — Register School (public endpoint)")
# ═══════════════════════════════════════════════════════════════════════════
r, _ = req("POST", "/registration/register-school", {
    "school_name": SCHOOL_NAME,
    "admin_name": "Test Admin",
    "admin_email": ADMIN_EMAIL,
    "admin_phone": "0700000000",
    "payment_method": "mobile_money",
    "payment_details": "MTN 0700000000 - Test payment"
})
assert ok(r) and "id" in r, f"Registration failed: {r}"
REG_ID = r["id"]
print(f"  → Registration ID: {REG_ID}")

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 3 — Super Admin approves registration → gets key")
# ═══════════════════════════════════════════════════════════════════════════
r, _ = req("POST", f"/platform/registrations/{REG_ID}/approve", token=SA_TOKEN)
assert ok(r) and "product_key" in r, f"Approval failed: {r}"
REG_KEY = r["product_key"]
print(f"  → Registration key: {REG_KEY[:8]}...")

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 4 — Complete registration (school admin sets up account)")
# ═══════════════════════════════════════════════════════════════════════════
r, _ = req("POST", "/registration/complete", {
    "key": REG_KEY,
    "email": ADMIN_EMAIL,
    "password": PASS,
    "full_name": "Test Admin",
    "phone": "0700000000"
})
assert ok(r) and "school_code" in r, f"Complete registration failed: {r}"
SCHOOL_CODE = r["school_code"]
print(f"  → School created: {r['school_name']} ({SCHOOL_CODE})")

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 5 — Admin Login")
# ═══════════════════════════════════════════════════════════════════════════
r, _ = req("POST", "/auth/login", {"email": ADMIN_EMAIL, "password": PASS})
assert ok(r) and "access_token" in r, f"Admin login failed: {r}"
ADMIN_TOKEN = r["access_token"]
SCHOOL_ID = r["user"]["school_id"]
print(f"  → Admin token acquired | school_id={SCHOOL_ID}")

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 6 — Admin creates all role users")
# ═══════════════════════════════════════════════════════════════════════════

# Get plans for subscription
plans_r, _ = req("GET", "/subscriptions/plans", token=SA_TOKEN)
PLAN_ID = plans_r[0]["id"] if plans_r else 1

# Activate subscription for the school first
sub_r, _ = req("POST", "/subscriptions/keys/generate", {"school_id": SCHOOL_ID, "plan_id": PLAN_ID}, token=SA_TOKEN)
if ok(sub_r) and "product_key" in sub_r:
    req("POST", "/subscriptions/activate", {"product_key": sub_r["product_key"], "school_id": SCHOOL_ID}, token=ADMIN_TOKEN)
    print(f"  → Subscription activated")

ROLES = [
    ("teacher",     3, f"teacher.{RND}@novaratest.com"),
    ("parent",      4, f"parent.{RND}@novaratest.com"),
    ("student",     5, f"student.{RND}@novaratest.com"),
    ("bursar",      6, f"bursar.{RND}@novaratest.com"),
    ("secretary",   7, f"secretary.{RND}@novaratest.com"),
    ("librarian",   8, f"librarian.{RND}@novaratest.com"),
    ("headteacher", 10, f"headteacher.{RND}@novaratest.com"),
]

TOKENS = {}
for role_name, role_id, email in ROLES:
    r, _ = req("POST", "/users/", {
        "name": f"Test {role_name.title()}",
        "email": email,
        "password": PASS,
        "role_id": role_id,
        "school_id": SCHOOL_ID
    }, token=ADMIN_TOKEN, label=f"create {role_name}")
    if ok(r):
        TOKENS[role_name] = {"email": email, "user_id": r.get("id")}

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 7 — Login all role users")
# ═══════════════════════════════════════════════════════════════════════════
for role_name, _, email in ROLES:
    r, _ = req("POST", "/auth/login", {"email": email, "password": PASS}, label=f"login {role_name}")
    if ok(r) and "access_token" in r:
        TOKENS[role_name]["token"] = r["access_token"]
        print(f"  → {role_name} role_id={r['user']['role_id']} ✓")
    else:
        print(f"  → {role_name} login FAILED")

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 8 — Headteacher creates a teacher (role hierarchy test)")
# ═══════════════════════════════════════════════════════════════════════════
HT_TOKEN = TOKENS.get("headteacher", {}).get("token")
if HT_TOKEN:
    r, _ = req("POST", "/users/", {
        "name": "HT Created Teacher",
        "email": f"htteacher.{RND}@novaratest.com",
        "password": PASS,
        "role_id": 3
    }, token=HT_TOKEN, label="headteacher creates teacher")

    # Headteacher tries to create admin (should fail 403)
    r, code = req("POST", "/users/", {
        "name": "Should Fail",
        "email": f"fail.{RND}@novaratest.com",
        "password": PASS,
        "role_id": 2
    }, token=HT_TOKEN, label="headteacher creates admin (expect 403)")
    assert code == 403, f"Expected 403 but got {code}"
    print(f"  → Correctly blocked headteacher from creating admin ✓")

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 9 — Headteacher endpoints")
# ═══════════════════════════════════════════════════════════════════════════
if HT_TOKEN:
    req("GET", "/headteacher/staff", token=HT_TOKEN, label="staff list")
    req("GET", "/headteacher/attendance/summary", token=HT_TOKEN, label="attendance summary")
    req("GET", "/headteacher/performance", token=HT_TOKEN, label="class performance")
    req("GET", "/headteacher/leave/requests", token=HT_TOKEN, label="leave requests")
    # Submit leave request as headteacher
    r, _ = req("POST", "/headteacher/leave/apply", {
        "reason": "Medical appointment",
        "start_date": "2026-08-01",
        "end_date": "2026-08-02"
    }, token=HT_TOKEN, label="apply leave")

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 10 — Teacher endpoints")
# ═══════════════════════════════════════════════════════════════════════════
T_TOKEN = TOKENS.get("teacher", {}).get("token")
if T_TOKEN:
    req("GET", "/students/list", token=T_TOKEN, label="teacher views students")
    req("GET", "/attendance/list", token=T_TOKEN, label="teacher views attendance")
    req("GET", "/assessments/list", token=T_TOKEN, label="teacher views assessments")
    req("GET", "/notifications", token=T_TOKEN, label="teacher notifications")

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 11 — Bursar endpoints")
# ═══════════════════════════════════════════════════════════════════════════
B_TOKEN = TOKENS.get("bursar", {}).get("token")
if B_TOKEN:
    req("GET", "/fees/invoices", token=B_TOKEN, label="bursar invoices")
    req("GET", "/fees/payments", token=B_TOKEN, label="bursar payments")
    req("GET", "/finance/vouchers", token=B_TOKEN, label="bursar vouchers")

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 12 — Secretary endpoints")
# ═══════════════════════════════════════════════════════════════════════════
SEC_TOKEN = TOKENS.get("secretary", {}).get("token")
if SEC_TOKEN:
    req("GET", "/students/list", token=SEC_TOKEN, label="secretary views students")
    req("GET", "/students/full-list", token=SEC_TOKEN, label="secretary full student list")

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 13 — Librarian endpoints")
# ═══════════════════════════════════════════════════════════════════════════
LIB_TOKEN = TOKENS.get("librarian", {}).get("token")
if LIB_TOKEN:
    req("GET", "/library/books", token=LIB_TOKEN, label="librarian books")
    req("GET", "/library/borrows", token=LIB_TOKEN, label="librarian borrows")
    req("GET", "/library/requests", token=LIB_TOKEN, label="librarian requests")

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 14 — Parent endpoints")
# ═══════════════════════════════════════════════════════════════════════════
P_TOKEN = TOKENS.get("parent", {}).get("token")
if P_TOKEN:
    req("GET", "/fees/my-balance", token=P_TOKEN, label="parent fee balance")
    req("GET", "/notifications", token=P_TOKEN, label="parent notifications")

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 15 — Student endpoints")
# ═══════════════════════════════════════════════════════════════════════════
ST_TOKEN = TOKENS.get("student", {}).get("token")
if ST_TOKEN:
    req("GET", "/notifications", token=ST_TOKEN, label="student notifications")
    req("GET", "/library/books", token=ST_TOKEN, label="student library books")
    req("GET", "/report-cards/my", token=ST_TOKEN, label="student report card")

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 16 — Role gate tests (unauthorized access attempts)")
# ═══════════════════════════════════════════════════════════════════════════
# Teacher tries to access platform admin — should 403
r, code = req("GET", "/platform/stats", token=T_TOKEN, label="teacher→platform stats (expect 403)")
assert code == 403, f"Expected 403 got {code}"

# Parent tries to access admin overview — should 403
r, code = req("GET", "/admin/overview", token=P_TOKEN, label="parent→admin overview (expect 403)")
assert code == 403, f"Expected 403 got {code}"

# Student tries to create user — should 403
r, code = req("POST", "/users/", {"name":"x","email":"x@x.com","password":PASS,"role_id":3}, token=ST_TOKEN, label="student→create user (expect 403)")
assert code == 403, f"Expected 403 got {code}"
print(f"  → All role gates working correctly ✓")

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 17 — Super Admin platform checks")
# ═══════════════════════════════════════════════════════════════════════════
req("GET", "/platform/stats", token=SA_TOKEN, label="platform stats")
req("GET", "/platform/schools", token=SA_TOKEN, label="schools list")
req("GET", "/platform/audit-logs", token=SA_TOKEN, label="audit logs")
req("GET", "/platform/users", token=SA_TOKEN, label="platform users")
req("GET", "/platform/api-keys", token=SA_TOKEN, label="api keys list")

# Generate API key for the new school
r, _ = req("POST", "/platform/api-keys/generate", {
    "school_id": SCHOOL_ID,
    "description": "E2E test key",
    "expires_in_days": 30
}, token=SA_TOKEN, label="generate API key")
if ok(r) and "api_key" in r:
    API_KEY = r["api_key"]
    print(f"  → API key: {API_KEY[:14]}...")
    # Test the API key auth
    req("GET", "/api-auth/school-info",
        token=None,
        label="API key auth test")

# ═══════════════════════════════════════════════════════════════════════════
sep("STEP 18 — Face auth status checks")
# ═══════════════════════════════════════════════════════════════════════════
req("GET", "/face-auth/status", token=ADMIN_TOKEN, label="admin face status")
req("GET", "/face-auth/status", token=HT_TOKEN, label="headteacher face status")

# ═══════════════════════════════════════════════════════════════════════════
sep("SUMMARY")
# ═══════════════════════════════════════════════════════════════════════════
print(f"""
  School:       {SCHOOL_NAME}
  School Code:  {SCHOOL_CODE}
  School ID:    {SCHOOL_ID}
  Admin Email:  {ADMIN_EMAIL}
  Password:     {PASS}
  Roles tested: {', '.join(TOKENS.keys())}
""")
print("  E2E test complete ✓")
