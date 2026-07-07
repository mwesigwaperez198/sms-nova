from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.user import User


def log_action(
    db: Session,
    *,
    current_user: User | None,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    before_data: dict | None = None,
    after_data: dict | None = None,
) -> AuditLog:
    log = AuditLog(
        school_id=getattr(current_user, "school_id", None),
        actor_user_id=getattr(current_user, "id", None),
        actor_role_id=getattr(current_user, "role_id", None),
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_data=before_data,
        after_data=after_data,
    )
    db.add(log)
    return log
