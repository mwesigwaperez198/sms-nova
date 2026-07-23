from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.user import User

router = APIRouter(prefix="/headteacher", tags=["headteacher"])

_HT_OR_ADMIN = (RoleId.HEADTEACHER, RoleId.ADMIN)
_STAFF_ROLES = (RoleId.ADMIN, RoleId.TEACHER, RoleId.BURSAR, RoleId.SECRETARY, RoleId.LIBRARIAN, RoleId.ICT_ADMIN, RoleId.HEADTEACHER)


# ── Staff list ────────────────────────────────────────────────────────────────

class StaffRead(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None
    role_id: int
    role_name: str
    is_active: bool

    model_config = {"from_attributes": True}


@router.get("/staff", response_model=list[StaffRead])
def list_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*_HT_OR_ADMIN)),
    search: str = Query("", max_length=100),
):
    """All teaching & support staff in the school."""
    staff_roles = (
        RoleId.TEACHER, RoleId.BURSAR, RoleId.SECRETARY,
        RoleId.LIBRARIAN, RoleId.ICT_ADMIN, RoleId.HEADTEACHER,
    )
    q = (
        db.query(User)
        .filter(User.school_id == current_user.school_id, User.role_id.in_(staff_roles))
    )
    if search:
        q = q.filter(User.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
    users = q.order_by(User.name).all()

    from app.models.role import Role
    role_map = {r.id: r.name for r in db.query(Role).all()}

    return [
        StaffRead(
            id=u.id,
            name=u.name,
            email=u.email,
            phone=u.phone,
            role_id=u.role_id,
            role_name=role_map.get(u.role_id, "unknown"),
            is_active=u.is_active,
        )
        for u in users
    ]


# ── Toggle staff active status ────────────────────────────────────────────────

@router.patch("/staff/{user_id}/toggle-active", response_model=dict)
def toggle_staff_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*_HT_OR_ADMIN)),
):
    user = db.get(User, user_id)
    if not user or user.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Staff member not found")
    if user.role_id in (RoleId.SUPER_ADMIN, RoleId.ADMIN):
        raise HTTPException(status_code=403, detail="Cannot deactivate admin accounts")
    user.is_active = not user.is_active
    db.commit()
    return {"detail": f"{'Activated' if user.is_active else 'Deactivated'} {user.name}", "is_active": user.is_active}


# ── School-wide attendance summary ───────────────────────────────────────────

class AttendanceSummary(BaseModel):
    date: date
    total_students: int
    present: int
    absent: int
    late: int
    attendance_rate: float


@router.get("/attendance/summary", response_model=AttendanceSummary)
def attendance_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*_HT_OR_ADMIN)),
    for_date: date = Query(default=None),
):
    """School-wide attendance summary for a given date (defaults to today)."""
    target = for_date or date.today()
    total = db.query(sa_func.count(Student.id)).filter(Student.school_id == current_user.school_id).scalar() or 0

    records = (
        db.query(Attendance)
        .join(Student, Attendance.student_id == Student.id)
        .filter(
            Student.school_id == current_user.school_id,
            Attendance.attendance_date == target,
        )
        .all()
    )
    present = sum(1 for r in records if r.status == "present")
    absent = sum(1 for r in records if r.status == "absent")
    late = sum(1 for r in records if r.status == "late")
    rate = round((present / total * 100), 1) if total else 0.0

    return AttendanceSummary(
        date=target,
        total_students=total,
        present=present,
        absent=absent,
        late=late,
        attendance_rate=rate,
    )


# ── Performance overview (assessment averages per class) ─────────────────────

class ClassPerformance(BaseModel):
    class_name: str
    student_count: int
    average_score: float | None


@router.get("/performance", response_model=list[ClassPerformance])
def class_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*_HT_OR_ADMIN)),
):
    """Average assessment scores grouped by class for the school."""
    from app.models.assessment import Assessment

    rows = (
        db.query(
            Student.class_name,
            sa_func.count(Student.id.distinct()).label("student_count"),
            sa_func.avg(Assessment.score).label("avg_score"),
        )
        .outerjoin(Assessment, Assessment.student_id == Student.id)
        .filter(Student.school_id == current_user.school_id)
        .group_by(Student.class_name)
        .order_by(Student.class_name)
        .all()
    )
    return [
        ClassPerformance(
            class_name=row.class_name or "Unassigned",
            student_count=row.student_count,
            average_score=round(float(row.avg_score), 1) if row.avg_score is not None else None,
        )
        for row in rows
    ]


# ── Leave requests ────────────────────────────────────────────────────────────

class LeaveRequest(BaseModel):
    id: int
    staff_name: str
    staff_role: str
    reason: str
    start_date: date
    end_date: date
    status: str

    model_config = {"from_attributes": True}


class LeaveCreate(BaseModel):
    reason: str
    start_date: date
    end_date: date


class LeaveDecision(BaseModel):
    decision: str  # "approved" | "rejected"


@router.post("/leave/apply", response_model=dict)
def apply_leave(
    payload: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*_STAFF_ROLES)),
):
    """Any staff member submits a leave request."""
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="end_date must be on or after start_date")
    from app.models.leave import LeaveRequest as LeaveModel
    leave = LeaveModel(
        school_id=current_user.school_id,
        user_id=current_user.id,
        reason=payload.reason,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status="pending",
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return {"detail": "Leave request submitted", "id": leave.id}


@router.get("/leave/requests", response_model=list[LeaveRequest])
def list_leave_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*_HT_OR_ADMIN)),
    status_filter: str = Query("", alias="status"),
):
    """Headteacher/Admin views all leave requests for the school."""
    from app.models.leave import LeaveRequest as LeaveModel
    from app.models.role import Role

    q = db.query(LeaveModel).filter(LeaveModel.school_id == current_user.school_id)
    if status_filter:
        q = q.filter(LeaveModel.status == status_filter)
    leaves = q.order_by(LeaveModel.start_date.desc()).all()

    role_map = {r.id: r.name for r in db.query(Role).all()}
    user_ids = list({lv.user_id for lv in leaves})
    users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
    user_map = {u.id: u for u in users}
    result = []
    for lv in leaves:
        staff = user_map.get(lv.user_id)
        result.append(LeaveRequest(
            id=lv.id,
            staff_name=staff.name if staff else "Unknown",
            staff_role=role_map.get(staff.role_id, "unknown") if staff else "unknown",
            reason=lv.reason,
            start_date=lv.start_date,
            end_date=lv.end_date,
            status=lv.status,
        ))
    return result


@router.patch("/leave/{leave_id}/decide", response_model=dict)
def decide_leave(
    leave_id: int,
    payload: LeaveDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*_HT_OR_ADMIN)),
):
    """Approve or reject a leave request."""
    if payload.decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="decision must be 'approved' or 'rejected'")
    from app.models.leave import LeaveRequest as LeaveModel
    leave = db.get(LeaveModel, leave_id)
    if not leave or leave.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if leave.status != "pending":
        raise HTTPException(status_code=400, detail="Leave request already processed")
    leave.status = payload.decision
    leave.decided_by_id = current_user.id
    db.commit()
    return {"detail": f"Leave request {payload.decision}", "id": leave_id}
