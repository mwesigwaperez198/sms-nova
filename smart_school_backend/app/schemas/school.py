from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class SchoolCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    school_code: str = Field(min_length=2, max_length=30)
    address: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    country: str | None = None
    currency_code: str | None = Field(default=None, min_length=3, max_length=3)
    timezone: str | None = None
    subscription_status: str = "trial"


class SchoolRead(BaseModel):
    id: int
    name: str
    school_code: str
    address: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    country: str
    currency_code: str
    timezone: str
    subscription_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
