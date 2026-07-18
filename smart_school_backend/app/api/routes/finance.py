import json
import logging
from datetime import datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.api.deps import get_current_user, role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/finance", tags=["finance"])


class CashEntryCreate(BaseModel):
    date: str
    description: str = Field(min_length=1, max_length=200)
    amount: Decimal = Field(gt=0)
    paid_by: str = Field(min_length=1, max_length=120)
    payment_method: str = Field(min_length=1, max_length=50)
    entry_type: str = Field(default="Income", pattern="^(Income|Expense)$")


class CashEntryRead(BaseModel):
    id: int
    date: str
    description: str
    amount: str
    paid_by: str
    payment_method: str
    receipt_no: str
    entry_type: str
    created_by: str | None
    created_at: str


class QuotationItemSchema(BaseModel):
    description: str
    qty: int = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    total: Decimal = Field(ge=0)


class QuotationCreate(BaseModel):
    customer: str = Field(min_length=1, max_length=200)
    date: str
    items: list[QuotationItemSchema] = Field(min_length=1)
    notes: str = ""


class QuotationRead(BaseModel):
    id: int
    quotation_no: str
    customer: str
    date: str
    items: list[QuotationItemSchema]
    notes: str
    total: str
    status: str
    created_by: str | None
    created_at: str


class RequisitionItemSchema(BaseModel):
    description: str
    qty: int = Field(gt=0)
    estimated_cost: Decimal = Field(ge=0)
    total: Decimal = Field(ge=0)


class RequisitionCreate(BaseModel):
    department: str = Field(min_length=1, max_length=200)
    requested_by: str = Field(min_length=1, max_length=120)
    date: str
    items: list[RequisitionItemSchema] = Field(min_length=1)
    purpose: str = ""


class RequisitionRead(BaseModel):
    id: int
    req_no: str
    department: str
    requested_by: str
    date: str
    items: list[RequisitionItemSchema]
    purpose: str
    total: str
    status: str
    created_by: str | None
    created_at: str


class BankAccountUpdate(BaseModel):
    bank_name: str = Field(min_length=1, max_length=200)
    account_name: str = Field(min_length=1, max_length=200)
    account_number: str = Field(min_length=1, max_length=100)


class BankAccountRead(BaseModel):
    bank_name: str
    account_name: str
    account_number: str


def _get_school_id(user: User) -> int:
    if not user.school_id:
        raise HTTPException(status_code=400, detail="No school associated with this user")
    return user.school_id


def _next_counter(db, prefix: str, school_id: int) -> int:
    result = db.execute(
        text("SELECT COUNT(*) FROM cashbook_entries WHERE school_id = :sid"),
        {"sid": school_id},
    )
    count = result.scalar() or 0
    return count + 1


@router.post("/cash-entry", response_model=CashEntryRead)
def create_cash_entry(
    payload: CashEntryCreate,
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
    db=Depends(get_db),
):
    school_id = _get_school_id(current_user)
    count = _next_counter(db, "CSH", school_id)
    receipt_no = f"CSH-{datetime.utcnow().strftime('%Y%m%d')}-{count:04d}"

    db.execute(
        text("""INSERT INTO cashbook_entries
            (school_id, date, description, amount, paid_by, payment_method, receipt_no, entry_type, created_by_id, created_at)
            VALUES (:sid, :date, :desc, :amt, :paid, :method, :receipt, :etype, :uid, NOW())"""),
        {
            "sid": school_id, "date": payload.date, "desc": payload.description,
            "amt": payload.amount, "paid": payload.paid_by, "method": payload.payment_method,
            "receipt": receipt_no, "etype": payload.entry_type, "uid": current_user.id,
        },
    )
    db.commit()

    return CashEntryRead(
        id=count, date=payload.date, description=payload.description,
        amount=f"UGX {payload.amount:,.2f}", paid_by=payload.paid_by,
        payment_method=payload.payment_method, receipt_no=receipt_no,
        entry_type=payload.entry_type, created_by=current_user.name,
        created_at=datetime.utcnow().isoformat(),
    )


@router.get("/cashbook", response_model=list[CashEntryRead])
def list_cash_entries(
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
    db=Depends(get_db),
):
    school_id = _get_school_id(current_user)
    rows = db.execute(
        text("""SELECT c.*, u.name as creator_name FROM cashbook_entries c
            LEFT JOIN users u ON c.created_by_id = u.id
            WHERE c.school_id = :sid ORDER BY c.id DESC"""),
        {"sid": school_id},
    ).fetchall()
    return [
        CashEntryRead(
            id=r.id, date=r.date, description=r.description,
            amount=f"UGX {Decimal(str(r.amount)):,.2f}", paid_by=r.paid_by,
            payment_method=r.payment_method, receipt_no=r.receipt_no,
            entry_type=r.entry_type, created_by=getattr(r, "creator_name", None),
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in rows
    ]


@router.post("/quotations", response_model=QuotationRead)
def create_quotation(
    payload: QuotationCreate,
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
    db=Depends(get_db),
):
    school_id = _get_school_id(current_user)
    count_result = db.execute(
        text("SELECT COUNT(*) FROM quotations WHERE school_id = :sid"),
        {"sid": school_id},
    )
    count = (count_result.scalar() or 0) + 1
    q_no = f"QT-{datetime.utcnow().strftime('%Y%m%d')}-{count:04d}"
    total = sum(item.total for item in payload.items)
    items_json = json.dumps([item.model_dump() for item in payload.items])

    db.execute(
        text("""INSERT INTO quotations
            (school_id, quotation_no, customer, date, items, notes, total, status, created_by_id, created_at)
            VALUES (:sid, :qno, :cust, :date, :items, :notes, :total, 'Draft', :uid, NOW())"""),
        {
            "sid": school_id, "qno": q_no, "cust": payload.customer,
            "date": payload.date, "items": items_json, "notes": payload.notes,
            "total": total, "uid": current_user.id,
        },
    )
    db.commit()

    return QuotationRead(
        id=count, quotation_no=q_no, customer=payload.customer,
        date=payload.date, items=payload.items, notes=payload.notes,
        total=f"UGX {total:,.2f}", status="Draft",
        created_by=current_user.name, created_at=datetime.utcnow().isoformat(),
    )


@router.get("/quotations", response_model=list[QuotationRead])
def list_quotations(
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
    db=Depends(get_db),
):
    school_id = _get_school_id(current_user)
    rows = db.execute(
        text("""SELECT q.*, u.name as creator_name FROM quotations q
            LEFT JOIN users u ON q.created_by_id = u.id
            WHERE q.school_id = :sid ORDER BY q.id DESC"""),
        {"sid": school_id},
    ).fetchall()
    return [
        QuotationRead(
            id=r.id, quotation_no=r.quotation_no, customer=r.customer,
            date=r.date, items=json.loads(r.items) if isinstance(r.items, str) else r.items,
            notes=r.notes or "", total=f"UGX {Decimal(str(r.total)):,.2f}",
            status=r.status, created_by=getattr(r, "creator_name", None),
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in rows
    ]


@router.post("/requisitions", response_model=RequisitionRead)
def create_requisition(
    payload: RequisitionCreate,
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
    db=Depends(get_db),
):
    school_id = _get_school_id(current_user)
    count_result = db.execute(
        text("SELECT COUNT(*) FROM requisitions WHERE school_id = :sid"),
        {"sid": school_id},
    )
    count = (count_result.scalar() or 0) + 1
    req_no = f"REQ-{datetime.utcnow().strftime('%Y%m%d')}-{count:04d}"
    total = sum(item.total for item in payload.items)
    items_json = json.dumps([item.model_dump() for item in payload.items])

    db.execute(
        text("""INSERT INTO requisitions
            (school_id, req_no, department, requested_by, date, items, purpose, total, status, created_by_id, created_at)
            VALUES (:sid, :rno, :dept, :reqby, :date, :items, :purpose, :total, 'Pending', :uid, NOW())"""),
        {
            "sid": school_id, "rno": req_no, "dept": payload.department,
            "reqby": payload.requested_by, "date": payload.date,
            "items": items_json, "purpose": payload.purpose, "total": total,
            "uid": current_user.id,
        },
    )
    db.commit()

    return RequisitionRead(
        id=count, req_no=req_no, department=payload.department,
        requested_by=payload.requested_by, date=payload.date,
        items=payload.items, purpose=payload.purpose,
        total=f"UGX {total:,.2f}", status="Pending",
        created_by=current_user.name, created_at=datetime.utcnow().isoformat(),
    )


@router.get("/requisitions", response_model=list[RequisitionRead])
def list_requisitions(
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
    db=Depends(get_db),
):
    school_id = _get_school_id(current_user)
    rows = db.execute(
        text("""SELECT r.*, u.name as creator_name FROM requisitions r
            LEFT JOIN users u ON r.created_by_id = u.id
            WHERE r.school_id = :sid ORDER BY r.id DESC"""),
        {"sid": school_id},
    ).fetchall()
    return [
        RequisitionRead(
            id=r.id, req_no=r.req_no, department=r.department,
            requested_by=r.requested_by, date=r.date,
            items=json.loads(r.items) if isinstance(r.items, str) else r.items,
            purpose=r.purpose or "", total=f"UGX {Decimal(str(r.total)):,.2f}",
            status=r.status, created_by=getattr(r, "creator_name", None),
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in rows
    ]


@router.put("/bank-account", response_model=BankAccountRead)
def update_bank_account(
    payload: BankAccountUpdate,
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
    db=Depends(get_db),
):
    school_id = _get_school_id(current_user)
    existing = db.execute(
        text("SELECT id FROM bank_accounts WHERE school_id = :sid LIMIT 1"),
        {"sid": school_id},
    ).fetchone()

    if existing:
        db.execute(
            text("""UPDATE bank_accounts SET bank_name = :bn, account_name = :an,
                account_number = :ac, updated_at = NOW() WHERE id = :id"""),
            {"bn": payload.bank_name, "an": payload.account_name, "ac": payload.account_number, "id": existing.id},
        )
    else:
        db.execute(
            text("""INSERT INTO bank_accounts (school_id, bank_name, account_name, account_number, updated_at)
                VALUES (:sid, :bn, :an, :ac, NOW())"""),
            {"sid": school_id, "bn": payload.bank_name, "an": payload.account_name, "ac": payload.account_number},
        )
    db.commit()

    return BankAccountRead(
        bank_name=payload.bank_name,
        account_name=payload.account_name,
        account_number=payload.account_number,
    )


@router.get("/bank-account", response_model=BankAccountRead)
def get_bank_account(
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
    db=Depends(get_db),
):
    school_id = _get_school_id(current_user)
    row = db.execute(
        text("SELECT bank_name, account_name, account_number FROM bank_accounts WHERE school_id = :sid LIMIT 1"),
        {"sid": school_id},
    ).fetchone()

    if row:
        return BankAccountRead(bank_name=row.bank_name, account_name=row.account_name, account_number=row.account_number)

    return BankAccountRead(bank_name="", account_name="", account_number="")
