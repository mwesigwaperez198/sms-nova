from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.report_remark import ReportRemark
from app.models.user import User
from app.schemas.report_remark import ReportRemarkSubmit
from app.services.access_service import get_student_in_school
from app.services.audit_service import log_action


def upsert_report_remark(
    db: Session,
    payload: ReportRemarkSubmit,
    current_user: User,
) -> ReportRemark:
    student = get_student_in_school(db, payload.student_id, current_user.school_id)

    existing = (
        db.query(ReportRemark)
        .filter(
            ReportRemark.student_id == student.id,
            ReportRemark.academic_year == payload.academic_year,
            ReportRemark.term == payload.term,
        )
        .first()
    )

    if existing:
        existing.conduct = payload.conduct
        existing.effort = payload.effort
        existing.participation = payload.participation
        existing.general_remarks = payload.general_remarks
        existing.teacher_id = current_user.id
        remark = existing
    else:
        remark = ReportRemark(
            student_id=student.id,
            school_id=student.school_id,
            academic_year=payload.academic_year,
            term=payload.term,
            conduct=payload.conduct,
            effort=payload.effort,
            participation=payload.participation,
            general_remarks=payload.general_remarks,
            teacher_id=current_user.id,
        )
        db.add(remark)

    log_action(
        db,
        current_user=current_user,
        action="report_remark.upserted",
        entity_type="report_remark",
        entity_id=remark.id if remark.id else 0,
        after_data={
            "student_id": student.id,
            "conduct": payload.conduct,
            "effort": payload.effort,
        },
    )
    db.commit()
    db.refresh(remark)
    return remark


def get_student_report_remark(
    db: Session,
    student_id: int,
    academic_year: str,
    term: str,
    school_id: int,
) -> ReportRemark | None:
    return (
        db.query(ReportRemark)
        .filter(
            ReportRemark.student_id == student_id,
            ReportRemark.school_id == school_id,
            ReportRemark.academic_year == academic_year,
            ReportRemark.term == term,
        )
        .first()
    )
