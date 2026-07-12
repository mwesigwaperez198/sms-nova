from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_active_subscription, role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.student import Student
from app.models.user import User
from app.schemas.student import (
    GuardianLinkCreate,
    GuardianLinkRead,
    StudentCreate,
    StudentRead,
)
from app.services.student_service import create_student, link_guardian

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/list", response_model=list[StudentRead])
def list_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_subscription),
) -> list[StudentRead]:
    query = db.query(Student).filter(Student.school_id == current_user.school_id)
    return query.order_by(Student.name.asc()).offset(skip).limit(limit).all()


@router.post("/", response_model=StudentRead)
def create_student_record(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.SECRETARY)),
) -> StudentRead:
    return create_student(db, payload, current_user)


@router.post("/{student_id}/guardians", response_model=GuardianLinkRead)
def link_student_guardian(
    student_id: int,
    payload: GuardianLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.SECRETARY)),
) -> GuardianLinkRead:
    return link_guardian(db, student_id, payload, current_user)
