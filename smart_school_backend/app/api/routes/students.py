from fastapi import APIRouter, Depends, HTTPException, Query
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


@router.get("/{student_id}", dependencies=[Depends(role_required(RoleId.SUPER_ADMIN, RoleId.ADMIN, RoleId.HEADTEACHER))])
def get_student(student_id: int, db: Session = Depends(get_db)):
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(404, "Student not found")
    return {
        "id": s.id,
        "name": s.name,
        "admission_number": s.admission_number,
        "class_name": s.class_name,
        "user_id": s.user_id,
    }


@router.patch("/{student_id}", dependencies=[Depends(role_required(RoleId.SUPER_ADMIN, RoleId.ADMIN, RoleId.TEACHER, RoleId.HEADTEACHER))])
def update_student(student_id: int, name: str = None, class_name: str = None, db: Session = Depends(get_db)):
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(404, "Student not found")
    if name is not None:
        s.name = name
    if class_name is not None:
        s.class_name = class_name
    db.commit()
    return {"msg": "updated"}


@router.delete("/{student_id}", dependencies=[Depends(role_required(RoleId.SUPER_ADMIN, RoleId.ADMIN))])
def delete_student(student_id: int, db: Session = Depends(get_db)):
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(404, "Student not found")
    s.class_name = f"DELETED-{s.class_name}"
    db.commit()
    return {"msg": "deactivated"}


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
