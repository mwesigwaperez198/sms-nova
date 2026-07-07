from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.user import User
from app.schemas.fees import (
    FeeCategoryCreate,
    FeeCategoryRead,
    FeesReportRead,
    InvoiceCreate,
    InvoiceRead,
    PaymentCreate,
    PaymentRead,
    PaymentRecordRead,
    ReceiptRead,
    StudentFeesRead,
    StudentFeesReportItem,
)
from app.services import fees_service

router = APIRouter(prefix="/fees", tags=["fees"])


@router.post("/categories", response_model=FeeCategoryRead)
def create_fee_category(
    payload: FeeCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN)),
):
    return fees_service.create_fee_category(db, payload, current_user)


@router.post("/invoices", response_model=InvoiceRead)
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN)),
):
    return fees_service.create_invoice(db, payload, current_user)


@router.get("/student/{student_id}", response_model=StudentFeesRead)
def get_student_fees(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.PARENT, RoleId.STUDENT)),
):
    return fees_service.get_student_fees(db, student_id, current_user)


@router.post("/payment", response_model=PaymentRecordRead)
def record_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.PARENT)),
):
    return fees_service.record_payment(db, payload, current_user)


@router.get("/payments/{payment_id}", response_model=PaymentRead)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.PARENT, RoleId.STUDENT)),
):
    return fees_service.get_payment(db, payment_id, current_user)


@router.get("/receipt/{receipt_id}", response_model=ReceiptRead)
def get_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.PARENT)),
):
    return fees_service.get_receipt(db, receipt_id, current_user)


@router.get("/report", response_model=FeesReportRead)
def fees_report(
    academic_year: str | None = None,
    term: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN)),
):
    return fees_service.generate_fees_report(db, current_user.school_id, academic_year, term)


@router.get("/report/students", response_model=list[StudentFeesReportItem])
def fees_report_students(
    academic_year: str | None = None,
    term: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN)),
):
    return fees_service.generate_student_fees_report(db, current_user.school_id, academic_year, term)
