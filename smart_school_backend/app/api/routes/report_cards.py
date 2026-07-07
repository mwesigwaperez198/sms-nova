from fastapi import APIRouter, Depends
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
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.PARENT, RoleId.STUDENT)),
):
    return report_card_service.list_student_report_cards(db, student_id, current_user)


@router.post("/{report_card_id}/approve", response_model=ReportCardRead)
def approve_report_card(
    report_card_id: int,
    payload: ReportCardApprovalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN)),
):
    return report_card_service.approve_report_card(db, report_card_id, payload, current_user)


@router.post("/{report_card_id}/publish", response_model=ReportCardRead)
def publish_report_card(
    report_card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN)),
):
    return report_card_service.publish_report_card(db, report_card_id, current_user)


@router.get("/download/{report_card_id}", response_model=ReportCardDownloadRead)
def download_report_card(
    report_card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.PARENT, RoleId.STUDENT)),
):
    report = report_card_service.get_report_card_for_download(db, report_card_id, current_user)
    return {
        "report_card_id": report.id,
        "status": report.status,
        "download_url": None,
        "message": "PDF export is not generated yet, but this report card is available.",
    }
