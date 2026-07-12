#!/usr/bin/env python3
"""
Comprehensive System E2E Test — NOVARA SMS
Tests: Registration → API Key → All Roles → Headteacher → Role Gates
Run: python3 system_test.py
"""
import json, time, random, string, sys, ssl
import urllib.request, urllib.error

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

BASE = "https://sms-msku.onrender.com/api/v1"
HEALTH = "https://sms-msku.onrender.com/api/health"
PASS = "Novara2026!"

ok_count = fail_count = 0
results = []
RND = "".join(random.choices(string.ascii_lowercase, k=5))

def req(method, path, body=None, token=None, api_key=None, label=""):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if api_key:
        headers["X-API-Key"] = api_key
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        t0 = time.time()
        with urllib.request.urlopen(r, context=SSL_CTX, timeout=45) as resp:
            elapsed = round(time.time() - t0, 3)
            result = json.loads(resp.read())
            print(f"  PASS [{resp.status}] {method} {path} ({elapsed}s)" + (f" [{label}]" if label else ""))
            results.append({"label": f"{method} {path}" + (f" [{label}]" if label else ""), "status": resp.status, "passed": True, "time": elapsed})
            return result, resp.status
    except urllib.error.HTTPError as e:
        elapsed = round(time.time() - t0, 3)
        body_err = e.read().decode()
        try:
            detail = json.loads(body_err).get("detail", body_err)
        except Exception:
            detail = body_err[:200]
        print(f"  FAIL [{e.code}] {method} {path} ({elapsed}s): {detail}" + (f" [{label}]" if label else ""))
        results.append({"label": f"{method} {path}" + (f" [{label}]" if label else ""), "status": e.code, "passed": False, "time": elapsed, "detail": str(detail)[:150]})
        return {"error": detail, "status_code": e.code}, e.code

def ok(result):
    return isinstance(result, dict) and "error" not in result

def sep(title):
    print(f"\n{'='*65}")
    print(f"  {title}")
    print(f"{'='*65}")

def section(title):
    print(f"\n{'─'*65}")
    print(f"  {title}")
    print(f"{'─'*65}")


# ═══════════════════════════════════════════════════════════════════════════
sep("1. SYSTEM HEALTH CHECK")
# ═══════════════════════════════════════════════════════════════════════════
try:
    t0 = time.time()
    r = urllib.request.Request(HEALTH)
    with urllib.request.urlopen(r, context=SSL_CTX, timeout=30) as resp:
        health = json.loads(resp.read())
        print(f"  Backend alive ({round(time.time()-t0,3)}s)")
        print(f"  {json.dumps(health)}")
        results.append({"label": "Health check", "status": 200, "passed": True, "time": round(time.time()-t0,3)})
except Exception as e:
    print(f"  CRITICAL: Backend unreachable: {e}")
    sys.exit(1)

# ═══════════════════════════════════════════════════════════════════════════
sep("2. SUPER ADMIN LOGIN")
# ═══════════════════════════════════════════════════════════════════════════
r, _ = req("POST", "/auth/login", {"email": "mwesigwaperez98@gmail.com", "password": "novara2026"})
assert ok(r) and "access_token" in r, f"Super admin login FAILED: {r}"
SA_TOKEN = r["access_token"]
SA_REFRESH = r.get("refresh_token", "")
print(f"  Super admin token acquired")

# Test refresh token
if SA_REFRESH:
    r2, _ = req("POST", "/auth/refresh-token", {"refresh_token": SA_REFRESH}, label="token refresh")
    if ok(r2) and "access_token" in r2:
        SA_TOKEN = r2["access_token"]
        print(f"  Token refreshed successfully")

# ═══════════════════════════════════════════════════════════════════════════
sep("3. REGISTER SCHOOL (public endpoint)")
# ═══════════════════════════════════════════════════════════════════════════
SCHOOL_NAME = f"Novara E2E School {RND.upper()}"
ADMIN_EMAIL = f"admin.{RND}@novaratest.com"
r, _ = req("POST", "/registration/register-school", {
    "school_name": SCHOOL_NAME,
    "admin_name": f"Test Admin {RND}",
    "admin_email": ADMIN_EMAIL,
    "admin_phone": "0700000001",
    "payment_method": "mobile_money",
    "payment_details": "MTN 0700000001 - Test"
})
assert ok(r) and "id" in r, f"Registration failed: {r}"
REG_ID = r["id"]
print(f"  Registration ID: {REG_ID}")

# ═══════════════════════════════════════════════════════════════════════════
sep("4. SUPER ADMIN APPROVES REGISTRATION → PRODUCT KEY")
# ═══════════════════════════════════════════════════════════════════════════
r, _ = req("POST", f"/platform/registrations/{REG_ID}/approve", token=SA_TOKEN, label="approve registration")
assert ok(r) and "product_key" in r, f"Approval failed: {r}"
REG_KEY = r["product_key"]
print(f"  Product key: {REG_KEY[:12]}...")

# ═══════════════════════════════════════════════════════════════════════════
sep("5. COMPLETE REGISTRATION (creates school + admin user)")
# ═══════════════════════════════════════════════════════════════════════════
r, _ = req("POST", "/registration/complete", {
    "key": REG_KEY,
    "email": ADMIN_EMAIL,
    "password": PASS,
    "full_name": f"Test Admin {RND}",
    "phone": "0700000001"
})
assert ok(r) and "school_code" in r, f"Complete registration failed: {r}"
SCHOOL_CODE = r["school_code"]
print(f"  School: {r.get('school_name')} ({SCHOOL_CODE})")

# ═══════════════════════════════════════════════════════════════════════════
sep("6. SCHOOL ADMIN LOGIN")
# ═══════════════════════════════════════════════════════════════════════════
r, _ = req("POST", "/auth/login", {"email": ADMIN_EMAIL, "password": PASS})
assert ok(r) and "access_token" in r, f"Admin login FAILED: {r}"
ADMIN_TOKEN = r["access_token"]
SCHOOL_ID = r["user"]["school_id"]
print(f"  Admin token acquired | school_id={SCHOOL_ID}")

# ═══════════════════════════════════════════════════════════════════════════
sep("7. ACTIVATE SUBSCRIPTION (needed for student-list endpoints)")
# ═══════════════════════════════════════════════════════════════════════════
plans_r, _ = req("GET", "/subscriptions/plans", label="list plans")
PLAN_ID = plans_r[0]["id"] if ok(plans_r) and plans_r else 1

sub_r, _ = req("POST", "/subscriptions/keys/generate", {"school_id": SCHOOL_ID, "plan_id": PLAN_ID}, token=SA_TOKEN, label="generate product key")
if ok(sub_r) and "product_key" in sub_r:
    PK = sub_r["product_key"]
    act_r, _ = req("POST", "/subscriptions/activate", {"product_key": PK, "school_id": SCHOOL_ID}, token=ADMIN_TOKEN, label="activate subscription")
    print(f"  Subscription activated")

# ═══════════════════════════════════════════════════════════════════════════
sep("8. ADMIN CREATES ALL ROLE USERS")
# ═══════════════════════════════════════════════════════════════════════════
ROLES = [
    ("headteacher", 10, f"headteacher.{RND}@novaratest.com", "Head Teacher"),
    ("teacher",      3, f"teacher.{RND}@novaratest.com",     "Teacher"),
    ("bursar",       6, f"bursar.{RND}@novaratest.com",      "Bursar"),
    ("secretary",    7, f"secretary.{RND}@novaratest.com",    "Secretary"),
    ("librarian",    8, f"librarian.{RND}@novaratest.com",    "Librarian"),
    ("ict_admin",    9, f"ict.{RND}@novaratest.com",          "ICT Admin"),
    ("parent",       4, f"parent.{RND}@novaratest.com",       "Parent"),
    ("student",      5, f"student.{RND}@novaratest.com",      "Student"),
]

USER_IDS = {}
TOKENS = {}

for role_name, role_id, email, display_name in ROLES:
    r, _ = req("POST", "/users/", {
        "name": f"{display_name} {RND}",
        "email": email,
        "password": PASS,
        "role_id": role_id,
    }, token=ADMIN_TOKEN, label=f"create {role_name}")
    if ok(r):
        USER_IDS[role_name] = r.get("id")
        print(f"  Created {role_name} (id={r.get('id')})")
    else:
        print(f"  FAILED to create {role_name}: {r}")

# ═══════════════════════════════════════════════════════════════════════════
sep("9. LOGIN ALL ROLES")
# ═══════════════════════════════════════════════════════════════════════════
for role_name, role_id, email, display_name in ROLES:
    r, _ = req("POST", "/auth/login", {"email": email, "password": PASS}, label=f"login {role_name}")
    if ok(r) and "access_token" in r:
        TOKENS[role_name] = r["access_token"]
        returned_role = r["user"]["role_id"]
        print(f"  {role_name}: role_id={returned_role} OK")
    else:
        print(f"  {role_name}: LOGIN FAILED")
        TOKENS[role_name] = None

# ═══════════════════════════════════════════════════════════════════════════
sep("10. GENERATE API KEY (Super Admin)")
# ═══════════════════════════════════════════════════════════════════════════
r, _ = req("POST", "/platform/api-keys/generate", {
    "school_id": SCHOOL_ID,
    "description": f"E2E test key {RND}",
    "expires_in_days": 90
}, token=SA_TOKEN, label="generate API key")
assert ok(r) and "api_key" in r, f"API key generation failed: {r}"
API_KEY = r["api_key"]
KEY_ID = r.get("id")
print(f"  API key: {API_KEY[:20]}...")

# ═══════════════════════════════════════════════════════════════════════════
sep("11. TEST API KEY AUTH (X-API-Key header)")
# ═══════════════════════════════════════════════════════════════════════════
r, code = req("GET", "/api-auth/school-info", api_key=API_KEY, label="API key → school-info")
if code == 200:
    print(f"  API key auth WORKS! School: {r.get('school_name')} ({r.get('school_code')})")
else:
    print(f"  API key auth returned {code}: {r}")

# Test with invalid key
r, code = req("GET", "/api-auth/school-info", api_key="novara_invalid_key_123456", label="invalid API key")
print(f"  Invalid key rejected: {code} (expected 401)")

# ═══════════════════════════════════════════════════════════════════════════
sep("12. HEADTEACHER ROLE — ENDPOINT TESTS")
# ═══════════════════════════════════════════════════════════════════════════
HT_TOKEN = TOKENS.get("headteacher")
if HT_TOKEN:
    section("12a. Staff list")
    r, _ = req("GET", "/headteacher/staff", token=HT_TOKEN, label="HT: staff list")
    if ok(r) and isinstance(r, list):
        print(f"  Staff count: {len(r)}")

    section("12b. Toggle staff active status")
    if USER_IDS.get("teacher"):
        tid = USER_IDS["teacher"]
        r, _ = req("PATCH", f"/headteacher/staff/{tid}/toggle-active", token=HT_TOKEN, label="HT: deactivate teacher")
        if ok(r):
            print(f"  Teacher toggled: {r.get('is_active')}")
            # Toggle back
            req("PATCH", f"/headteacher/staff/{tid}/toggle-active", token=HT_TOKEN, label="HT: reactivate teacher")

    section("12c. Attendance summary")
    r, _ = req("GET", "/headteacher/attendance/summary", token=HT_TOKEN, label="HT: attendance summary")
    if ok(r):
        print(f"  Date: {r.get('date')} | Total: {r.get('total_students')} | Rate: {r.get('attendance_rate')}%")

    section("12d. Class performance averages")
    r, _ = req("GET", "/headteacher/performance", token=HT_TOKEN, label="HT: performance")
    if ok(r):
        print(f"  Classes: {len(r)}")

    section("12e. Leave request flow")
    # Teacher applies for leave
    T_TOKEN = TOKENS.get("teacher")
    if T_TOKEN:
        req("POST", "/headteacher/leave/apply", {
            "reason": "Medical appointment",
            "start_date": "2026-08-01",
            "end_date": "2026-08-02"
        }, token=T_TOKEN, label="teacher: apply leave")

    # Headteacher lists leave requests
    r, _ = req("GET", "/headteacher/leave/requests", token=HT_TOKEN, label="HT: list leave requests")
    if ok(r) and isinstance(r, list):
        print(f"  Leave requests: {len(r)}")
        # Approve first pending one
        for lv in r:
            if lv.get("status") == "pending":
                req("PATCH", f"/headteacher/leave/{lv['id']}/decide", {"decision": "approved"}, token=HT_TOKEN, label=f"HT: approve leave #{lv['id']}")
                break

    section("12f. Headteacher creates user (teacher only)")
    r, _ = req("POST", "/users/", {
        "name": f"HT Created Teacher {RND}",
        "email": f"htteacher.{RND}@novaratest.com",
        "password": PASS,
        "role_id": 3,
    }, token=HT_TOKEN, label="HT: create teacher")
    if ok(r):
        print(f"  HT created teacher (id={r.get('id')})")

    # Headteacher tries to create admin — should be 403
    r, code = req("POST", "/users/", {
        "name": "Bad Admin",
        "email": f"badadmin.{RND}@novaratest.com",
        "password": PASS,
        "role_id": 2,
    }, token=HT_TOKEN, label="HT: create admin (expect 403)")
    assert code == 403, f"Expected 403 got {code}"
    print(f"  HT blocked from creating admin (correct)")

    # Headteacher tries to create bursar — should be 403
    r, code = req("POST", "/users/", {
        "name": "Bad Bursar",
        "email": f"badbursar.{RND}@novaratest.com",
        "password": PASS,
        "role_id": 6,
    }, token=HT_TOKEN, label="HT: create bursar (expect 403)")
    assert code == 403, f"Expected 403 got {code}"
    print(f"  HT blocked from creating bursar (correct)")
else:
    print("  HEADTEACHER TOKEN NOT AVAILABLE — SKIPPING")

# ═══════════════════════════════════════════════════════════════════════════
sep("13. TEACHER ENDPOINTS")
# ═══════════════════════════════════════════════════════════════════════════
T_TOKEN = TOKENS.get("teacher")
if T_TOKEN:
    req("GET", "/admin/overview", token=T_TOKEN, label="teacher: admin overview (expect 403)")
    req("GET", "/students/list", token=T_TOKEN, label="teacher: students list")
    req("GET", "/notifications", token=T_TOKEN, label="teacher: notifications")
    req("GET", "/headteacher/staff", token=T_TOKEN, label="teacher: HT staff (expect 403)")
else:
    print("  Teacher token not available")

# ═══════════════════════════════════════════════════════════════════════════
sep("14. BURSAR ENDPOINTS")
# ═══════════════════════════════════════════════════════════════════════════
B_TOKEN = TOKENS.get("bursar")
if B_TOKEN:
    req("GET", "/finance/cashbook", token=B_TOKEN, label="bursar: cashbook")
    req("GET", "/finance/quotations", token=B_TOKEN, label="bursar: quotations")
    req("GET", "/finance/requisitions", token=B_TOKEN, label="bursar: requisitions")
    req("GET", "/finance/bank-account", token=B_TOKEN, label="bursar: bank account")
    req("GET", "/admin/overview", token=B_TOKEN, label="bursar: admin overview (expect 403)")
    req("GET", "/platform/stats", token=B_TOKEN, label="bursar: platform stats (expect 403)")
else:
    print("  Bursar token not available")

# ═══════════════════════════════════════════════════════════════════════════
sep("15. SECRETARY ENDPOINTS")
# ═══════════════════════════════════════════════════════════════════════════
SEC_TOKEN = TOKENS.get("secretary")
if SEC_TOKEN:
    req("GET", "/students/list", token=SEC_TOKEN, label="secretary: students list")
    req("GET", "/notifications", token=SEC_TOKEN, label="secretary: notifications")
    req("GET", "/admin/overview", token=SEC_TOKEN, label="secretary: admin overview (expect 403)")
else:
    print("  Secretary token not available")

# ═══════════════════════════════════════════════════════════════════════════
sep("16. LIBRARIAN ENDPOINTS")
# ═══════════════════════════════════════════════════════════════════════════
LIB_TOKEN = TOKENS.get("librarian")
if LIB_TOKEN:
    req("GET", "/library/books", token=LIB_TOKEN, label="librarian: books")
    req("GET", "/library/requests", token=LIB_TOKEN, label="librarian: book requests")
    req("GET", "/notifications", token=LIB_TOKEN, label="librarian: notifications")
    req("GET", "/admin/overview", token=LIB_TOKEN, label="librarian: admin overview (expect 403)")
else:
    print("  Librarian token not available")

# ═══════════════════════════════════════════════════════════════════════════
sep("17. ICT ADMIN ENDPOINTS")
# ═══════════════════════════════════════════════════════════════════════════
ICT_TOKEN = TOKENS.get("ict_admin")
if ICT_TOKEN:
    req("GET", "/notifications", token=ICT_TOKEN, label="ict: notifications")
    req("GET", "/students/list", token=ICT_TOKEN, label="ict: students list")
    req("GET", "/admin/overview", token=ICT_TOKEN, label="ict: admin overview (expect 403)")
else:
    print("  ICT Admin token not available")

# ═══════════════════════════════════════════════════════════════════════════
sep("18. PARENT ENDPOINTS")
# ═══════════════════════════════════════════════════════════════════════════
P_TOKEN = TOKENS.get("parent")
if P_TOKEN:
    req("GET", "/notifications", token=P_TOKEN, label="parent: notifications")
    req("GET", "/library/books", token=P_TOKEN, label="parent: library books")
    req("GET", "/admin/overview", token=P_TOKEN, label="parent: admin overview (expect 403)")
    req("GET", "/platform/stats", token=P_TOKEN, label="parent: platform stats (expect 403)")
else:
    print("  Parent token not available")

# ═══════════════════════════════════════════════════════════════════════════
sep("19. STUDENT ENDPOINTS")
# ═══════════════════════════════════════════════════════════════════════════
ST_TOKEN = TOKENS.get("student")
if ST_TOKEN:
    req("GET", "/notifications", token=ST_TOKEN, label="student: notifications")
    req("GET", "/library/books", token=ST_TOKEN, label="student: library books")
    req("GET", "/admin/overview", token=ST_TOKEN, label="student: admin overview (expect 403)")
    req("GET", "/headteacher/staff", token=ST_TOKEN, label="student: HT staff (expect 403)")
    req("POST", "/users/", {"name":"x","email":"x@x.com","password":PASS,"role_id":3}, token=ST_TOKEN, label="student: create user (expect 403)")
else:
    print("  Student token not available")

# ═══════════════════════════════════════════════════════════════════════════
sep("20. FACE AUTH ENDPOINTS")
# ═══════════════════════════════════════════════════════════════════════════
if ADMIN_TOKEN:
    req("GET", "/face-auth/status", token=ADMIN_TOKEN, label="admin: face status")
    req("POST", "/face-auth/login", {"email": ADMIN_EMAIL, "face_descriptor": [0.1]*128}, label="face login (no registered face)")

# ═══════════════════════════════════════════════════════════════════════════
sep("21. SUPER ADMIN PLATFORM OPERATIONS")
# ═══════════════════════════════════════════════════════════════════════════
req("GET", "/platform/stats", token=SA_TOKEN, label="platform stats")
req("GET", "/platform/schools", token=SA_TOKEN, label="platform schools")
req("GET", "/platform/registrations", token=SA_TOKEN, label="platform registrations")
req("GET", "/platform/audit-logs", token=SA_TOKEN, label="platform audit logs")
req("GET", "/platform/users", token=SA_TOKEN, label="platform users")
req("GET", "/platform/api-keys", token=SA_TOKEN, label="platform api keys")
req("GET", "/platform/plans", token=SA_TOKEN, label="platform plans")
req("GET", f"/platform/schools/{SCHOOL_ID}", token=SA_TOKEN, label="platform school detail")

# Revoke the API key
if KEY_ID:
    req("POST", f"/platform/api-keys/{KEY_ID}/revoke", token=SA_TOKEN, label="revoke API key")
    # Verify revoked key no longer works
    r, code = req("GET", "/api-auth/school-info", api_key=API_KEY, label="revoked key (expect 401)")
    print(f"  Revoked key test: {code} (expected 401)")

# ═══════════════════════════════════════════════════════════════════════════
sep("22. UNAUTHENTICATED ACCESS (no token)")
# ═══════════════════════════════════════════════════════════════════════════
req("GET", "/admin/overview", label="no token: admin overview (expect 401)")
req("GET", "/platform/stats", label="no token: platform stats (expect 401)")
req("GET", "/headteacher/staff", label="no token: HT staff (expect 401)")
req("GET", "/students/list", label="no token: students (expect 401)")

# ═══════════════════════════════════════════════════════════════════════════
sep("23. ROLE GATE SUMMARY (cross-role unauthorized)")
# ═══════════════════════════════════════════════════════════════════════════
gate_tests = [
    ("teacher", T_TOKEN, "GET", "/platform/stats", "teacher → platform stats"),
    ("teacher", T_TOKEN, "GET", "/admin/overview", "teacher → admin overview"),
    ("parent", P_TOKEN, "GET", "/platform/stats", "parent → platform stats"),
    ("parent", P_TOKEN, "GET", "/admin/overview", "parent → admin overview"),
    ("student", ST_TOKEN, "POST", "/users/", "student → create user"),
    ("student", ST_TOKEN, "GET", "/headteacher/staff", "student → HT staff"),
    ("bursar", B_TOKEN, "GET", "/platform/stats", "bursar → platform stats"),
    ("bursar", B_TOKEN, "GET", "/admin/overview", "bursar → admin overview"),
    ("librarian", LIB_TOKEN, "GET", "/platform/stats", "librarian → platform stats"),
    ("ict_admin", ICT_TOKEN, "GET", "/platform/stats", "ict → platform stats"),
    ("headteacher", HT_TOKEN, "GET", "/platform/stats", "headteacher → platform stats"),
]

passed_gates = 0
for role, tok, method, path, desc in gate_tests:
    if not tok:
        continue
    body = {"name":"x","email":"x@x.com","password":PASS,"role_id":3} if method == "POST" else None
    r, code = req(method, path, body=body, token=tok, label=f"gate: {desc}")
    if code in (401, 403):
        passed_gates += 1
        print(f"  CORRECTLY BLOCKED {desc} → {code}")
    else:
        print(f"  WARNING: {desc} returned {code} (expected 401/403)")

# ═══════════════════════════════════════════════════════════════════════════
sep("FINAL RESULTS")
# ═══════════════════════════════════════════════════════════════════════════
total = len(results)
passed = sum(1 for r in results if r["passed"])
failed = total - passed
avg_time = round(sum(r["time"] for r in results) / total, 3) if total else 0

print(f"""
  School:       {SCHOOL_NAME}
  School Code:  {SCHOOL_CODE}
  School ID:    {SCHOOL_ID}
  Admin Email:  {ADMIN_EMAIL}
  Password:     {PASS}
  Roles:        {', '.join(TOKENS.keys())}
  Role Gates:   {passed_gates}/{len(gate_tests)} correct
""")
print(f"  TOTAL: {passed} passed / {failed} failed / {total} tests")
print(f"  AVG RESPONSE: {avg_time}s")

if failed:
    print(f"\n  FAILURES ({failed}):")
    for r in results:
        if not r["passed"]:
            detail = r.get("detail", "")
            print(f"    [{r['status']}] {r['label']} {detail}")
    print("\n  SOME TESTS FAILED")
    sys.exit(1)
else:
    print("\n  ALL TESTS PASSED — System fully operational!")
    sys.exit(0)
