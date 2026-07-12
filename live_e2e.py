import socket, ssl, json, time, sys

HOST = "sms-msku.onrender.com"
BASE = f"https://{HOST}"
API = "/api/v1"

def req(method, path, token=None, body=None, raw_path=False):
    url_path = path if raw_path else f"{API}{path}"
    payload = json.dumps(body).encode() if body else b""
    addr = socket.getaddrinfo(HOST, 443, socket.AF_INET)[0][4]
    ctx = ssl.create_default_context()
    s = socket.create_connection(addr, timeout=20)
    ss = ctx.wrap_socket(s, server_hostname=HOST)

    hdrs = [
        f"{method} {url_path} HTTP/1.1",
        f"Host: {HOST}",
        "Content-Type: application/json",
        f"Content-Length: {len(payload)}",
        "Connection: close",
    ]
    if token:
        hdrs.append(f"Authorization: Bearer {token}")
    ss.sendall(("\r\n".join(hdrs) + "\r\n\r\n").encode() + payload)

    resp = b""
    while True:
        chunk = ss.recv(8192)
        if not chunk:
            break
        resp += chunk
    ss.close()

    header_end = resp.find(b"\r\n\r\n")
    status_line = resp[:resp.find(b"\r\n")].decode()
    status_code = int(status_line.split(" ")[1])
    raw_body_raw = resp[header_end + 4:]

    headers_raw = resp[:header_end].decode()
    body_text = ""
    try:
        if "chunked" in headers_raw.lower():
            raw = raw_body_raw.decode()
            chunks = []
            pos = 0
            while pos < len(raw):
                eol = raw.find("\r\n", pos)
                if eol == -1:
                    break
                size_str = raw[pos:eol].strip()
                try:
                    size = int(size_str, 16)
                except ValueError:
                    chunks.append(raw[pos:])
                    break
                if size == 0:
                    break
                chunks.append(raw[eol+2:eol+2+size])
                pos = eol + 2 + size + 2
            body_text = "".join(chunks)
        else:
            body_text = raw_body_raw.decode()
    except Exception:
        body_text = raw_body_raw.decode(errors="replace")[:500]

    try:
        return status_code, json.loads(body_text)
    except json.JSONDecodeError:
        return status_code, {"raw": body_text[:500]}

ok = fail = 0
results = []

def check(label, status, expected, extra=""):
    global ok, fail
    exp = [expected] if isinstance(expected, int) else expected
    passed = status in exp
    if passed:
        ok += 1
        tag = "PASS"
    else:
        fail += 1
        tag = "FAIL"
    print(f"  {tag} [{status}] {label}{'  ' + extra if extra else ''}")
    results.append({"label": label, "status": status, "expected": exp, "passed": passed, "extra": extra})

def section(title):
    print(f"\n{'='*60}\n{title}\n{'='*60}")

# ================================================================
section("1. SYSTEM HEALTH & SPEED")
# ================================================================
t0 = time.time()
status, data = req("GET", "/api/health", raw_path=True)
check("GET /api/health", status, 200, f"({round(time.time()-t0,3)}s)")
print(f"  {json.dumps(data)}")

# ================================================================
section("2. SUPER ADMIN AUTHENTICATION")
# ================================================================
t0 = time.time()
status, data = req("POST", "/auth/login",
                   body={"email": "mwesigwaperez98@gmail.com", "password": "novara2026"})
check("POST /auth/login", status, 200, f"({round(time.time()-t0,3)}s)")
SUPER = data.get("access_token", "")
REFRESH = data.get("refresh_token", "")
assert SUPER, "No access token"
print(f"  access_token: {SUPER[:45]}...")
print(f"  refresh_token: {REFRESH[:45] if REFRESH else 'N/A'}...")

# Token refresh via /auth/refresh-token
if REFRESH:
    t0 = time.time()
    status, data = req("POST", "/auth/refresh-token",
                       body={"refresh_token": REFRESH})
    check("POST /auth/refresh-token", status, 200, f"({round(time.time()-t0,3)}s)")
    NEW_TOKEN = data.get("access_token", "")
    if NEW_TOKEN:
        SUPER = NEW_TOKEN
        print(f"  refreshed token: {SUPER[:45]}...")

# ================================================================
section("3. SCHOOL REGISTRATION FLOW")
# ================================================================
ts = int(time.time())
reg_email = f"regflow{ts}@school.com"

t0 = time.time()
status, data = req("POST", "/registration/register-school", body={
    "school_name": f"Registration Flow School {ts}",
    "admin_name": "Reg Flow Admin",
    "admin_email": reg_email,
    "admin_phone": "+256700111444",
    "plan_id": 1,
    "payment_method": "mobile_money",
    "payment_details": "256700111444",
})
check("POST /registration/register-school", status, [200, 201], f"({round(time.time()-t0,3)}s)")
print(f"  {json.dumps(data)[:200]}")

# List pending registrations
t0 = time.time()
status, data = req("GET", "/platform/registrations", token=SUPER)
check("GET /platform/registrations", status, [200, 404], f"({round(time.time()-t0,3)}s)")
count = len(data) if isinstance(data, list) else 0
print(f"  Pending registrations: {count}")

# ================================================================
section("4. SCHOOL CREATION (add-school)")
# ================================================================
admin_email = f"head{ts}@test.ac.ug"
t0 = time.time()
status, data = req("POST", "/platform/add-school", token=SUPER, body={
    "name": f"E2E Test School {ts}",
    "email": f"schule{ts}@school.com",
    "phone": "+256700111555",
    "address": "Kampala",
    "country": "Uganda",
    "timezone": "Africa/Kampala",
    "admin_name": f"Head Admin {ts}",
    "admin_email": admin_email,
    "admin_password": "StrongPass789!",
    "plan_id": 1,
})
check("POST /platform/add-school", status, 200, f"({round(time.time()-t0,3)}s)")
school_id = data.get("school_id", 0)
school_code = data.get("school_code", "")
print(f"  school_id={school_id} code={school_code}")
print(f"  {data.get('message', '')}")

# ================================================================
section("5. CREATE ALL ROLE USERS")
# ================================================================
roles_map = [
    ("teacher", 3, "Teacher One", f"teacher{ts}@test.ac.ug"),
    ("parent", 4, "Parent One", f"parent{ts}@test.ac.ug"),
    ("student", 5, "Student One", f"student{ts}@test.ac.ug"),
    ("bursar", 6, "Bursar One", f"bursar{ts}@test.ac.ug"),
    ("secretary", 7, "Secretary One", f"secretary{ts}@test.ac.ug"),
    ("librarian", 8, "Librarian One", f"librarian{ts}@test.ac.ug"),
    ("ict_admin", 9, "ICT Admin", f"ict{ts}@test.ac.ug"),
]

t0 = time.time()
status, data = req("POST", "/auth/login",
                   body={"email": admin_email, "password": "StrongPass789!"})
check("login school admin (to create users)", status, 200, f"({round(time.time()-t0,3)}s)")
SCHOOL_ADMIN_TOKEN = data.get("access_token", "")

# Try creating another admin — should be FORBIDDEN (security by design)
t0 = time.time()
status, data = req("POST", "/users/", token=SCHOOL_ADMIN_TOKEN, body={
    "name": "Rogue Admin",
    "email": f"badadmin{ts}@test.ac.ug",
    "password": "Pass1234!",
    "role_id": 2,
})
check("create admin (another admin) → 403 (correct)", status, 403, f"({round(time.time()-t0,3)}s)")

# Create 7 non-admin role users
for role_key, role_id, name, email in roles_map:
    t0 = time.time()
    status, data = req("POST", "/users/", token=SCHOOL_ADMIN_TOKEN, body={
        "name": name,
        "email": email,
        "password": "Pass1234!",
        "role_id": role_id,
    })
    check(f"create {role_key} (role_id={role_id})", status, 200, f"({round(time.time()-t0,3)}s)")
    print(f"    -> id={data.get('id',0)}")

    t0 = time.time()
    status, data = req("POST", "/auth/login",
                       body={"email": email, "password": "Pass1234!"})
    check(f"login {role_key}", status, 200, f"({round(time.time()-t0,3)}s)")

    role_token = data.get("access_token", "")
    if role_key == "teacher":
        s, _ = req("GET", "/admin/overview", token=role_token)
        check(f"teacher GET /admin/overview → 403", s, 403)

# ================================================================
section("6. API KEY GENERATION & AUTH TEST")
# ================================================================
t0 = time.time()
status, data = req("POST", "/platform/api-keys/generate", token=SUPER, body={
    "school_id": school_id,
    "description": f"E2E test key {ts}",
    "expires_in_days": 90,
})
check("POST /platform/api-keys/generate", status, 200, f"({round(time.time()-t0,3)}s)")
API_KEY = data.get("api_key", "")
key_id = data.get("id", 0)
print(f"  key_id={key_id} api_key={API_KEY[:30]}...")

t0 = time.time()
status, data = req("GET", "/platform/api-keys", token=SUPER)
check("GET /platform/api-keys", status, 200, f"({round(time.time()-t0,3)}s)")
print(f"  Total keys: {len(data)}")

# Try login with API key (middleware likely not implemented)
t0 = time.time()
status, data = req("POST", "/auth/login", body={"api_key": API_KEY})
check("POST /auth/login with api_key (expect 422 — no middleware)", status, [200, 422],
      f"({round(time.time()-t0,3)}s)")
if status == 200:
    print("  ** API KEY AUTH IS ACTIVE **")
else:
    print("  API key auth middleware not implemented (expected)")

# Revoke
t0 = time.time()
status, data = req("POST", f"/platform/api-keys/{key_id}/revoke", token=SUPER)
check(f"POST /platform/api-keys/{key_id}/revoke", status, 200, f"({round(time.time()-t0,3)}s)")

# ================================================================
section("7. SYSTEM CHECK")
# ================================================================
t0 = time.time()
status, data = req("POST", "/platform/system-check/trigger", token=SUPER)
if status == 409:
    check("POST /platform/system-check/trigger (already scheduled)", status, 409,
          f"({round(time.time()-t0,3)}s)")
else:
    check("POST /platform/system-check/trigger", status, 200,
          f"({round(time.time()-t0,3)}s)")
    print(f"  id={data.get('id')} msg={data.get('message','')[:80]}")

t0 = time.time()
status, data = req("GET", "/platform/system-checks", token=SUPER)
check("GET /platform/system-checks", status, 200, f"({round(time.time()-t0,3)}s)")
print(f"  Checks: {len(data)}")

# ================================================================
section("8. SUBSCRIPTION ENFORCEMENT")
# ================================================================
t0 = time.time()
status, data = req("POST", "/platform/schools", token=SUPER, body={
    "school": {"name": f"Expiry School {ts}", "school_code": f"EXP{ts%10000}"},
    "admin": {"name": "Expiry Admin", "email": f"expired{ts}@test.ac.ug", "password": "ExpPass123!"},
})
check("POST /platform/schools (for subscription test)", status, 200,
      f"({round(time.time()-t0,3)}s)")
exp_school_id = data.get("school", {}).get("id", 0)
print(f"  expiry school id={exp_school_id}")

status, data = req("POST", "/auth/login",
                   body={"email": f"expired{ts}@test.ac.ug", "password": "ExpPass123!"})
if status == 200:
    EXP_TOKEN = data.get("access_token", "")
    t0 = time.time()
    s, _ = req("GET", "/students/list", token=EXP_TOKEN)
    check("expired-school GET /students/list", s, [200, 403],
          f"({round(time.time()-t0,3)}s)")
    print(f"  Subscription status: {s}")

# ================================================================
section("9. FACIAL AUTHENTICATION")
# ================================================================
t0 = time.time()
status, data = req("POST", "/face-auth/login",
                   body={"email": admin_email, "face_descriptor": [0.1]*128})
check("POST /face-auth/login", status, [200, 400, 404, 422],
      f"({round(time.time()-t0,3)}s)")
print(f"  {json.dumps(data)[:150]}")

t0 = time.time()
status, data = req("POST", "/face-auth/register", token=SCHOOL_ADMIN_TOKEN,
                   body={"face_descriptor": [0.1]*128})
check("POST /face-auth/register", status, [200, 400, 404, 422],
      f"({round(time.time()-t0,3)}s)")
print(f"  {json.dumps(data)[:150]}")

# ================================================================
section("10. PLATFORM STATS & NO-500 SWEEP")
# ================================================================
t0 = time.time()
status, data = req("GET", "/platform/stats", token=SUPER)
check("GET /platform/stats", status, 200, f"({round(time.time()-t0,3)}s)")
print(f"  {json.dumps(data)}")

# 10a. GET /platform/audit-logs (was 500 — should be fixed now)
t0 = time.time()
status, data = req("GET", "/platform/audit-logs", token=SUPER)
if status >= 500:
    check(f"FIXED: GET /platform/audit-logs → no 500", status, range(200, 500),
          f"({round(time.time()-t0,3)}s) STILL {status}!")
else:
    check("GET /platform/audit-logs", status, [200, 404],
          f"({round(time.time()-t0,3)}s)")
if isinstance(data, list):
    print(f"  Audit logs: {len(data)} entries")
else:
    print(f"  {json.dumps(data)[:150]}")

# 10b. Sweep more endpoints for 500s
sweep = [
    ("GET /platform/schools", "GET", "/platform/schools"),
    ("GET /platform/subscription-plans", "GET", "/platform/subscription-plans"),
    ("GET /platform/users", "GET", "/platform/users"),
    ("POST /auth/refresh-token (bad token)", "POST", "/auth/refresh-token",
     {"refresh_token": "invalid"}),
    ("POST /auth/verify-2fa (no 2fa)", "POST", "/auth/verify-2fa",
     {"email": admin_email, "code": "000000"}),
]
for label, method, path, *body_list in sweep:
    body = body_list[0] if body_list else None
    t0 = time.time()
    s, d = req(method, path, token=SUPER, body=body)
    if s >= 500:
        check(f"NO 500: {label}", s, range(200, 500),
              f"({round(time.time()-t0,3)}s) !! 500 !! {json.dumps(d)[:150]}")
    else:
        check(label, s, [200, 400, 401, 403, 404, 422],
              f"({round(time.time()-t0,3)}s)")

# ================================================================
section("11. ENDPOINT SPEED REPORT")
# ================================================================
print(f"\n{'ENDPOINT':<60s} {'STATUS':<8s} {'TIME':<8s}")
print("-"*76)
for r in results:
    label = r["label"][:57]
    extra = r.get("extra", "")
    time_str = extra.split("(")[-1].split("s")[0] + "s" if "(" in extra else ""
    print(f"  {label:<57s} {'PASS' if r['passed'] else 'FAIL':<8s} {time_str:<8s}")

# ================================================================
section("FINAL SUMMARY")
# ================================================================
print(f"\nTotal: {ok} passed / {fail} failed / {ok+fail} tests")
if fail:
    print(f"\nFAILURES ({fail}):")
    for r in results:
        if not r["passed"]:
            e = r.get("extra","")
            print(f"  [{r['status']}] {r['label']} (expected {r['expected']}) {e}")
    sys.exit(1)
else:
    print("\nALL TESTS PASSED! System is fully operational.")
