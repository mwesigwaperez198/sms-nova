from datetime import datetime

from pydantic import BaseModel, Field


class LibraryBookCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    author: str | None = Field(None, max_length=200)
    isbn: str | None = Field(None, max_length=30)
    publisher: str | None = Field(None, max_length=200)
    publication_year: int | None = None
    shelf_location: str | None = Field(None, max_length=80)
    total_copies: int = Field(1, ge=1)
    available_copies: int = Field(1, ge=0)
    education_tier: str | None = Field(None, max_length=80)
    subject_area: str | None = Field(None, max_length=100)
    curriculum_level: str | None = Field(None, max_length=80)
    digital_url: str | None = None
    cover_url: str | None = None
    description: str | None = None
    is_digital: bool = False


class LibraryBookRead(BaseModel):
    id: int
    school_id: int
    title: str
    author: str | None
    isbn: str | None
    publisher: str | None
    publication_year: int | None
    shelf_location: str | None
    total_copies: int
    available_copies: int
    education_tier: str | None
    subject_area: str | None
    curriculum_level: str | None
    digital_url: str | None
    cover_url: str | None
    description: str | None
    is_digital: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class LibraryBorrowCreate(BaseModel):
    book_id: int
    borrower_id: int
    due_date: datetime


class LibraryBorrowRead(BaseModel):
    id: int
    school_id: int
    book_id: int
    borrower_id: int
    issued_by_id: int | None
    borrowed_at: datetime
    due_date: datetime
    returned_at: datetime | None
    status: str
    notes: str | None

    model_config = {"from_attributes": True}


class LibraryRequestCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    subject: str | None = Field(None, max_length=100)
    reason: str | None = None
    priority: str = "normal"


class LibraryRequestRead(BaseModel):
    id: int
    school_id: int
    requested_by_id: int
    title: str
    subject: str | None
    reason: str | None
    priority: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
