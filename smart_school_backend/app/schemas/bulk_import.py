from pydantic import BaseModel, Field


class BulkStudentItem(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    admission_number: str | None = Field(default=None, max_length=80)
    class_name: str | None = Field(default=None, max_length=80)
    stream_name: str | None = Field(default=None, max_length=80)
    gender: str | None = Field(default=None, max_length=20)
    date_of_birth: str | None = None
    parent_name: str | None = Field(default=None, max_length=150)
    parent_phone: str | None = Field(default=None, max_length=50)


class BulkImportRequest(BaseModel):
    students: list[BulkStudentItem]


class BulkImportResult(BaseModel):
    total: int
    imported: int
    skipped: int
    errors: list[dict]
