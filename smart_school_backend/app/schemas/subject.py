from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SubjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    code: str | None = Field(default=None, max_length=20)
    category: str | None = Field(default=None, max_length=50)


class SubjectRead(BaseModel):
    id: int
    school_id: int
    name: str
    code: str | None = None
    category: str | None = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClassCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    section: str | None = Field(default=None, max_length=80)
    capacity: int | None = None
    class_teacher_id: int | None = None


class ClassRead(BaseModel):
    id: int
    school_id: int
    name: str
    section: str | None = None
    capacity: int | None = None
    class_teacher_id: int | None = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
