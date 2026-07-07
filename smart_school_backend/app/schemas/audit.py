from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogRead(BaseModel):
    id: int
    school_id: int | None = None
    actor_user_id: int | None = None
    actor_role_id: int | None = None
    action: str
    entity_type: str
    entity_id: int | None = None
    before_data: dict | None = None
    after_data: dict | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
