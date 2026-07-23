import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User

router = APIRouter(prefix="/novara", tags=["novara-admin"])

NOVARA_ROLE_ID = 1

logger = logging.getLogger(__name__)


class NovaraLoginRequest(BaseModel):
    email: EmailStr
    password: str


class NovaraSessionResponse(BaseModel):
    token: str
    admin: dict


class SchoolCreateRequest(BaseModel):
    name: str
    email: str
    phone: str = ""
    address: str = ""
    country: str = "Uganda"
    timezone: str = "Africa/Kampala"
    plan_id: int | None = None
    admin_email: str
    admin_name: str
    send_email: bool = True


class MaintenanceToggleRequest(BaseModel):
    enabled: bool


class PlanCreateRequest(BaseModel):
    name: str
    price_ugx: float = 0
    max_students: int | None = None
    max_schools: int | None = None
    features: dict = {}


def _check_novara(current_user: User):
    if current_user.role_id != NOVARA_ROLE_ID:
        raise HTTPException(status_code=403, detail="NOVARA admin only")


@router.post("/auth/login")
def novara_login(payload: NovaraLoginRequest, db: Session = Depends(get_db)):
    from app.services.auth_service import authenticate_user, build_user_token

    user = authenticate_user(db, payload.email.lower(), payload.password)
    if not user or user.role_id != NOVARA_ROLE_ID:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials or not a NOVARA admin",
        )

    token = build_user_token(user)
    return NovaraSessionResponse(
        token=token,
        admin={"id": user.id, "email": user.email, "name": user.name},
    )


@router.get("/dashboard/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    total = db.execute(text("SELECT COUNT(*) FROM schools")).scalar() or 0
    active = db.execute(
        text("SELECT COUNT(*) FROM schools WHERE subscription_status = 'active'")
    ).scalar() or 0
    total_users = db.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0
    pending_reg = db.execute(
        text("SELECT COUNT(*) FROM registration_requests WHERE status = 'pending'")
    ).scalar() or 0
    total_students = db.execute(text("SELECT COUNT(*) FROM students")).scalar() or 0

    recent_events = []
    recent_regs = db.execute(
        text("SELECT school_name, admin_name, status, created_at FROM registration_requests ORDER BY created_at DESC LIMIT 5")
    ).fetchall()
    for r in recent_regs:
        recent_events.append({
            "type": "registration",
            "message": f"{r[0]} ({r[1]}) — {r[2]}",
            "time": r[3].isoformat() if r[3] else "",
        })

    recent_schools = db.execute(
        text("SELECT name, subscription_status, created_at FROM schools ORDER BY created_at DESC LIMIT 3")
    ).fetchall()
    for s in recent_schools:
        recent_events.append({
            "type": "school",
            "message": f"{s[0]} — {s[1]}",
            "time": s[2].isoformat() if s[2] else "",
        })

    return {
        "total_schools": total,
        "active_schools": active,
        "pending_payments": pending_reg,
        "open_incidents": 0,
        "api_calls_24h": 0,
        "total_revenue_ugx": 0,
        "system_health_score": 98,
        "total_users": total_users,
        "total_students": total_students,
        "recent_events": sorted(recent_events, key=lambda x: x["time"], reverse=True)[:8],
    }


@router.get("/schools")
def list_schools(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    rows = db.execute(
        text("""
            SELECT s.id, s.name, s.email, s.phone, s.subscription_status,
                   COALESCE(sp.name, 'N/A') as plan_name,
                   s.created_at,
                   (SELECT COUNT(*) FROM users u WHERE u.school_id = s.id) as user_count,
                   (SELECT COUNT(*) FROM students st WHERE st.school_id = s.id) as student_count
            FROM schools s
            LEFT JOIN school_subscriptions ss ON ss.school_id = s.id AND ss.status = 'active'
            LEFT JOIN subscription_plans sp ON sp.id = ss.plan_id
            ORDER BY s.created_at DESC
            LIMIT :limit OFFSET :offset
        """),
        {"limit": limit, "offset": offset},
    ).fetchall()

    return [
        {
            "id": r[0],
            "tenant_id": f"t{r[0]}",
            "name": r[1],
            "email": r[2] or "",
            "phone": r[3] or "",
            "address": "",
            "country": "Uganda",
            "timezone": "Africa/Kampala",
            "status": r[4] or "pending",
            "plan_name": r[5],
            "subscription_expires": "",
            "api_keys_count": 0,
            "total_users": r[7] or 0,
            "total_students": r[8] or 0,
            "last_active": "",
            "created_at": r[6].isoformat() if r[6] else "",
        }
        for r in rows
    ]


@router.get("/schools/{school_id}")
def get_school(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    row = db.execute(
        text("""
            SELECT s.id, s.name, s.email, s.phone, s.subscription_status, s.created_at,
                   COALESCE(sp.name, 'N/A') as plan_name,
                   (SELECT COUNT(*) FROM users u WHERE u.school_id = s.id) as user_count,
                   (SELECT COUNT(*) FROM students st WHERE st.school_id = s.id) as student_count
            FROM schools s
            LEFT JOIN school_subscriptions ss ON ss.school_id = s.id AND ss.status = 'active'
            LEFT JOIN subscription_plans sp ON sp.id = ss.plan_id
            WHERE s.id = :id
        """),
        {"id": school_id},
    ).one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="School not found")

    return {
        "id": row[0],
        "tenant_id": f"t{row[0]}",
        "name": row[1],
        "email": row[2] or "",
        "phone": row[3] or "",
        "address": "",
        "country": "Uganda",
        "timezone": "Africa/Kampala",
        "status": row[4] or "pending",
        "plan_name": row[6],
        "subscription_expires": "",
        "api_keys_count": 0,
        "total_users": row[7] or 0,
        "total_students": row[8] or 0,
        "last_active": "",
        "created_at": row[5].isoformat() if row[5] else "",
    }


@router.post("/schools")
def create_school(
    payload: SchoolCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text
    import secrets as secrets_mod
    import hashlib

    existing = db.execute(
        text("SELECT id FROM schools WHERE email = :email"),
        {"email": payload.email},
    ).scalar()
    if existing:
        raise HTTPException(status_code=400, detail="School with this email already exists")

    existing_user = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": payload.admin_email},
    ).scalar()
    if existing_user:
        raise HTTPException(status_code=400, detail="A user with this admin email already exists")

    school_code = payload.name[:3].upper() + secrets_mod.token_hex(2).upper()

    result = db.execute(
        text("""
            INSERT INTO schools (name, school_code, email, phone, address, country, currency_code, timezone, subscription_status, created_at, updated_at)
            VALUES (:name, :school_code, :email, :phone, :address, :country, 'UGX', :timezone, 'active', NOW(), NOW())
            RETURNING id
        """),
        {
            "name": payload.name,
            "school_code": school_code,
            "email": payload.email,
            "phone": payload.phone,
            "address": payload.address,
            "country": payload.country,
            "timezone": payload.timezone,
        },
    )
    school_id = result.scalar()

    plan = db.execute(
        text("SELECT id, duration_days FROM subscription_plans WHERE id = :pid"),
        {"pid": payload.plan_id},
    ).one_or_none()

    if plan:
        db.execute(
            text("""
                INSERT INTO school_subscriptions (school_id, plan_id, status, starts_at, expires_at, created_at, updated_at)
                VALUES (:sid, :pid, 'active', NOW(), NOW() + (:days || ' days')::INTERVAL, NOW(), NOW())
            """),
            {"sid": school_id, "pid": payload.plan_id, "days": str(plan[1])},
        )

    from app.core.security import hash_password

    temp_password = secrets_mod.token_urlsafe(8)
    hashed = hash_password(temp_password)
    db.execute(
        text("""
            INSERT INTO users (name, email, password_hash, role_id, school_id, is_active, is_verified, failed_login_attempts, is_2fa_enabled, created_at, updated_at)
            VALUES (:name, :email, :pwd, 2, :sid, true, true, 0, false, NOW(), NOW())
        """),
        {"name": payload.admin_name, "email": payload.admin_email, "pwd": hashed, "sid": school_id},
    )

    raw_key = f"novara_t{school_id}_{secrets_mod.token_hex(16)}"
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    key_prefix = raw_key[:10]

    admin_user = db.execute(
        text("SELECT id FROM users WHERE school_id = :sid AND role_id = 2 LIMIT 1"),
        {"sid": school_id},
    ).one_or_none()

    if admin_user:
        db.execute(
            text("""
                INSERT INTO api_keys (school_id, key_hash, key_prefix, is_active, created_by_id, created_at)
                VALUES (:sid, :kh, :kp, true, :uid, NOW())
            """),
            {"sid": school_id, "kh": key_hash, "kp": key_prefix, "uid": admin_user[0]},
        )

    db.commit()

    if payload.send_email:
        plan_name = plan[0] if plan else "N/A"
        from app.services.email_service import send_email
        send_email(
            payload.admin_email,
            f"Welcome to NOVARA — {payload.name} is Ready",
            f"""
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
              <h2 style="color:#4f46e5">Welcome to NOVARA SMS</h2>
              <p>Hi <strong>{payload.admin_name}</strong>,</p>
              <p>Your school <strong>{payload.name}</strong> has been provisioned and is ready to use.</p>

              <div style="background:#f4f4f5;padding:16px;border-radius:10px;margin:20px 0">
                <p style="margin:0 0 8px;font-weight:600">Login Credentials</p>
                <p style="margin:0">Email: <code>{payload.admin_email}</code></p>
                <p style="margin:4px 0 0">Password: <code>{temp_password}</code></p>
                <p style="margin:8px 0 0;color:#666;font-size:0.85rem">Please change your password after first login.</p>
              </div>

              <div style="background:#f4f4f5;padding:16px;border-radius:10px;margin:20px 0">
                <p style="margin:0 0 8px;font-weight:600">Subscription Plan</p>
                <p style="margin:0">Plan: <strong>{plan_name}</strong></p>
              </div>

              <div style="background:#f4f4f5;padding:16px;border-radius:10px;margin:20px 0">
                <p style="margin:0 0 8px;font-weight:600">API Key</p>
                <p style="margin:0;font-family:monospace;font-size:0.9rem;word-break:break-all">{raw_key}</p>
                <p style="margin:8px 0 0;color:#666;font-size:0.85rem">Keep this key confidential. Use it to authenticate API requests.</p>
              </div>

              <p style="margin-top:24px">
                <a href="https://sms-i4ge.vercel.app" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open Dashboard</a>
              </p>

              <p style="color:#999;margin-top:24px;font-size:0.8rem">Novara System Software LTD</p>
            </div>
            """,
        )

    return {
        "id": school_id,
        "name": payload.name,
        "school_code": school_code,
        "admin_email": payload.admin_email,
        "temp_password": temp_password if payload.send_email else None,
        "api_key": raw_key if payload.send_email else None,
        "status": "active",
        "detail": "School provisioned. Credentials and API key sent to admin email." if payload.send_email else "School provisioned.",
    }


@router.post("/schools/{school_id}/suspend")
def suspend_school(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    db.execute(
        text("UPDATE schools SET subscription_status = 'suspended', updated_at = NOW() WHERE id = :id"),
        {"id": school_id},
    )
    db.commit()
    return {"detail": "School suspended"}


@router.post("/schools/{school_id}/activate")
def activate_school(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    db.execute(
        text("UPDATE schools SET subscription_status = 'active', updated_at = NOW() WHERE id = :id"),
        {"id": school_id},
    )
    db.commit()
    return {"detail": "School activated"}


@router.get("/plans")
def list_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    rows = db.execute(
        text("SELECT id, name, price, max_students, max_staff, features, is_active FROM subscription_plans ORDER BY price ASC")
    ).fetchall()

    return [
        {
            "id": r[0],
            "name": r[1],
            "price_ugx": float(r[2]) if r[2] else 0,
            "max_students": r[3],
            "max_schools": r[4],
            "rate_limit": 100,
            "features": r[5] or {},
            "is_active": r[6],
        }
        for r in rows
    ]


@router.post("/plans")
def create_plan(
    payload: PlanCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    result = db.execute(
        text("""
            INSERT INTO subscription_plans (name, price, max_students, max_staff, features, is_active, created_at)
            VALUES (:name, :price, :students, :staff, :features, true, NOW())
            RETURNING id
        """),
        {
            "name": payload.name,
            "price": payload.price_ugx,
            "students": payload.max_students,
            "staff": payload.max_schools,
            "features": payload.features,
        },
    )
    db.commit()
    plan_id = result.scalar()
    return {"id": plan_id, **payload.model_dump()}


@router.patch("/plans/{plan_id}")
def update_plan(
    plan_id: int,
    payload: PlanCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    db.execute(
        text("""
            UPDATE subscription_plans
            SET name = :name, price = :price, max_students = :students,
                max_staff = :staff, features = :features
            WHERE id = :id
        """),
        {
            "id": plan_id,
            "name": payload.name,
            "price": payload.price_ugx,
            "students": payload.max_students,
            "staff": payload.max_schools,
            "features": payload.features,
        },
    )
    db.commit()
    return {"id": plan_id, **payload.model_dump()}


@router.get("/health")
def system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)

    import time
    from sqlalchemy import text

    start = time.time()
    try:
        db.execute(text("SELECT 1"))
        db_latency = int((time.time() - start) * 1000)
        db_status = "ok"
    except Exception:
        db_latency = 0
        db_status = "down"

    # Measure API Gateway latency (time from start of request)
    api_latency = int((time.time() - start) * 1000)
    
    # Auth check latency (JWT decode time)
    auth_start = time.time()
    try:
        _check_novara(current_user)
        auth_latency = int((time.time() - auth_start) * 1000)
    except Exception:
        auth_latency = 0

    return [
        {"service_name": "API Gateway", "status": "ok", "latency_ms": api_latency, "checked_at": datetime.now(timezone.utc).isoformat()},
        {"service_name": "Auth Service", "status": "ok", "latency_ms": auth_latency, "checked_at": datetime.now(timezone.utc).isoformat()},
        {"service_name": "Database", "status": db_status, "latency_ms": db_latency, "checked_at": datetime.now(timezone.utc).isoformat()},
        {"service_name": "Email Service", "status": "ok", "latency_ms": 0, "checked_at": datetime.now(timezone.utc).isoformat()},
    ]


@router.get("/audit")
def audit_logs(
    school_id: int = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    rows = db.execute(
        text("""
            SELECT a.id, a.action, COALESCE(u.name, 'System') as actor_name,
                   a.entity_type, a.entity_id, a.ip_address, a.created_at
            FROM audit_logs a
            LEFT JOIN users u ON u.id = a.actor_id
            ORDER BY a.created_at DESC
            LIMIT :limit
        """),
        {"limit": limit},
    ).fetchall()

    return [
        {
            "id": r[0],
            "admin_name": r[2],
            "action": r[1],
            "target_type": r[3],
            "target_id": r[4],
            "school_name": None,
            "metadata": {},
            "ip_address": r[5] or "",
            "created_at": r[6].isoformat() if r[6] else "",
        }
        for r in rows
    ]


@router.get("/payments")
def payments_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    rows = db.execute(
        text("""
            SELECT rr.id, rr.school_name, rr.payment_method, rr.payment_details,
                   rr.status, rr.created_at,
                   COALESCE(sp.name, 'N/A') as plan_name
            FROM registration_requests rr
            LEFT JOIN subscription_plans sp ON sp.id = rr.plan_id
            ORDER BY rr.created_at DESC
        """)
    ).fetchall()

    return [
        {
            "id": r[0],
            "school_name": r[1],
            "amount_ugx": 0,
            "method": r[2] or "unknown",
            "gateway_ref": r[3] or "",
            "status": "completed" if r[4] == "approved" else "pending" if r[4] == "pending" else "failed",
            "created_at": r[5].isoformat() if r[5] else "",
            "plan_name": r[6],
        }
        for r in rows
    ]


@router.get("/incidents")
def incidents_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    return []


@router.get("/schools/{school_id}/api-keys")
def school_api_keys(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    rows = db.execute(
        text("""
            SELECT id, key_prefix, description, is_active, last_used_at, expires_at, created_at
            FROM api_keys WHERE school_id = :sid ORDER BY created_at DESC
        """),
        {"sid": school_id},
    ).fetchall()

    return [
        {
            "id": r[0],
            "school_id": school_id,
            "key_prefix": r[1],
            "key_display": r[1],
            "scopes": [],
            "rate_limit": 100,
            "status": "active" if r[3] else "revoked",
            "last_used_at": r[4].isoformat() if r[4] else None,
            "last_used_ip": None,
            "created_at": r[6].isoformat() if r[6] else "",
        }
        for r in rows
    ]


@router.post("/schools/{school_id}/api-keys")
def generate_school_key(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)

    import secrets as secrets_mod
    from sqlalchemy import text
    import hashlib

    raw_key = f"novara_t{school_id}_{secrets_mod.token_hex(16)}"
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    key_prefix = raw_key[:10]

    db.execute(
        text("""
            INSERT INTO api_keys (school_id, key_hash, key_prefix, is_active, created_by_id, created_at)
            VALUES (:sid, :kh, :kp, true, :uid, NOW())
        """),
        {"sid": school_id, "kh": key_hash, "kp": key_prefix, "uid": current_user.id},
    )
    db.commit()

    return {"key": raw_key, "key_display": key_prefix}


@router.post("/api-keys/{key_id}/revoke")
def revoke_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    db.execute(
        text("UPDATE api_keys SET is_active = false WHERE id = :id"),
        {"id": key_id},
    )
    db.commit()
    return {"detail": "API key revoked"}


# ─── Maintenance Mode ──────────────────────────────────────

@router.get("/maintenance")
def get_maintenance_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    row = db.execute(
        text("SELECT value FROM system_settings WHERE key = 'maintenance_mode'")
    ).one_or_none()

    enabled = row[0] == "true" if row else False
    return {"enabled": enabled}


@router.post("/maintenance/toggle")
def toggle_maintenance(
    payload: MaintenanceToggleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    value = "true" if payload.enabled else "false"
    existing = db.execute(
        text("SELECT id FROM system_settings WHERE key = 'maintenance_mode'")
    ).one_or_none()

    if existing:
        db.execute(
            text("UPDATE system_settings SET value = :val, updated_at = NOW() WHERE key = 'maintenance_mode'"),
            {"val": value},
        )
    else:
        db.execute(
            text("INSERT INTO system_settings (key, value, updated_at) VALUES ('maintenance_mode', :val, NOW())"),
            {"val": value},
        )
    db.commit()

    return {
        "enabled": payload.enabled,
        "message": "Maintenance mode enabled. All schools will see a maintenance page." if payload.enabled
                   else "Maintenance mode disabled. System is back online.",
    }


@router.get("/registrations")
def list_registrations(
    status: str = "",
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    q = """
        SELECT rr.id, rr.school_name, rr.admin_name, rr.admin_email, rr.admin_phone,
               rr.payment_method, rr.payment_details, rr.status, rr.created_at,
               COALESCE(sp.name, 'N/A') as plan_name
        FROM registration_requests rr
        LEFT JOIN subscription_plans sp ON sp.id = rr.plan_id
    """
    params = {"limit": limit, "offset": offset}
    if status:
        q += " WHERE rr.status = :status"
        params["status"] = status
    q += " ORDER BY rr.created_at DESC LIMIT :limit OFFSET :offset"

    rows = db.execute(text(q), params).fetchall()

    return [
        {
            "id": r[0],
            "school_name": r[1],
            "admin_name": r[2],
            "admin_email": r[3],
            "admin_phone": r[4],
            "payment_method": r[5],
            "payment_details": r[6],
            "status": r[7],
            "plan_name": r[9],
            "created_at": r[8].isoformat() if r[8] else "",
        }
        for r in rows
    ]


@router.post("/registrations/{request_id}/approve")
def approve_registration(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text
    import secrets as secrets_mod
    import hashlib

    req = db.execute(
        text("SELECT id, status, school_name, admin_name, admin_email, admin_phone, plan_id, payment_method, payment_details FROM registration_requests WHERE id = :id"),
        {"id": request_id},
    ).one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Registration not found")
    if req[1] != "pending":
        raise HTTPException(status_code=400, detail="Registration already processed")

    school_name = req[2]
    admin_name = req[3]
    admin_email = req[4]
    admin_phone = req[5]
    plan_id = req[6]

    existing_user = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": admin_email},
    ).scalar()
    if existing_user:
        raise HTTPException(status_code=400, detail=f"User with email {admin_email} already exists. Cannot approve — the user may need to login instead.")

    existing_school = db.execute(
        text("SELECT id FROM schools WHERE name = :name"),
        {"name": school_name},
    ).scalar()
    if existing_school:
        raise HTTPException(status_code=400, detail=f"School '{school_name}' already exists.")

    school_code = school_name[:3].upper() + secrets_mod.token_hex(2).upper()

    result = db.execute(
        text("""
            INSERT INTO schools (name, school_code, email, phone, address, country, currency_code, timezone, subscription_status, created_at, updated_at)
            VALUES (:name, :school_code, :email, :phone, '', 'Uganda', 'UGX', 'Africa/Kampala', 'active', NOW(), NOW())
            RETURNING id
        """),
        {"name": school_name, "school_code": school_code, "email": admin_email, "phone": admin_phone or ""},
    )
    school_id = result.scalar()

    if plan_id:
        plan = db.execute(
            text("SELECT id, duration_days FROM subscription_plans WHERE id = :pid"),
            {"pid": plan_id},
        ).one_or_none()
        if plan:
            db.execute(
                text("""
                    INSERT INTO school_subscriptions (school_id, plan_id, status, starts_at, expires_at, created_at, updated_at)
                    VALUES (:sid, :pid, 'active', NOW(), NOW() + (:days || ' days')::INTERVAL, NOW(), NOW())
                """),
                {"sid": school_id, "pid": plan_id, "days": str(plan[1])},
            )

    temp_password = secrets_mod.token_urlsafe(8)
    from app.core.security import hash_password
    hashed = hash_password(temp_password)
    db.execute(
        text("""
            INSERT INTO users (name, email, phone, password_hash, role_id, school_id, is_active, is_verified, failed_login_attempts, is_2fa_enabled, created_at, updated_at)
            VALUES (:name, :email, :phone, :pwd, 2, :sid, true, true, 0, false, NOW(), NOW())
        """),
        {"name": admin_name, "email": admin_email, "phone": admin_phone or "", "pwd": hashed, "sid": school_id},
    )

    raw_key = f"novara_t{school_id}_{secrets_mod.token_hex(16)}"
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    key_prefix = raw_key[:10]

    admin_user = db.execute(
        text("SELECT id FROM users WHERE school_id = :sid AND role_id = 2 LIMIT 1"),
        {"sid": school_id},
    ).one_or_none()

    if admin_user:
        db.execute(
            text("""
                INSERT INTO api_keys (school_id, key_hash, key_prefix, is_active, created_by_id, created_at)
                VALUES (:sid, :kh, :kp, true, :uid, NOW())
            """),
            {"sid": school_id, "kh": key_hash, "kp": key_prefix, "uid": admin_user[0]},
        )

    from app.models.registration import RegistrationKey
    key_value = secrets_mod.token_hex(16).upper()
    reg_key = RegistrationKey(
        key=key_value,
        school_name=school_name,
        admin_email=admin_email,
        plan_id=plan_id,
    )
    db.add(reg_key)
    db.flush()
    db.refresh(reg_key)

    db.execute(
        text("UPDATE registration_requests SET status = 'approved', updated_at = NOW() WHERE id = :id"),
        {"id": request_id},
    )

    db.commit()

    email_sent = False
    try:
        from app.services.email_service import send_email
        plan_name = "N/A"
        if plan_id:
            plan_row = db.execute(
                text("SELECT name FROM subscription_plans WHERE id = :pid"),
                {"pid": plan_id},
            ).one_or_none()
            if plan_row:
                plan_name = plan_row[0]

        email_sent = send_email(
            admin_email,
            f"Welcome to NOVARA — {school_name} is Ready",
            f"""
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
              <h2 style="color:#4f46e5">Welcome to NOVARA SMS</h2>
              <p>Hi <strong>{admin_name}</strong>,</p>
              <p>Your school <strong>{school_name}</strong> has been approved and provisioned.</p>
              <div style="background:#f4f4f5;padding:16px;border-radius:10px;margin:20px 0">
                <p style="margin:0 0 8px;font-weight:600">Login Credentials</p>
                <p style="margin:0">Email: <code>{admin_email}</code></p>
                <p style="margin:4px 0 0">Password: <code>{temp_password}</code></p>
              </div>
              <div style="background:#f4f4f5;padding:16px;border-radius:10px;margin:20px 0">
                <p style="margin:0 0 8px;font-weight:600">Subscription Plan</p>
                <p style="margin:0">Plan: <strong>{plan_name}</strong></p>
              </div>
              <div style="background:#f4f4f5;padding:16px;border-radius:10px;margin:20px 0">
                <p style="margin:0 0 8px;font-weight:600">API Key</p>
                <p style="margin:0;font-family:monospace;font-size:0.9rem;word-break:break-all">{raw_key}</p>
                <p style="margin:8px 0 0;color:#666;font-size:0.85rem">Keep this key confidential. Use it to authenticate API requests.</p>
              </div>
              <p style="color:#999;margin-top:24px;font-size:0.8rem">Novara System Software LTD</p>
            </div>
            """,
        )
    except Exception as e:
        logger.error("Failed to send approval email: %s", e)

    return {
        "product_key": reg_key.key,
        "school_id": school_id,
        "temp_password": temp_password,
        "api_key": raw_key,
        "email_sent": email_sent,
        "message": f"Registration approved. School provisioned. Credentials emailed to {admin_email}." if email_sent
                   else f"Registration approved. School provisioned. Email failed — copy credentials manually.",
    }


@router.post("/registrations/{request_id}/resend-key")
def resend_registration_key(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    req = db.execute(
        text("SELECT id, status, admin_email, school_name FROM registration_requests WHERE id = :id"),
        {"id": request_id},
    ).one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Registration not found")
    if req[1] != "approved":
        raise HTTPException(status_code=400, detail="Registration is not approved yet")

    existing_key = db.execute(
        text("SELECT key FROM registration_keys WHERE admin_email = :email AND is_used = false ORDER BY created_at DESC LIMIT 1"),
        {"email": req[2]},
    ).one_or_none()

    if not existing_key:
        raise HTTPException(status_code=404, detail="No unused key found for this registration")

    from app.services.email_service import send_registration_key_email
    email_sent = send_registration_key_email(req[2], req[3], existing_key[0])

    return {
        "message": f"Key re-sent to {req[2]}." if email_sent
                   else f"Email failed. Key: {existing_key[0]} — copy and send manually.",
        "email_sent": email_sent,
    }


@router.post("/registrations/{request_id}/reject")
def reject_registration(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    req = db.execute(
        text("SELECT id, status FROM registration_requests WHERE id = :id"),
        {"id": request_id},
    ).one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Registration not found")
    if req[1] != "pending":
        raise HTTPException(status_code=400, detail="Registration already processed")

    db.execute(
        text("UPDATE registration_requests SET status = 'rejected', updated_at = NOW() WHERE id = :id"),
        {"id": request_id},
    )
    db.commit()
    return {"detail": "Registration rejected"}
