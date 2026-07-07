from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ReportCardSubmit(BaseModel):
    student_id: int
    academic_year: str = Field(min_length=4, max_length=20)
    term: str = Field(min_length=3, max_length=20)
    subject: str = Field(min_length=2, max_length=100)
    score: Decimal = Field(ge=0, le=100)
    grade: str = Field(min_length=1, max_length=5)
    teacher_remarks: str | None = None


class ReportCardApprovalUpdate(BaseModel):
    class_teacher_remarks: str | None = None
    head_teacher_remarks: str | None = None


class ReportCardRead(BaseModel):
    id: int
    student_id: int
    school_id: int
    academic_year: str
    term: str
    subject: str
    score: Decimal
    grade: str
    teacher_id: int | None = None
    teacher_remarks: str | None = None
    class_teacher_remarks: str | None = None
    head_teacher_remarks: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportCardDownloadRead(BaseModel):
    report_card_id: int
    status: str
    download_url: str | None = None
    message: str
