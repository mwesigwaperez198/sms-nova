import socket, ssl, json, time, sys

HOST = "sms-msku.onrender.com"
BASE = f"https://{HOST}"
API = "/api/v1"

def req(method, path, token=None, body=None):
    url_path = f"{API}{path}"
    payload = json.dumps(body).encode() if body else b""
    addr = socket.getaddrinfo(HOST, 443, socket.AF_INET)[0][4]
    ctx = ssl.create_default_context()
    s = socket.create_connection(addr, timeout=15)
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
    raw_body = resp[header_end + 4:].strip()

    # Handle chunked transfer
    try:
        body_text = raw_body.decode()
        if "transfer-encoding" in resp[:header_end].decode().lower() and \
           "chunked" in resp[:header_end].decode().lower():
            chunks = []
            pos = 0
            while pos < len(body_text):
                chunk_end = body_text.find("\r\n", pos)
                if chunk_end == -1:
                    break
                chunk_size_str = body_text[pos:chunk_end].strip()
                try:
                    chunk_size = int(chunk_size_str, 16)
                except ValueError:
                    chunks.append(body_text[pos:])
                    break
                if chunk_size == 0:
                    break
                chunk_data = body_text[chunk_end + 2:chunk_end + 2 + chunk_size]
                chunks.append(chunk_data)
                pos = chunk_end + 2 + chunk_size + 2
            body_text = "".join(chunks)
        return status_code, json.loads(body_text)
    except Exception:
        return status_code, {"raw": raw_body.decode()[:500]}

ok = fail = 0

def check(label, status, expected):
    global ok, fail
    exp = [expected] if isinstance(expected, int) else expected
    if status in exp:
        print(f"  PASS [{status}] {label}")
        ok += 1
    else:
        print(f"  FAIL [{status}] {label}  (expected {exp})")
        fail += 1

print("=" * 60)
print("LIVE TEST: Backend Platform Admin API")
print(f"Target: {BASE}")
print("=" * 60)

# 1. Super admin login
print("\n--- Super Admin Login ---")
status, data = req("POST", "/auth/login",
                   body={"email": "mwesigwaperez98@gmail.com", "password": "novara2026"})
check("login super admin", status, 200)
SUPER_TOKEN = data.get("access_token", "")
if SUPER_TOKEN:
    print(f"  Token: {SUPER_TOKEN[:40]}...")
else:
    print(f"  DEBUG response keys: {list(data.keys())}")
    print(f"  Response: {json.dumps(data)[:300]}")
    sys.exit(1)

# 2. Platform stats
print("\n--- Platform Stats ---")
status, data = req("GET", "/platform/stats", token=SUPER_TOKEN)
check("GET /platform/stats", status, 200)
print(f"  schools={data.get('total_schools')} pending={data.get('pending_registrations')} active_subs={data.get('active_subscriptions')}")

# 3. List API keys (baseline)
print("\n--- List API Keys (baseline) ---")
status, data = req("GET", "/platform/api-keys", token=SUPER_TOKEN)
check("GET /platform/api-keys", status, 200)
baseline_count = len(data)
print(f"  Existing keys: {baseline_count}")

# 4. Create test school via add-school
print("\n--- Add School ---")
ts = int(time.time())
school_email = f"liveschool{ts}@test.ac.ug"
admin_email = f"liveadmin{ts}@test.ac.ug"
status, data = req("POST", "/platform/add-school", token=SUPER_TOKEN, body={
    "name": f"Live Test School {ts}",
    "email": school_email,
    "phone": "+256700111333",
    "address": "Kampala",
    "country": "Uganda",
    "timezone": "Africa/Kampala",
    "admin_name": f"Live Admin {ts}",
    "admin_email": admin_email,
    "admin_password": "TestPass123!",
    "plan_id": 1,
})
check("POST /platform/add-school", status, 200)
school_id = data.get("school_id", 0)
admin_user_id = data.get("admin_user_id", 0)
school_code = data.get("school_code", "")
print(f"  school_id={school_id} admin_user_id={admin_user_id} code={school_code}")

# 5. Duplicate admin email -> 409
print("\n--- Add School (duplicate admin email) ---")
status, data = req("POST", "/platform/add-school", token=SUPER_TOKEN, body={
    "name": f"Dup School {ts}",
    "email": f"dup{ts}@school.com",
    "admin_name": "Dup Admin",
    "admin_email": admin_email,
    "admin_password": "TestPass123!",
    "plan_id": 1,
})
check("POST duplicate admin_email -> 409", status, 409)

# 6. Generate API key
print("\n--- Generate API Key ---")
status, data = req("POST", "/platform/api-keys/generate", token=SUPER_TOKEN, body={
    "school_id": school_id,
    "description": f"Live test key {ts}",
    "expires_in_days": 30,
})
check("POST /platform/api-keys/generate", status, 200)
api_key = data.get("api_key", "")
key_id = data.get("id", 0)
print(f"  key_id={key_id} api_key={api_key[:25]}...")
assert api_key.startswith("novara_"), f"Key doesn't start with novara_: {api_key}"

# 7. List API keys (verify increment)
print("\n--- List API Keys (after generate) ---")
status, data = req("GET", "/platform/api-keys", token=SUPER_TOKEN)
check("GET /platform/api-keys", status, 200)
print(f"  Total keys: {len(data)} (was {baseline_count})")
assert len(data) >= baseline_count + 1

# 8. Filter by school
print("\n--- List API Keys (by school) ---")
status, data = req("GET", f"/platform/api-keys?school_id={school_id}", token=SUPER_TOKEN)
check(f"GET /platform/api-keys?school_id={school_id}", status, 200)
print(f"  Keys for school {school_id}: {len(data)}")

# 9. Generate key for non-existent school -> 404
print("\n--- Generate API Key (invalid school) ---")
status, data = req("POST", "/platform/api-keys/generate", token=SUPER_TOKEN, body={
    "school_id": 999999,
    "description": "Ghost school",
})
check("POST generate invalid school -> 404", status, 404)

# 10. Revoke API key
print("\n--- Revoke API Key ---")
status, data = req("POST", f"/platform/api-keys/{key_id}/revoke", token=SUPER_TOKEN)
check(f"POST /platform/api-keys/{key_id}/revoke", status, 200)
print(f"  detail={data.get('detail')}")

# 11. Revoke non-existent key -> 404
print("\n--- Revoke API Key (invalid id) ---")
status, data = req("POST", "/platform/api-keys/99999/revoke", token=SUPER_TOKEN)
check("POST revoke invalid id -> 404", status, 404)

# 12. Trigger system check
print("\n--- System Check Trigger ---")
status, data = req("POST", "/platform/system-check/trigger", token=SUPER_TOKEN)
check("POST /platform/system-check/trigger", status, 200)
check_id = data.get("id", 0)
print(f"  check_id={check_id} scheduled={data.get('scheduled_for')} msg={data.get('message','')[:80]}")

# 13. Duplicate system check -> 409
print("\n--- System Check (duplicate) ---")
status, data = req("POST", "/platform/system-check/trigger", token=SUPER_TOKEN)
check("POST duplicate trigger -> 409", status, 409)

# 14. List system checks
print("\n--- List System Checks ---")
status, data = req("GET", "/platform/system-checks", token=SUPER_TOKEN)
check("GET /platform/system-checks", status, 200)
print(f"  Total checks: {len(data)}")
if data:
    first = data[0]
    print(f"  First: id={first.get('id')} status={first.get('status')}")

# 15. List with limit
print("\n--- List System Checks (limit=5) ---")
status, data = req("GET", "/platform/system-checks?limit=5", token=SUPER_TOKEN)
check("GET /platform/system-checks?limit=5", status, 200)
assert len(data) <= 5
print(f"  Count: {len(data)}")

# 16. School admin login
print("\n--- School Admin Login & Access ---")
status, data = req("POST", "/auth/login",
                   body={"email": admin_email, "password": "TestPass123!"})
check("login school admin", status, 200)
ADMIN_TOKEN = data.get("access_token", "")
print(f"  Admin token: {ADMIN_TOKEN[:30]}...")

# 17. Admin overview
status, data = req("GET", "/admin/overview", token=ADMIN_TOKEN)
check("GET /admin/overview (admin)", status, 200)
print(f"  overview keys: {list(data.keys())[:6]}")

# 18. Permission gates: admin cannot access platform endpoints
print("\n--- Permission Gates ---")
status, data = req("GET", "/platform/stats", token=ADMIN_TOKEN)
check("admin GET /platform/stats -> 403", status, 403)

status, data = req("POST", "/platform/api-keys/generate", token=ADMIN_TOKEN,
                   body={"school_id": school_id, "description": "hack"})
check("admin POST /platform/api-keys/generate -> 403", status, 403)

status, data = req("POST", "/platform/system-check/trigger", token=ADMIN_TOKEN)
check("admin POST /platform/system-check/trigger -> 403", status, 403)

# 19. Unauthenticated -> 401
print("\n--- Unauthenticated ---")
status, data = req("GET", "/students/list")
check("GET /students/list (no auth) -> 401", status, 401)

status, data = req("GET", "/admin/overview")
check("GET /admin/overview (no auth) -> 401", status, 401)

status, data = req("GET", "/platform/stats")
check("GET /platform/stats (no auth) -> 401", status, 401)

# === SUMMARY ===
print("\n" + "=" * 60)
print(f"RESULTS: {ok} passed / {fail} failed / {ok + fail} total")
if fail:
    print("SOME TESTS FAILED! See above for details.")
    sys.exit(1)
else:
    print("ALL LIVE TESTS PASSED! System is fully operational.")
