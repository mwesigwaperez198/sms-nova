from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.user import User
from app.schemas.report_remark import ReportRemarkRead, ReportRemarkSubmit
from app.services import report_remark_service

router = APIRouter(prefix="/report-remarks", tags=["report remarks"])


@router.post("/", response_model=ReportRemarkRead)
def upsert_remark(
    payload: ReportRemarkSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.TEACHER, RoleId.ADMIN, RoleId.HEADTEACHER)),
):
    return report_remark_service.upsert_report_remark(db, payload, current_user)


@router.get("/student/{student_id}")
def get_student_remark(
    student_id: int,
    academic_year: str,
    term: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.TEACHER, RoleId.ADMIN, RoleId.HEADTEACHER, RoleId.PARENT, RoleId.STUDENT)),
):
    remark = report_remark_service.get_student_report_remark(
        db, student_id, academic_year, term, current_user.school_id
    )
    if not remark:
        return {"message": "No remarks found"}
    return ReportRemarkRead.model_validate(remark)
