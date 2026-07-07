from datetime import datetime

from pydantic import BaseModel, Field


class SubscriptionPlanRead(BaseModel):
    id: int
    name: str
    price: float
    currency_code: str
    max_students: int | None
    max_staff: int | None
    features: dict
    is_active: bool

    model_config = {"from_attributes": True}


class SchoolSubscriptionRead(BaseModel):
    id: int
    school_id: int
    plan_id: int
    status: str
    starts_at: datetime
    expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class GenerateKeyRequest(BaseModel):
    school_id: int
    plan_id: int


class GenerateKeyResponse(BaseModel):
    product_key: str
    expires_at: datetime
    message: str


class ActivateKeyRequest(BaseModel):
    product_key: str = Field(..., min_length=20, max_length=30)
    school_id: int


class ActivateKeyResponse(BaseModel):
    message: str
    subscription: SchoolSubscriptionRead


class UpdateSubscriptionStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(trial|active|expired|suspended|cancelled)$")
