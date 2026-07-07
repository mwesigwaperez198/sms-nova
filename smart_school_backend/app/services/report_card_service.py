from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.roles import RoleId
from app.models.report_card import ReportCard
from app.models.user import User
from app.schemas.report_card import ReportCardApprovalUpdate, ReportCardSubmit
from app.services.access_service import ensure_student_access, get_student_in_school
from app.services.audit_service import log_action

VISIBLE_REPORT_STATUSES = ("approved", "published")


def submit_report_card(
    db: Session,
    payload: ReportCardSubmit,
    current_user: User,
) -> ReportCard:
    student = get_student_in_school(db, payload.student_id, current_user.school_id)
    existing = (
        db.query(ReportCard)
        .filter(
            ReportCard.student_id == student.id,
            ReportCard.academic_year == payload.academic_year,
            ReportCard.term == payload.term,
            ReportCard.subject == payload.subject,
        )
        .first()
    )

    if existing and existing.status in VISIBLE_REPORT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Approved or published report cards cannot be overwritten",
        )

    report = existing or ReportCard(
        student_id=student.id,
        school_id=student.school_id,
        academic_year=payload.academic_year,
        term=payload.term,
        subject=payload.subject,
    )
    report.score = payload.score
    report.grade = payload.grade
    report.teacher_id = current_user.id
    report.teacher_remarks = payload.teacher_remarks
    report.status = "submitted"

    if not existing:
        db.add(report)

    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Report card already exists",
        ) from None

    log_action(
        db,
        current_user=current_user,
        action="report_card.submitted",
        entity_type="report_card",
        entity_id=report.id,
        after_data={"student_id": student.id, "subject": report.subject, "score": str(report.score)},
    )
    db.commit()
    db.refresh(report)
    return report


def list_student_report_cards(
    db: Session,
    student_id: int,
    current_user: User,
) -> list[ReportCard]:
    student = ensure_student_access(db, student_id, current_user)
    query = db.query(ReportCard).filter(
        ReportCard.student_id == student.id,
        ReportCard.school_id == student.school_id,
    )
    if current_user.role_id in (RoleId.PARENT, RoleId.STUDENT):
        query = query.filter(ReportCard.status.in_(VISIBLE_REPORT_STATUSES))
    return query.order_by(ReportCard.academic_year.desc(), ReportCard.term.desc()).all()


def approve_report_card(
    db: Session,
    report_card_id: int,
    payload: ReportCardApprovalUpdate,
    current_user: User,
) -> ReportCard:
    report = (
        db.query(ReportCard)
        .filter(ReportCard.id == report_card_id, ReportCard.school_id == current_user.school_id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report card not found")

    report.class_teacher_remarks = payload.class_teacher_remarks
    report.head_teacher_remarks = payload.head_teacher_remarks
    report.status = "approved"
    log_action(
        db,
        current_user=current_user,
        action="report_card.approved",
        entity_type="report_card",
        entity_id=report.id,
    )
    db.commit()
    db.refresh(report)
    return report


def publish_report_card(db: Session, report_card_id: int, current_user: User) -> ReportCard:
    report = (
        db.query(ReportCard)
        .filter(ReportCard.id == report_card_id, ReportCard.school_id == current_user.school_id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report card not found")
    if report.status not in VISIBLE_REPORT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report card must be approved before publishing",
        )

    report.status = "published"
    log_action(
        db,
        current_user=current_user,
        action="report_card.published",
        entity_type="report_card",
        entity_id=report.id,
    )
    db.commit()
    db.refresh(report)
    return report


def get_report_card_for_download(
    db: Session,
    report_card_id: int,
    current_user: User,
) -> ReportCard:
    report = db.get(ReportCard, report_card_id)
    if not report or report.school_id != current_user.school_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report card not found")
    ensure_student_access(db, report.student_id, current_user)
    if current_user.role_id in (RoleId.PARENT, RoleId.STUDENT) and report.status not in VISIBLE_REPORT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Report card is not yet visible",
        )
    return report
