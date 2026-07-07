from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StudentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    admission_number: str | None = Field(default=None, max_length=80)
    class_name: str | None = Field(default=None, max_length=80)
    stream_name: str | None = Field(default=None, max_length=80)
    user_id: int | None = None


class StudentRead(BaseModel):
    id: int
    school_id: int
    user_id: int | None = None
    admission_number: str | None = None
    name: str
    class_name: str | None = None
    stream_name: str | None = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GuardianLinkCreate(BaseModel):
    guardian_id: int
    relationship: str | None = Field(default=None, max_length=50)
    is_primary: bool = False


class GuardianLinkRead(BaseModel):
    id: int
    student_id: int
    guardian_id: int
    relationship: str | None = None
    is_primary: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
