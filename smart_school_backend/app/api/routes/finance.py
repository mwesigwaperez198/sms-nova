from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import get_current_user, role_required
from app.core.roles import RoleId
from app.models.user import User

router = APIRouter(prefix="/finance", tags=["finance"])

# In-memory stores (no DB backing yet)
_cashbook: list[dict[str, Any]] = []
_quotations: list[dict[str, Any]] = []
_requisitions: list[dict[str, Any]] = []
_bank_account: dict[str, str] = {
    "bank_name": "Stanbic Bank Uganda",
    "account_name": "NOVARA School",
    "account_number": "9030001234567",
}


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
    created_by: str
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
    created_by: str
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
    created_by: str
    created_at: str


class BankAccountUpdate(BaseModel):
    bank_name: str = Field(min_length=1, max_length=200)
    account_name: str = Field(min_length=1, max_length=200)
    account_number: str = Field(min_length=1, max_length=100)


class BankAccountRead(BaseModel):
    bank_name: str
    account_name: str
    account_number: str


_counter: int = 0


def _next_id() -> int:
    global _counter
    _counter += 1
    return _counter


@router.post("/cash-entry", response_model=CashEntryRead)
def create_cash_entry(
    payload: CashEntryCreate,
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
):
    entry_id = _next_id()
    receipt_no = f"CSH-{datetime.utcnow().strftime('%Y%m%d')}-{entry_id:04d}"
    entry: dict[str, Any] = {
        "id": entry_id,
        "date": payload.date,
        "description": payload.description,
        "amount": f"UGX {payload.amount:,.2f}",
        "paid_by": payload.paid_by,
        "payment_method": payload.payment_method,
        "receipt_no": receipt_no,
        "entry_type": payload.entry_type,
        "created_by": current_user.name,
        "created_at": datetime.utcnow().isoformat(),
    }
    _cashbook.append(entry)
    return entry


@router.get("/cashbook", response_model=list[CashEntryRead])
def list_cash_entries(
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
):
    return list(reversed(_cashbook))


@router.post("/quotations", response_model=QuotationRead)
def create_quotation(
    payload: QuotationCreate,
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
):
    q_id = _next_id()
    q_no = f"QT-{datetime.utcnow().strftime('%Y%m%d')}-{q_id:04d}"
    total = sum(item.total for item in payload.items)
    quotation: dict[str, Any] = {
        "id": q_id,
        "quotation_no": q_no,
        "customer": payload.customer,
        "date": payload.date,
        "items": [item.model_dump() for item in payload.items],
        "notes": payload.notes,
        "total": f"UGX {total:,.2f}",
        "status": "Draft",
        "created_by": current_user.name,
        "created_at": datetime.utcnow().isoformat(),
    }
    _quotations.append(quotation)
    return quotation


@router.get("/quotations", response_model=list[QuotationRead])
def list_quotations(
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
):
    return list(reversed(_quotations))


@router.post("/requisitions", response_model=RequisitionRead)
def create_requisition(
    payload: RequisitionCreate,
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
):
    r_id = _next_id()
    req_no = f"REQ-{datetime.utcnow().strftime('%Y%m%d')}-{r_id:04d}"
    total = sum(item.total for item in payload.items)
    requisition: dict[str, Any] = {
        "id": r_id,
        "req_no": req_no,
        "department": payload.department,
        "requested_by": payload.requested_by,
        "date": payload.date,
        "items": [item.model_dump() for item in payload.items],
        "purpose": payload.purpose,
        "total": f"UGX {total:,.2f}",
        "status": "Pending",
        "created_by": current_user.name,
        "created_at": datetime.utcnow().isoformat(),
    }
    _requisitions.append(requisition)
    return requisition


@router.get("/requisitions", response_model=list[RequisitionRead])
def list_requisitions(
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
):
    return list(reversed(_requisitions))


@router.put("/bank-account", response_model=BankAccountRead)
def update_bank_account(
    payload: BankAccountUpdate,
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
):
    _bank_account["bank_name"] = payload.bank_name
    _bank_account["account_name"] = payload.account_name
    _bank_account["account_number"] = payload.account_number
    return BankAccountRead(
        bank_name=_bank_account["bank_name"],
        account_name=_bank_account["account_name"],
        account_number=_bank_account["account_number"],
    )


@router.get("/bank-account", response_model=BankAccountRead)
def get_bank_account(
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.BURSAR)),
):
    return BankAccountRead(
        bank_name=_bank_account["bank_name"],
        account_name=_bank_account["account_name"],
        account_number=_bank_account["account_number"],
    )
