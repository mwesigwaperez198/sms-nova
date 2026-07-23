import hashlib
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func as sa_func, text
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.api_key import ApiKey
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.models.registration import RegistrationKey, RegistrationRequest
from app.models.school import School
from app.models.student import Student
from app.models.subscription import ProductKey, SchoolSubscription, SubscriptionPlan
from app.models.system_check import SystemCheck
from app.models.user import User
from app.schemas.subscription import (
    GenerateKeyRequest,
    GenerateKeyResponse,
    SubscriptionPlanCreate,
    SubscriptionPlanRead,
)
from app.services.audit_service import log_action
from app.services.subscription_service import generate_product_key

router = APIRouter(prefix="/platform", tags=["platform-admin"])


class PlatformStats(BaseModel):
    total_schools: int
    active_schools: int
    total_students: int
    total_users: int
    pending_registrations: int
    active_subscriptions: int
    expired_subscriptions: int
    keys_generated_30d: int


class SchoolAdminRead(BaseModel):
    id: int
    name: str
    school_code: str
    email: str | None
    phone: str | None
    address: str | None
    subscription_status: str
    user_count: int
    student_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SchoolDetail(BaseModel):
    id: int
    name: str
    school_code: str
    email: str | None
    phone: str | None
    address: str | None
    subscription_status: str
    country: str
    admin_name: str | None
    admin_email: str | None
    student_count: int
    user_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class RegistrationRequestRead(BaseModel):
    id: int
    school_name: str
    admin_name: str
    admin_email: str
    admin_phone: str
    plan_id: int | None = None
    payment_method: str
    payment_details: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ToggleSchoolStatusRequest(BaseModel):
    status: str = Field(pattern=r"^(active|suspended|trial)$")


class KeyRead(BaseModel):
    id: int
    school_name: str | None
    plan_name: str | None
    is_used: bool
    used_at: datetime | None
    expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogRead(BaseModel):
    id: int
    action: str
    actor_name: str | None = None
    entity_type: str | None = None
    entity_id: int | None = None
    ip_address: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/stats", response_model=PlatformStats)
def platform_stats(
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> PlatformStats:
    now = datetime.now(timezone.utc)
    return PlatformStats(
        total_schools=db.query(sa_func.count(School.id)).scalar() or 0,
        active_schools=db.query(sa_func.count(School.id)).filter(School.subscription_status == "active").scalar() or 0,
        total_students=db.query(sa_func.count(Student.id)).scalar() or 0,
        total_users=db.query(sa_func.count(User.id)).scalar() or 0,
        pending_registrations=db.query(sa_func.count(RegistrationRequest.id)).filter(RegistrationRequest.status == "pending").scalar() or 0,
        active_subscriptions=db.query(sa_func.count(SchoolSubscription.id)).filter(SchoolSubscription.status == "active").scalar() or 0,
        expired_subscriptions=db.query(sa_func.count(SchoolSubscription.id)).filter(SchoolSubscription.expires_at < now).scalar() or 0,
        keys_generated_30d=db.query(sa_func.count(ProductKey.id)).filter(ProductKey.created_at >= datetime(now.year, now.month - 1 if now.month > 1 else 1, 1, tzinfo=timezone.utc)).scalar() or 0,
    )


@router.get("/schools", response_model=list[SchoolAdminRead])
def list_schools(
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
    search: str = Query("", max_length=100),
    status: str = Query("", pattern=r"^(active|suspended|trial|expired|)$"),
) -> list[SchoolAdminRead]:
    user_counts = dict(
        db.query(User.school_id, sa_func.count(User.id))
        .group_by(User.school_id)
        .all()
    )
    student_counts = dict(
        db.query(Student.school_id, sa_func.count(Student.id))
        .group_by(Student.school_id)
        .all()
    )

    q = db.query(School)
    if search:
        q = q.filter(School.name.ilike(f"%{search}%") | School.email.ilike(f"%{search}%") | School.school_code.ilike(f"%{search}%"))
    if status:
        q = q.filter(School.subscription_status == status)
    q = q.order_by(School.created_at.desc())

    return [
        SchoolAdminRead(
            id=s.id,
            name=s.name,
            school_code=s.school_code,
            email=s.email,
            phone=s.phone,
            address=s.address,
            subscription_status=s.subscription_status,
            user_count=user_counts.get(s.id, 0),
            student_count=student_counts.get(s.id, 0),
            created_at=s.created_at,
        )
        for s in q.all()
    ]


@router.get("/schools/{school_id}", response_model=SchoolDetail)
def get_school(
    school_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> SchoolDetail:
    school = db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    admin = db.query(User).filter(User.school_id == school_id, User.role_id == RoleId.ADMIN).order_by(User.id).first()
    return SchoolDetail(
        id=school.id,
        name=school.name,
        school_code=school.school_code,
        email=school.email,
        phone=school.phone,
        address=school.address,
        subscription_status=school.subscription_status,
        country=school.country,
        admin_name=admin.name if admin else None,
        admin_email=admin.email if admin else None,
        student_count=db.query(sa_func.count(Student.id)).filter(Student.school_id == school_id).scalar() or 0,
        user_count=db.query(sa_func.count(User.id)).filter(User.school_id == school_id).scalar() or 0,
        created_at=school.created_at,
    )


@router.patch("/schools/{school_id}/status", response_model=dict)
def toggle_school_status(
    school_id: int,
    payload: ToggleSchoolStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> dict:
    school = db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    school.subscription_status = payload.status
    db.add(school)
    log_action(db, current_user=current_user, action="school_status_changed", entity_type="school", entity_id=school_id)
    db.commit()
    return {"detail": f"School {school.name} status set to {payload.status}"}


@router.get("/registrations", response_model=list[RegistrationRequestRead])
def list_registrations(
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
    status: str = Query("", pattern=r"^(pending|approved|rejected|)$"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
) -> list[RegistrationRequestRead]:
    q = db.query(RegistrationRequest)
    if status:
        q = q.filter(RegistrationRequest.status == status)
    return q.order_by(RegistrationRequest.created_at.desc()).offset(offset).limit(limit).all()


@router.post("/registrations/{request_id}/approve", response_model=GenerateKeyResponse)
def approve_registration(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> GenerateKeyResponse:
    from app.services.registration_service import generate_registration_key

    req = db.get(RegistrationRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Registration not found")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Registration already processed")

    reg_key = generate_registration_key(db, request_id)
    log_action(db, current_user=current_user, action="registration_approved", entity_type="registration", entity_id=request_id)
    db.commit()

    return GenerateKeyResponse(
        product_key=reg_key.key,
        expires_at=reg_key.created_at,
        message=f"Registration approved. Key sent to {req.admin_email}.",
    )


@router.post("/keys/generate", response_model=GenerateKeyResponse)
def generate_key(
    payload: GenerateKeyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> GenerateKeyResponse:
    raw_key = generate_product_key(db, payload.school_id, payload.plan_id, current_user.id)
    plan = db.get(SubscriptionPlan, payload.plan_id)
    plan_name = plan.name if plan else "Unknown"
    log_action(db, current_user=current_user, action="key_generated", entity_type="school", entity_id=payload.school_id)
    db.commit()
    return GenerateKeyResponse(
        product_key=raw_key,
        expires_at=datetime.now(timezone.utc),
        message=f"Product key generated for {plan_name} plan.",
    )


@router.get("/keys", response_model=list[KeyRead])
def list_keys(
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
    school_id: int | None = Query(None),
    used: bool | None = Query(None),
) -> list[KeyRead]:
    q = db.query(ProductKey).options(joinedload(ProductKey.school), joinedload(ProductKey.plan))
    if school_id:
        q = q.filter(ProductKey.school_id == school_id)
    if used is not None:
        q = q.filter(ProductKey.is_used == used)
    q = q.order_by(ProductKey.created_at.desc()).limit(100)
    results = []
    for k in q.all():
        results.append(KeyRead(
            id=k.id,
            school_name=k.school.name if k.school else None,
            plan_name=k.plan.name if k.plan else None,
            is_used=k.is_used,
            used_at=k.used_at,
            expires_at=k.expires_at,
            created_at=k.created_at,
        ))
    return results


@router.get("/plans", response_model=list[SubscriptionPlanRead])
def list_plans(
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> list[SubscriptionPlanRead]:
    return db.query(SubscriptionPlan).order_by(SubscriptionPlan.price).all()


@router.post("/plans", response_model=SubscriptionPlanRead)
def create_plan(
    payload: SubscriptionPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> SubscriptionPlanRead:
    existing = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Plan name already exists")
    plan = SubscriptionPlan(**payload.model_dump())
    db.add(plan)
    db.flush()
    log_action(db, current_user=current_user, action="plan_created", entity_type="plan", entity_id=plan.id)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/audit-logs", response_model=list[AuditLogRead])
def list_audit_logs(
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
    limit: int = Query(50, le=200),
) -> list[AuditLogRead]:
    logs = (
        db.query(AuditLog)
        .options(joinedload(AuditLog.actor))
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        AuditLogRead(
            id=log.id,
            action=log.action,
            actor_name=log.actor.name if log.actor else None,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        for log in logs
    ]


@router.get("/users", response_model=list[dict])
def list_platform_users(
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> list[dict]:
    users = db.query(User).options(joinedload(User.role), joinedload(User.school)).order_by(User.created_at.desc()).limit(100).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role.name if u.role else None,
            "school": u.school.name if u.school else None,
            "is_active": u.is_active,
            "is_2fa_enabled": u.is_2fa_enabled or False,
            "last_login": u.last_login_at,
            "created_at": u.created_at,
        }
        for u in users
    ]


# ─── API Key Endpoints ──────────────────────────────────────────


class ApiKeyRead(BaseModel):
    id: int
    key_prefix: str
    description: str | None
    is_active: bool
    last_used_at: datetime | None
    expires_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class GenerateApiKeyRequest(BaseModel):
    school_id: int
    description: str | None = None
    expires_in_days: int = 365


class GenerateApiKeyResponse(BaseModel):
    api_key: str
    id: int
    message: str


@router.get("/api-keys", response_model=list[ApiKeyRead])
def list_api_keys(
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
    school_id: int | None = Query(None),
):
    q = db.query(ApiKey)
    if school_id:
        q = q.filter(ApiKey.school_id == school_id)
    return q.order_by(ApiKey.created_at.desc()).limit(100).all()


def _send_api_key_email(recipient: str, api_key: str, school_name: str):
    try:
        from app.services.email_service import send_email

        send_email(
            to=recipient,
            subject=f"Your NOVARA API Key for {school_name}",
            html=f"""
            <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0f172a;color:#f1f5f9;border-radius:12px;">
                <h2 style="color:#667eea;">NOVARA API Key Generated</h2>
                <p>An API key has been generated for <strong>{school_name}</strong>.</p>
                <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:16px;margin:16px 0;font-family:monospace;font-size:1.1rem;text-align:center;color:#4fc3f7;">
                    {api_key}
                </div>
                <p style="color:#94a3b8;font-size:0.85rem;">Use this key to authenticate API requests. Keep it secure and do not share it publicly.</p>
                <p style="color:#94a3b8;font-size:0.85rem;">If you did not request this key, please contact NOVARA support immediately.</p>
            </div>
            """,
        )
    except Exception:
        pass


@router.post("/api-keys/generate", response_model=GenerateApiKeyResponse)
def generate_api_key(
    payload: GenerateApiKeyRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
):
    school = db.get(School, payload.school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    raw_key = f"novara_{secrets.token_hex(24)}"
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    key_prefix = raw_key[:10]

    from datetime import timedelta

    api_key = ApiKey(
        school_id=payload.school_id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        description=payload.description,
        is_active=True,
        expires_at=datetime.now(timezone.utc) + timedelta(days=payload.expires_in_days),
        created_by_id=current_user.id,
    )
    db.add(api_key)
    db.flush()

    admin = db.query(User).filter(User.school_id == payload.school_id, User.role_id == RoleId.ADMIN).order_by(User.id).first()
    if admin:
        background_tasks.add_task(_send_api_key_email, admin.email, raw_key, school.name)

    log_action(db, current_user=current_user, action="api_key_generated", entity_type="school", entity_id=payload.school_id)
    db.commit()

    return GenerateApiKeyResponse(
        api_key=raw_key,
        id=api_key.id,
        message=f"API key generated for {school.name}. Key sent to {admin.email if admin else '—'}.",
    )


@router.post("/api-keys/{key_id}/revoke", response_model=dict)
def revoke_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
):
    api_key = db.get(ApiKey, key_id)
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    api_key.is_active = False
    log_action(db, current_user=current_user, action="api_key_revoked", entity_type="api_key", entity_id=key_id)
    db.commit()
    return {"detail": "API key revoked"}


# ─── System Check Endpoints ────────────────────────────────────


class SystemCheckRead(BaseModel):
    id: int
    triggered_by_name: str | None
    status: str
    scheduled_for: datetime
    started_at: datetime | None
    completed_at: datetime | None
    summary: str | None
    results: dict | None
    error: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TriggerSystemCheckResponse(BaseModel):
    id: int
    scheduled_for: datetime
    message: str


def _execute_system_check(check_id: int):
    """Background task that runs the actual system checks."""
    import time
    from app.db.session import SessionMaker

    db = SessionMaker()
    try:
        check = db.get(SystemCheck, check_id)
        if not check:
            return
        check.status = "running"
        check.started_at = datetime.now(timezone.utc)
        db.commit()

        results = {}
        now = datetime.now(timezone.utc)

        start = time.time()
        try:
            db.execute(text("SELECT 1"))
            results["database"] = {"status": "ok", "latency_ms": int((time.time() - start) * 1000)}
        except Exception as e:
            results["database"] = {"status": "error", "error": str(e)[:200]}

        total_users = db.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0
        active_users = db.execute(text("SELECT COUNT(*) FROM users WHERE is_active = true")).scalar() or 0
        total_schools = db.execute(text("SELECT COUNT(*) FROM schools")).scalar() or 0
        active_schools = db.execute(
            text("SELECT COUNT(*) FROM schools WHERE subscription_status = 'active'")
        ).scalar() or 0
        total_students = db.execute(text("SELECT COUNT(*) FROM students")).scalar() or 0

        expired_subs = db.execute(text("""
            SELECT COUNT(*) FROM school_subscriptions
            WHERE status = 'active' AND expires_at < :now
        """), {"now": now}).scalar() or 0

        locked_users = db.execute(text("""
            SELECT COUNT(*) FROM users
            WHERE locked_until IS NOT NULL AND locked_until > :now
        """), {"now": now}).scalar() or 0

        pending_reg = db.execute(text(
            "SELECT COUNT(*) FROM registration_requests WHERE status = 'pending'"
        )).scalar() or 0

        results["counts"] = {
            "total_users": total_users,
            "active_users": active_users,
            "total_schools": total_schools,
            "active_schools": active_schools,
            "total_students": total_students,
            "expired_subscriptions": expired_subs,
            "locked_accounts": locked_users,
            "pending_registrations": pending_reg,
        }

        issues = []
        if expired_subs > 0:
            issues.append(f"{expired_subs} schools have expired subscriptions")
        if locked_users > 0:
            issues.append(f"{locked_users} user accounts are currently locked")
        if active_schools < total_schools * 0.5 and total_schools > 0:
            issues.append(f"Less than half of schools are active ({active_schools}/{total_schools})")

        check.status = "completed"
        check.completed_at = datetime.now(timezone.utc)
        check.results = results
        check.summary = "System check completed." + (f" {len(issues)} issue(s) found." if issues else " No issues found.")
        db.commit()

    except Exception as e:
        try:
            check = db.get(SystemCheck, check_id)
            if check:
                check.status = "failed"
                check.completed_at = datetime.now(timezone.utc)
                check.error = str(e)[:1000]
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/system-check/trigger", response_model=TriggerSystemCheckResponse)
def trigger_system_check(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
):
    now = datetime.now(timezone.utc)

    existing = db.query(SystemCheck).filter(
        SystemCheck.status.in_(["running", "scheduled"]),
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A system check is already in progress (status: {existing.status})",
        )

    check = SystemCheck(
        triggered_by_id=current_user.id,
        status="scheduled",
        scheduled_for=now,
    )
    db.add(check)
    db.flush()
    check_id = check.id
    db.commit()

    schools = db.query(School).filter(School.subscription_status.in_(["active", "trial"])).all()
    notified = 0
    for school in schools:
        admins = db.query(User).filter(
            User.school_id == school.id,
            User.role_id.in_([RoleId.ADMIN, RoleId.ICT_ADMIN]),
            User.is_active == True,
        ).all()
        for admin in admins:
            try:
                from app.services.email_service import send_email
                send_email(
                    to=admin.email,
                    subject="System Check In Progress",
                    html=f"""
                    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0f172a;color:#f1f5f9;border-radius:12px;">
                        <h2 style="color:#667eea;">System Check In Progress</h2>
                        <p>A system-wide health check is now running. You may experience brief delays.</p>
                        <p style="color:#94a3b8;font-size:0.85rem;">The system will resume normal operation once the check completes.</p>
                    </div>
                    """,
                )
                notified += 1
            except Exception:
                pass

    background_tasks.add_task(_execute_system_check, check_id)

    log_action(db, current_user=current_user, action="system_check_triggered", entity_type="system_check", entity_id=check_id)

    return TriggerSystemCheckResponse(
        id=check_id,
        scheduled_for=now,
        message=f"System check started. {notified} administrators notified.",
    )


@router.get("/system-checks", response_model=list[SystemCheckRead])
def list_system_checks(
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
    limit: int = Query(10, le=50),
):
    checks = db.query(SystemCheck).order_by(SystemCheck.created_at.desc()).limit(limit).all()
    user_cache: dict[int, str] = {}
    results = []
    for c in checks:
        if c.triggered_by_id not in user_cache:
            u = db.get(User, c.triggered_by_id)
            user_cache[c.triggered_by_id] = u.name if u else "Unknown"
        results.append(SystemCheckRead(
            id=c.id,
            triggered_by_name=user_cache[c.triggered_by_id],
            status=c.status,
            scheduled_for=c.scheduled_for,
            started_at=c.started_at,
            completed_at=c.completed_at,
            summary=c.summary,
            results=c.results,
            error=c.error,
            created_at=c.created_at,
        ))
    return results


# ─── Add School (Simple) ───────────────────────────────────────


class AddSchoolRequest(BaseModel):
    name: str
    email: str
    phone: str = ""
    address: str = ""
    country: str = "Uganda"
    timezone: str = "Africa/Kampala"
    admin_name: str
    admin_email: str
    admin_password: str
    plan_id: int


class AddSchoolResponse(BaseModel):
    school_id: int
    school_code: str
    admin_user_id: int
    message: str


@router.post("/add-school", response_model=AddSchoolResponse)
def add_school(
    payload: AddSchoolRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
):
    from app.core.security import hash_password
    from datetime import timedelta

    existing_email = db.query(User).filter(User.email == payload.admin_email.lower()).first()
    if existing_email:
        raise HTTPException(status_code=409, detail="Admin email already in use")

    import string

    code_chars = string.ascii_uppercase + string.digits
    school_code = "SCH" + "".join(secrets.choice(code_chars) for _ in range(6))

    school = School(
        name=payload.name,
        school_code=school_code,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        country=payload.country,
        timezone=payload.timezone,
        subscription_status="trial",
    )
    db.add(school)
    db.flush()

    admin_user = User(
        name=payload.admin_name,
        email=payload.admin_email.lower(),
        phone=payload.phone,
        password_hash=hash_password(payload.admin_password),
        role_id=RoleId.ADMIN,
        school_id=school.id,
        is_active=True,
        is_verified=True,
    )
    db.add(admin_user)
    db.flush()

    plan = db.get(SubscriptionPlan, payload.plan_id)
    plan_days = plan.duration_days if plan else 30
    now = datetime.now(timezone.utc)
    sub = SchoolSubscription(
        school_id=school.id,
        plan_id=payload.plan_id,
        status="trial",
        starts_at=now,
        expires_at=now + timedelta(days=plan_days),
    )
    db.add(sub)

    log_action(db, current_user=current_user, action="school_created", entity_type="school", entity_id=school.id)
    db.commit()

    try:
        from app.services.email_service import send_email

        send_email(
            to=payload.admin_email,
            subject=f"Welcome to NOVARA — {payload.name}",
            html=f"""
            <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0f172a;color:#f1f5f9;border-radius:12px;">
                <h2 style="color:#667eea;">Welcome to NOVARA School Management</h2>
                <p>Your school <strong>{payload.name}</strong> has been registered.</p>
                <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:16px;margin:16px 0;">
                    <p><strong>School Code:</strong> {school_code}</p>
                    <p><strong>Login Email:</strong> {payload.admin_email}</p>
                    <p><strong>Default Password:</strong> {payload.admin_password}</p>
                </div>
                <p style="color:#f59e0b;">Please change your password on first login.</p>
                <p style="color:#94a3b8;font-size:0.85rem;">Access the system at your school dashboard.</p>
            </div>
            """,
        )
    except Exception:
        pass

    return AddSchoolResponse(
        school_id=school.id,
        school_code=school_code,
        admin_user_id=admin_user.id,
        message=f"School {payload.name} created. Admin login sent to {payload.admin_email}",
    )
