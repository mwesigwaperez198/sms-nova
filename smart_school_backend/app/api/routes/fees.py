from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_active_subscription, role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.fees import FeeCategory, Invoice, Payment, Receipt
from app.models.student import Student
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
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
):
    return fees_service.create_fee_category(db, payload, current_user)


@router.post("/invoices", response_model=InvoiceRead)
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
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
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR, RoleId.PARENT)),
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
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR, RoleId.PARENT)),
):
    return fees_service.get_receipt(db, receipt_id, current_user)


@router.get("/report", response_model=FeesReportRead)
def fees_report(
    academic_year: str | None = None,
    term: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
):
    return fees_service.generate_fees_report(db, current_user.school_id, academic_year, term)


@router.get("/report/students", response_model=list[StudentFeesReportItem])
def fees_report_students(
    academic_year: str | None = None,
    term: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
):
    return fees_service.generate_student_fees_report(db, current_user.school_id, academic_year, term)


@router.get("/categories/list", dependencies=[Depends(role_required(RoleId.SUPER_ADMIN, RoleId.ADMIN, RoleId.BURSAR))])
def list_fee_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_subscription),
):
    cats = db.query(FeeCategory).filter(FeeCategory.school_id == current_user.school_id).all()
    return [
        {"id": c.id, "name": c.name, "description": c.description, "is_active": c.is_active}
        for c in cats
    ]


@router.get("/invoices/list", dependencies=[Depends(role_required(RoleId.SUPER_ADMIN, RoleId.ADMIN, RoleId.BURSAR))])
def list_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_subscription),
):
    invs = db.query(Invoice).filter(Invoice.school_id == current_user.school_id).all()
    return [
        {
            "id": i.id,
            "student_id": i.student_id,
            "amount": float(i.amount),
            "status": i.status,
            "term": i.term,
            "academic_year": i.academic_year,
        }
        for i in invs
    ]


@router.get("/payments/list", dependencies=[Depends(role_required(RoleId.SUPER_ADMIN, RoleId.ADMIN, RoleId.BURSAR))])
def list_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_subscription),
):
    pays = (
        db.query(Payment)
        .filter(Payment.school_id == current_user.school_id)
        .order_by(Payment.id.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": p.id,
            "student_id": p.student_id,
            "amount": float(p.amount),
            "method": p.method,
            "reference": p.reference,
            "created_at": str(p.created_at),
        }
        for p in pays
    ]


@router.get("/receipts/list", dependencies=[Depends(role_required(RoleId.SUPER_ADMIN, RoleId.ADMIN, RoleId.BURSAR))])
def list_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_subscription),
):
    recs = (
        db.query(Receipt)
        .join(Payment, Receipt.payment_id == Payment.id)
        .filter(Payment.school_id == current_user.school_id)
        .order_by(Receipt.id.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": r.id,
            "payment_id": r.payment_id,
            "receipt_number": r.receipt_number,
            "issued_at": str(r.issued_at),
        }
        for r in recs
    ]


@router.get("/receipt/{receipt_id}/pdf")
def download_receipt_pdf(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR, RoleId.PARENT)),
):
    from fastapi import HTTPException
    from fastapi.responses import Response
    from app.models.school import School
    from app.services.receipt_pdf_service import generate_receipt_pdf

    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(404, "Receipt not found")

    payment = db.query(Payment).filter(Payment.id == receipt.payment_id).first()
    if not payment:
        raise HTTPException(404, "Payment not found")

    if payment.school_id != current_user.school_id:
        raise HTTPException(404, "Receipt not found")

    student = db.query(Student).filter(Student.id == payment.student_id).first()
    invoice = db.query(Invoice).filter(Invoice.id == payment.invoice_id).first()
    school = db.query(School).filter(School.id == payment.school_id).first()

    pdf_bytes = generate_receipt_pdf(school, payment, receipt, student, invoice)
    filename = f"receipt_{receipt.receipt_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/balances", dependencies=[Depends(role_required(RoleId.SUPER_ADMIN, RoleId.ADMIN, RoleId.BURSAR))])
def fee_balances(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_subscription),
):
    from sqlalchemy import text

    rows = db.execute(
        text("""
            SELECT s.id, s.name,
                   COALESCE(SUM(i.amount), 0) AS total_invoiced,
                   COALESCE(SUM(p.amount), 0) AS total_paid
            FROM students s
            LEFT JOIN invoices i ON i.student_id = s.id
            LEFT JOIN payments p ON p.student_id = s.id
            WHERE s.school_id = :sid
            GROUP BY s.id, s.name
        """),
        {"sid": current_user.school_id},
    ).fetchall()
    result = []
    for r in rows:
        balance = float(r[2]) - float(r[3])
        if balance > 0:
            result.append({
                "student_id": r[0],
                "student_name": r[1],
                "total_invoiced": float(r[2]),
                "total_paid": float(r[3]),
                "balance": balance,
            })
    return result
