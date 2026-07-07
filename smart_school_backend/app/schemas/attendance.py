from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class AttendanceEntryCreate(BaseModel):
    student_id: int
    status: str = Field(pattern="^(present|absent|late|excused)$")
    remarks: str | None = None


class AttendanceMarkCreate(BaseModel):
    attendance_date: date
    records: list[AttendanceEntryCreate] = Field(min_length=1)


class AttendanceUpdate(BaseModel):
    status: str = Field(pattern="^(present|absent|late|excused)$")
    remarks: str | None = None
    edit_reason: str = Field(min_length=3)


class AttendanceRead(BaseModel):
    id: int
    student_id: int
    school_id: int
    attendance_date: date
    status: str
    teacher_id: int | None = None
    remarks: str | None = None
    edit_reason: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
