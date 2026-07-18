from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_active_subscription, role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.school import School
from app.models.user import User
from app.schemas.admin import AdminOverviewRead, AnalyticsRead
from app.schemas.audit import AuditLogRead
from app.schemas.user import UserRead
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview", response_model=AdminOverviewRead)
def overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN)),
):
    return admin_service.get_admin_overview(db, current_user.school_id)


@router.get("/teachers", response_model=list[UserRead])
def list_teachers(
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN)),
):
    return (
        db.query(User)
        .filter(User.school_id == current_user.school_id, User.role_id == RoleId.TEACHER)
        .order_by(User.name.asc())
        .all()
    )


@router.get("/analytics", response_model=AnalyticsRead)
def analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN)),
):
    return admin_service.get_analytics(db, current_user.school_id)


@router.get("/audit-logs", response_model=list[AuditLogRead])
def audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN)),
):
    return (
        db.query(AuditLog)
        .filter(AuditLog.school_id == current_user.school_id)
        .order_by(AuditLog.created_at.desc())
        .limit(100)
        .all()
    )


@router.get("/school-settings", dependencies=[Depends(require_active_subscription)])
def get_school_settings(
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    school = db.query(School).filter(School.id == current_user.school_id).first()
    if not school:
        raise HTTPException(404, "School not found")
    return {
        "id": school.id,
        "name": school.name,
        "email": school.email,
        "phone": getattr(school, "phone", ""),
        "address": getattr(school, "address", ""),
    }


@router.patch("/school-settings", dependencies=[Depends(role_required(RoleId.SUPER_ADMIN, RoleId.ADMIN))])
def update_school_settings(
    name: str = None,
    email: str = None,
    phone: str = None,
    address: str = None,
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN, RoleId.ADMIN)),
    db: Session = Depends(get_db),
):
    school = db.query(School).filter(School.id == current_user.school_id).first()
    if not school:
        raise HTTPException(404, "School not found")
    if name is not None:
        school.name = name
    if email is not None:
        school.email = email
    if phone is not None:
        school.phone = phone
    if address is not None:
        school.address = address
    db.commit()
    return {"msg": "updated"}
