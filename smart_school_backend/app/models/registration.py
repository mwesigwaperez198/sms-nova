from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RegistrationRequest(Base):
    __tablename__ = "registration_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    school_name: Mapped[str] = mapped_column(String(150), nullable=False)
    admin_name: Mapped[str] = mapped_column(String(150), nullable=False)
    admin_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    admin_phone: Mapped[str] = mapped_column(String(30), nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    plan_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payment_method: Mapped[str] = mapped_column(String(20), nullable=False)
    payment_details: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class RegistrationKey(Base):
    __tablename__ = "registration_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    school_name: Mapped[str] = mapped_column(String(150), nullable=False)
    admin_email: Mapped[str] = mapped_column(String(255), nullable=False)
    plan_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
