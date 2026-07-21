from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ReportRemark(Base):
    __tablename__ = "report_remarks"
    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "academic_year",
            "term",
            name="uq_report_remarks_student_period",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False, index=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False, index=True)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    term: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    conduct: Mapped[str | None] = mapped_column(String(50))
    effort: Mapped[str | None] = mapped_column(String(50))
    participation: Mapped[str | None] = mapped_column(String(50))
    general_remarks: Mapped[str | None] = mapped_column(Text)
    teacher_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    student = relationship("Student")
    school = relationship("School")
    teacher = relationship("User")
