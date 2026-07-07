from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class FeeCategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: str | None = None


class FeeCategoryRead(BaseModel):
    id: int
    school_id: int
    name: str
    description: str | None = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvoiceCreate(BaseModel):
    student_id: int
    fee_category_id: int | None = None
    academic_year: str = Field(min_length=4, max_length=20)
    term: str = Field(min_length=3, max_length=20)
    amount: Decimal = Field(gt=0)
    description: str | None = None
    due_date: date


class InvoiceRead(BaseModel):
    id: int
    student_id: int
    school_id: int
    fee_category_id: int | None = None
    academic_year: str
    term: str
    amount: Decimal
    description: str | None = None
    due_date: date
    status: str
    created_by_id: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentCreate(BaseModel):
    invoice_id: int
    amount: Decimal = Field(gt=0)
    method: str = Field(min_length=2, max_length=50)
    reference: str | None = Field(default=None, max_length=120)


class PaymentRead(BaseModel):
    id: int
    invoice_id: int
    student_id: int
    payer_id: int
    school_id: int
    amount: Decimal
    method: str
    reference: str | None = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReceiptRead(BaseModel):
    id: int
    payment_id: int
    receipt_number: str
    issued_at: datetime
    pdf_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class PaymentRecordRead(BaseModel):
    payment: PaymentRead
    invoice: InvoiceRead
    receipt: ReceiptRead


class StudentFeesRead(BaseModel):
    student_id: int
    school_id: int
    total_invoiced: str
    total_paid: str
    outstanding_balance: str
    invoices: list[InvoiceRead]
    payments: list[PaymentRead]


class FeesReportRead(BaseModel):
    school_id: int
    academic_year: str | None = None
    term: str | None = None
    total_invoiced: str
    total_paid: str
    outstanding_balance: str
    invoice_count: int
    payment_count: int
    paid_invoice_count: int
    partial_invoice_count: int
    unpaid_invoice_count: int


class StudentFeesReportItem(FeesReportRead):
    student_id: int
