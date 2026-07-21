from pydantic import BaseModel, Field


class ReportRemarkSubmit(BaseModel):
    student_id: int
    academic_year: str = Field(min_length=4, max_length=20)
    term: str = Field(min_length=3, max_length=20)
    conduct: str | None = Field(default=None, max_length=50)
    effort: str | None = Field(default=None, max_length=50)
    participation: str | None = Field(default=None, max_length=50)
    general_remarks: str | None = Field(default=None, max_length=2000)


class ReportRemarkRead(BaseModel):
    id: int
    student_id: int
    school_id: int
    academic_year: str
    term: str
    conduct: str | None = None
    effort: str | None = None
    participation: str | None = None
    general_remarks: str | None = None
    teacher_id: int | None = None

    model_config = {"from_attributes": True}
