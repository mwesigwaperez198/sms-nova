from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.user import User
from app.schemas.report_card import (
    ReportCardApprovalUpdate,
    ReportCardDownloadRead,
    ReportCardRead,
    ReportCardSubmit,
)
from app.services import report_card_service

router = APIRouter(prefix="/report-cards", tags=["report cards"])


@router.post("/submit", response_model=ReportCardRead)
def submit_report_card(
    payload: ReportCardSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.TEACHER, RoleId.ADMIN)),
):
    return report_card_service.submit_report_card(db, payload, current_user)


@router.get("/student/{student_id}", response_model=list[ReportCardRead])
def get_student_report_cards(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.PARENT, RoleId.STUDENT, RoleId.HEADTEACHER)),
):
    return report_card_service.list_student_report_cards(db, student_id, current_user)


@router.post("/{report_card_id}/approve", response_model=ReportCardRead)
def approve_report_card(
    report_card_id: int,
    payload: ReportCardApprovalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.HEADTEACHER)),
):
    return report_card_service.approve_report_card(db, report_card_id, payload, current_user)


@router.post("/{report_card_id}/publish", response_model=ReportCardRead)
def publish_report_card(
    report_card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.HEADTEACHER)),
):
    return report_card_service.publish_report_card(db, report_card_id, current_user)


@router.get("/download/{report_card_id}")
def download_report_card(
    report_card_id: int,
    format: str = "pdf",
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.PARENT, RoleId.STUDENT, RoleId.HEADTEACHER)),
):
    from fastapi import HTTPException
    from app.models.report_card import ReportCard
    from app.models.report_remark import ReportRemark
    from app.models.student import Student
    from app.models.attendance import Attendance
    from app.models.assessment import Assessment
    from app.models.school import School
    from app.services.pdf_service import generate_report_card_pdf
    from app.services.ranking_service import compute_class_positions
    from datetime import date

    rc = db.query(ReportCard).filter(ReportCard.id == report_card_id).first()
    if not rc:
        raise HTTPException(404, "Report card not found")

    student = db.query(Student).filter(Student.id == rc.student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    school = db.query(School).filter(School.id == rc.school_id).first()

    assessments = (
        db.query(Assessment)
        .filter(
            Assessment.student_id == rc.student_id,
            Assessment.academic_year == rc.academic_year,
            Assessment.term == rc.term,
        )
        .all()
    )

    remark = (
        db.query(ReportRemark)
        .filter(
            ReportRemark.student_id == rc.student_id,
            ReportRemark.academic_year == rc.academic_year,
            ReportRemark.term == rc.term,
        )
        .first()
    )

    attendance_records = (
        db.query(Attendance)
        .filter(
            Attendance.student_id == rc.student_id,
            Attendance.school_id == rc.school_id,
        )
        .all()
    )
    total_days = len(attendance_records)
    present_days = sum(1 for a in attendance_records if a.status == "present")
    attendance_summary = {"total_days": total_days, "present_days": present_days}

    position_data = compute_class_positions(
        db, student.class_name, rc.academic_year, rc.term, rc.school_id
    )
    class_position = None
    total_students = len(position_data)
    for entry in position_data:
        if entry["student_id"] == student.id:
            class_position = entry["position"]
            break

    pdf_bytes = generate_report_card_pdf(
        school=school,
        student=student,
        assessments=assessments,
        report_card=rc,
        attendance_summary=attendance_summary,
        conduct=remark.conduct if remark else None,
        effort=remark.effort if remark else None,
        participation=remark.participation if remark else None,
        class_position=class_position,
        total_students=total_students,
    )

    filename = f"report_card_{student.name.replace(' ', '_')}_{rc.academic_year}_{rc.term}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/download-class/{class_name}")
def download_class_report_cards(
    class_name: str,
    academic_year: str,
    term: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.HEADTEACHER)),
):
    from fastapi import HTTPException
    from app.models.student import Student
    from app.models.report_card import ReportCard

    students = (
        db.query(Student)
        .filter(
            Student.school_id == current_user.school_id,
            Student.class_name == class_name,
            Student.is_active == True,
        )
        .all()
    )

    if not students:
        raise HTTPException(404, "No students found in this class")

    report_cards = (
        db.query(ReportCard)
        .filter(
            ReportCard.school_id == current_user.school_id,
            ReportCard.academic_year == academic_year,
            ReportCard.term == term,
            ReportCard.student_id.in_([s.id for s in students]),
        )
        .all()
    )

    return {
        "total_students": len(students),
        "report_cards_generated": len(set(rc.student_id for rc in report_cards)),
        "message": "Use individual /download/{id} endpoints to get PDFs for each student",
        "report_card_ids": list(set(rc.id for rc in report_cards)),
    }
