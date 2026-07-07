from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.user import User
from app.schemas.attendance import AttendanceMarkCreate, AttendanceRead, AttendanceUpdate
from app.services import attendance_service

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/mark", response_model=list[AttendanceRead])
def mark_attendance(
    payload: AttendanceMarkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.TEACHER, RoleId.ADMIN)),
):
    return attendance_service.mark_attendance(db, payload, current_user)


@router.get("/student/{student_id}", response_model=list[AttendanceRead])
def view_student_attendance(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.PARENT, RoleId.STUDENT)),
):
    return attendance_service.get_student_attendance(db, student_id, current_user)


@router.get("/class/{class_name}", response_model=list[AttendanceRead])
def view_class_attendance(
    class_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.TEACHER)),
):
    return attendance_service.get_class_attendance(db, class_name, current_user)


@router.put("/{attendance_id}", response_model=AttendanceRead)
def admin_update_attendance(
    attendance_id: int,
    payload: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN)),
):
    return attendance_service.update_attendance(db, attendance_id, payload, current_user)
