from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SyncUploadItem(BaseModel):
    entity_type: str = Field(min_length=2, max_length=80)
    entity_id: int | None = None
    action: str = Field(min_length=2, max_length=50)
    payload: dict
    idempotency_key: str = Field(min_length=8, max_length=120)


class SyncUploadRequest(BaseModel):
    changes: list[SyncUploadItem] = Field(min_length=1)


class SyncChangeRead(BaseModel):
    id: int
    school_id: int
    user_id: int
    entity_type: str
    entity_id: int | None = None
    action: str
    payload: dict
    idempotency_key: str
    status: str
    created_at: datetime
    synced_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class SyncUploadResponse(BaseModel):
    accepted: int
    duplicates: int
    changes: list[SyncChangeRead]
