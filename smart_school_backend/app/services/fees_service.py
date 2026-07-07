from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import case, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.roles import RoleId
from app.models.fees import FeeCategory, Invoice, Payment, Receipt
from app.models.school import School
from app.models.student import Student
from app.models.user import User
from app.schemas.fees import FeeCategoryCreate, InvoiceCreate, PaymentCreate
from app.services.access_service import ensure_student_access, get_student_in_school
from app.services.audit_service import log_action


def _sum_confirmed_payments(db: Session, invoice_id: int) -> Decimal:
    total = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.invoice_id == invoice_id, Payment.status == "confirmed")
        .scalar()
    )
    return Decimal(total)


def _update_invoice_status(db: Session, invoice: Invoice) -> None:
    total_paid = _sum_confirmed_payments(db, invoice.id)
    if total_paid == Decimal("0"):
        invoice.status = "unpaid"
    elif total_paid < invoice.amount:
        invoice.status = "partial"
    else:
        invoice.status = "paid"


def _build_receipt_number(db: Session, invoice: Invoice, payment_id: int) -> str:
    school = db.get(School, invoice.school_id)
    school_code = school.school_code if school else f"SCH{invoice.school_id}"
    return f"{school_code}-{invoice.academic_year}-{payment_id:04d}"


def create_fee_category(
    db: Session,
    payload: FeeCategoryCreate,
    current_user: User,
) -> FeeCategory:
    category = FeeCategory(
        school_id=current_user.school_id,
        name=payload.name.strip().lower(),
        description=payload.description,
    )
    db.add(category)
    log_action(
        db,
        current_user=current_user,
        action="fee_category.created",
        entity_type="fee_category",
        after_data={"name": category.name},
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Fee category already exists",
        ) from None
    db.refresh(category)
    return category


def create_invoice(db: Session, payload: InvoiceCreate, current_user: User) -> Invoice:
    student = get_student_in_school(db, payload.student_id, current_user.school_id)

    if payload.fee_category_id is not None:
        category = (
            db.query(FeeCategory)
            .filter(
                FeeCategory.id == payload.fee_category_id,
                FeeCategory.school_id == current_user.school_id,
                FeeCategory.is_active.is_(True),
            )
            .first()
        )
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fee category not found",
            )

    invoice = Invoice(
        student_id=student.id,
        school_id=current_user.school_id,
        fee_category_id=payload.fee_category_id,
        academic_year=payload.academic_year,
        term=payload.term,
        amount=payload.amount,
        description=payload.description,
        due_date=payload.due_date,
        status="unpaid",
        created_by_id=current_user.id,
    )
    db.add(invoice)
    db.flush()
    log_action(
        db,
        current_user=current_user,
        action="invoice.created",
        entity_type="invoice",
        entity_id=invoice.id,
        after_data={"student_id": student.id, "amount": str(invoice.amount)},
    )
    db.commit()
    db.refresh(invoice)
    return invoice


def get_student_fees(db: Session, student_id: int, current_user: User) -> dict:
    student = ensure_student_access(db, student_id, current_user)
    invoices = (
        db.query(Invoice)
        .filter(Invoice.student_id == student.id, Invoice.school_id == student.school_id)
        .order_by(Invoice.created_at.desc())
        .all()
    )
    payments = (
        db.query(Payment)
        .filter(Payment.student_id == student.id, Payment.school_id == student.school_id)
        .order_by(Payment.created_at.desc())
        .all()
    )

    total_invoiced = sum((invoice.amount for invoice in invoices), Decimal("0"))
    total_paid = sum(
        (payment.amount for payment in payments if payment.status == "confirmed"),
        Decimal("0"),
    )
    return {
        "student_id": student.id,
        "school_id": student.school_id,
        "total_invoiced": str(total_invoiced),
        "total_paid": str(total_paid),
        "outstanding_balance": str(total_invoiced - total_paid),
        "invoices": invoices,
        "payments": payments,
    }


def record_payment(db: Session, payload: PaymentCreate, current_user: User) -> dict:
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == payload.invoice_id, Invoice.school_id == current_user.school_id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    if current_user.role_id == RoleId.PARENT:
        ensure_student_access(db, invoice.student_id, current_user)

    payment = Payment(
        invoice_id=invoice.id,
        student_id=invoice.student_id,
        payer_id=current_user.id,
        school_id=current_user.school_id,
        amount=payload.amount,
        method=payload.method,
        reference=payload.reference,
        status="confirmed",
    )

    try:
        db.add(payment)
        db.flush()

        _update_invoice_status(db, invoice)

        receipt = Receipt(
            payment_id=payment.id,
            receipt_number=_build_receipt_number(db, invoice, payment.id),
        )
        db.add(receipt)
        db.flush()

        log_action(
            db,
            current_user=current_user,
            action="payment.recorded",
            entity_type="payment",
            entity_id=payment.id,
            after_data={
                "invoice_id": invoice.id,
                "student_id": invoice.student_id,
                "amount": str(payment.amount),
                "receipt_number": receipt.receipt_number,
            },
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(payment)
    db.refresh(invoice)
    db.refresh(receipt)
    return {"payment": payment, "invoice": invoice, "receipt": receipt}


def get_payment(db: Session, payment_id: int, current_user: User) -> Payment:
    payment = (
        db.query(Payment)
        .filter(Payment.id == payment_id, Payment.school_id == current_user.school_id)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    ensure_student_access(db, payment.student_id, current_user)
    return payment


def get_receipt(db: Session, receipt_id: int, current_user: User) -> Receipt:
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    payment = db.get(Payment, receipt.payment_id)
    if not payment or payment.school_id != current_user.school_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    if current_user.role_id == RoleId.PARENT:
        ensure_student_access(db, payment.student_id, current_user)
    return receipt


def _invoice_scope(db: Session, school_id: int, academic_year: str | None, term: str | None):
    query = db.query(Invoice.id).filter(Invoice.school_id == school_id)
    if academic_year:
        query = query.filter(Invoice.academic_year == academic_year)
    if term:
        query = query.filter(Invoice.term == term)
    return query


def generate_fees_report(
    db: Session,
    school_id: int,
    academic_year: str | None = None,
    term: str | None = None,
) -> dict:
    invoice_ids = _invoice_scope(db, school_id, academic_year, term)
    invoice_filters = [Invoice.id.in_(invoice_ids)]

    total_invoiced = Decimal(
        db.query(func.coalesce(func.sum(Invoice.amount), 0))
        .filter(*invoice_filters)
        .scalar()
    )
    invoice_count = db.query(func.count(Invoice.id)).filter(*invoice_filters).scalar()

    total_paid = Decimal(
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(
            Payment.school_id == school_id,
            Payment.status == "confirmed",
            Payment.invoice_id.in_(invoice_ids),
        )
        .scalar()
    )
    payment_count = (
        db.query(func.count(Payment.id))
        .filter(
            Payment.school_id == school_id,
            Payment.status == "confirmed",
            Payment.invoice_id.in_(invoice_ids),
        )
        .scalar()
    )

    paid_invoice_count = (
        db.query(func.count(Invoice.id))
        .filter(*invoice_filters, Invoice.status == "paid")
        .scalar()
    )
    partial_invoice_count = (
        db.query(func.count(Invoice.id))
        .filter(*invoice_filters, Invoice.status == "partial")
        .scalar()
    )
    unpaid_invoice_count = (
        db.query(func.count(Invoice.id))
        .filter(*invoice_filters, Invoice.status == "unpaid")
        .scalar()
    )

    return {
        "school_id": school_id,
        "academic_year": academic_year,
        "term": term,
        "total_invoiced": str(total_invoiced),
        "total_paid": str(total_paid),
        "outstanding_balance": str(total_invoiced - total_paid),
        "invoice_count": invoice_count,
        "payment_count": payment_count,
        "paid_invoice_count": paid_invoice_count,
        "partial_invoice_count": partial_invoice_count,
        "unpaid_invoice_count": unpaid_invoice_count,
    }


def generate_student_fees_report(
    db: Session,
    school_id: int,
    academic_year: str | None = None,
    term: str | None = None,
) -> list[dict]:
    invoice_query = db.query(
        Invoice.student_id.label("student_id"),
        func.coalesce(func.sum(Invoice.amount), 0).label("total_invoiced"),
        func.count(Invoice.id).label("invoice_count"),
        func.coalesce(func.sum(case((Invoice.status == "paid", 1), else_=0)), 0).label(
            "paid_invoice_count"
        ),
        func.coalesce(func.sum(case((Invoice.status == "partial", 1), else_=0)), 0).label(
            "partial_invoice_count"
        ),
        func.coalesce(func.sum(case((Invoice.status == "unpaid", 1), else_=0)), 0).label(
            "unpaid_invoice_count"
        ),
    ).filter(Invoice.school_id == school_id)

    if academic_year:
        invoice_query = invoice_query.filter(Invoice.academic_year == academic_year)
    if term:
        invoice_query = invoice_query.filter(Invoice.term == term)

    invoice_subq = invoice_query.group_by(Invoice.student_id).subquery()

    payment_query = db.query(
        Payment.student_id.label("student_id"),
        func.coalesce(func.sum(Payment.amount), 0).label("total_paid"),
        func.count(Payment.id).label("payment_count"),
    ).filter(Payment.school_id == school_id, Payment.status == "confirmed")

    if academic_year or term:
        payment_query = payment_query.join(Invoice, Payment.invoice_id == Invoice.id).filter(
            Invoice.school_id == school_id
        )
        if academic_year:
            payment_query = payment_query.filter(Invoice.academic_year == academic_year)
        if term:
            payment_query = payment_query.filter(Invoice.term == term)

    payment_subq = payment_query.group_by(Payment.student_id).subquery()

    rows = (
        db.query(
            invoice_subq.c.student_id,
            invoice_subq.c.total_invoiced,
            func.coalesce(payment_subq.c.total_paid, 0).label("total_paid"),
            (
                invoice_subq.c.total_invoiced - func.coalesce(payment_subq.c.total_paid, 0)
            ).label("outstanding_balance"),
            invoice_subq.c.invoice_count,
            func.coalesce(payment_subq.c.payment_count, 0).label("payment_count"),
            invoice_subq.c.paid_invoice_count,
            invoice_subq.c.partial_invoice_count,
            invoice_subq.c.unpaid_invoice_count,
        )
        .outerjoin(payment_subq, invoice_subq.c.student_id == payment_subq.c.student_id)
        .all()
    )

    return [
        {
            "student_id": row.student_id,
            "school_id": school_id,
            "academic_year": academic_year,
            "term": term,
            "total_invoiced": str(row.total_invoiced),
            "total_paid": str(row.total_paid),
            "outstanding_balance": str(row.outstanding_balance),
            "invoice_count": int(row.invoice_count),
            "payment_count": int(row.payment_count),
            "paid_invoice_count": int(row.paid_invoice_count),
            "partial_invoice_count": int(row.partial_invoice_count),
            "unpaid_invoice_count": int(row.unpaid_invoice_count),
        }
        for row in rows
    ]
