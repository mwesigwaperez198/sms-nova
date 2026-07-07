from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NotificationCreate(BaseModel):
    user_id: int
    type: str = Field(min_length=2, max_length=50)
    channel: str = Field(default="in_app", max_length=30)
    title: str = Field(min_length=2, max_length=150)
    message: str = Field(min_length=2)


class NotificationRead(BaseModel):
    id: int
    school_id: int
    user_id: int
    sender_id: int | None = None
    type: str
    channel: str
    title: str
    message: str
    status: str
    created_at: datetime
    sent_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class RoleNotificationPayload(BaseModel):
    role_id: int
    type: str = Field(default="role_broadcast", max_length=50)
    channel: str = Field(default="in_app", max_length=30)
    title: str = Field(min_length=2, max_length=150)
    message: str = Field(min_length=2)


class SmsNotificationPayload(BaseModel):
    role_id: int
    type: str = Field(default="sms_bulk", max_length=50)
    title: str = Field(min_length=2, max_length=150)
    message: str = Field(min_length=2)


class SmsSendResult(BaseModel):
    queued: int
    failed: int
    details: list[str]
