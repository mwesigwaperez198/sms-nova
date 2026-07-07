from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class School(Base):
    __tablename__ = "schools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    school_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(255))
    country: Mapped[str] = mapped_column(String(80), nullable=False, default="Uganda")
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False, default="UGX")
    timezone: Mapped[str] = mapped_column(String(80), nullable=False, default="Africa/Kampala")
    subscription_status: Mapped[str] = mapped_column(String(30), nullable=False, default="trial")
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

    users = relationship("User", back_populates="school")
    students = relationship("Student", back_populates="school")
