from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class LibraryBook(Base):
    __tablename__ = "library_books"
    __table_args__ = (
        UniqueConstraint("school_id", "isbn", name="uq_library_books_school_isbn"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    author: Mapped[str | None] = mapped_column(String(200))
    isbn: Mapped[str | None] = mapped_column(String(30), index=True)
    publisher: Mapped[str | None] = mapped_column(String(200))
    publication_year: Mapped[int | None] = mapped_column(Integer)
    shelf_location: Mapped[str | None] = mapped_column(String(80))
    total_copies: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    available_copies: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    education_tier: Mapped[str | None] = mapped_column(String(80), index=True)
    subject_area: Mapped[str | None] = mapped_column(String(100), index=True)
    curriculum_level: Mapped[str | None] = mapped_column(String(80), index=True)
    digital_url: Mapped[str | None] = mapped_column(Text)
    cover_url: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    is_digital: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    added_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    school = relationship("School")
    added_by = relationship("User")
    borrow_records = relationship("LibraryBorrow", back_populates="book")


class LibraryBorrow(Base):
    __tablename__ = "library_borrows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False, index=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("library_books.id"), nullable=False, index=True)
    borrower_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    issued_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    borrowed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", index=True
    )
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    school = relationship("School")
    book = relationship("LibraryBook", back_populates="borrow_records")
    borrower = relationship("User", foreign_keys=[borrower_id])
    issued_by = relationship("User", foreign_keys=[issued_by_id])


class LibraryRequest(Base):
    __tablename__ = "library_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False, index=True)
    requested_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(100))
    reason: Mapped[str | None] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="normal")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    school = relationship("School")
    requested_by = relationship("User")
