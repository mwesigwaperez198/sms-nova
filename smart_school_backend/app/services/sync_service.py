from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.sync import SyncChange
from app.models.user import User
from app.schemas.sync import SyncUploadRequest


def upload_changes(db: Session, payload: SyncUploadRequest, current_user: User) -> dict:
    accepted: list[SyncChange] = []
    duplicates = 0
    for item in payload.changes:
        existing = (
            db.query(SyncChange)
            .filter(
                SyncChange.school_id == current_user.school_id,
                SyncChange.idempotency_key == item.idempotency_key,
            )
            .first()
        )
        if existing:
            duplicates += 1
            accepted.append(existing)
            continue

        change = SyncChange(
            school_id=current_user.school_id,
            user_id=current_user.id,
            entity_type=item.entity_type,
            entity_id=item.entity_id,
            action=item.action,
            payload=item.payload,
            idempotency_key=item.idempotency_key,
            status="received",
            synced_at=datetime.now(timezone.utc),
        )
        db.add(change)
        accepted.append(change)

    db.commit()
    for change in accepted:
        db.refresh(change)

    return {"accepted": len(accepted) - duplicates, "duplicates": duplicates, "changes": accepted}


def download_changes(db: Session, current_user: User) -> list[SyncChange]:
    return (
        db.query(SyncChange)
        .filter(SyncChange.school_id == current_user.school_id)
        .order_by(SyncChange.created_at.desc())
        .limit(100)
        .all()
    )
