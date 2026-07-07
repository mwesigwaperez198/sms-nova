import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.subscription import ProductKey, SchoolSubscription, SubscriptionPlan


def _generate_raw_key(school_id: int, plan_id: int) -> str:
    settings = get_settings()
    timestamp = str(int(datetime.now(timezone.utc).timestamp()))
    salt = os.urandom(8).hex()
    payload = f"{school_id}:{plan_id}:{timestamp}:{salt}"
    digest = hmac.new(
        settings.secret_key.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).digest()

    b32 = base64.b32encode(digest[:20]).decode("utf-8").upper()
    return "-".join(b32[i : i + 5] for i in range(0, 20, 5))


def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.replace("-", "").encode("utf-8")).hexdigest()


def generate_product_key(
    db: Session,
    school_id: int,
    plan_id: int,
    generated_by_id: int,
) -> str:
    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.id == plan_id, SubscriptionPlan.is_active == True
    ).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription plan not found")

    db.query(ProductKey).filter(
        ProductKey.school_id == school_id,
        ProductKey.is_used == False,
    ).update({"expires_at": datetime.now(timezone.utc)}, synchronize_session=False)

    raw_key = _generate_raw_key(school_id, plan_id)
    key_hash = _hash_key(raw_key)

    product_key = ProductKey(
        school_id=school_id,
        plan_id=plan_id,
        key_hash=key_hash,
        generated_by_id=generated_by_id,
        is_used=False,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=72),
    )
    db.add(product_key)
    db.commit()
    return raw_key


def activate_product_key(
    db: Session,
    raw_key: str,
    school_id: int,
    activating_user_id: int,
) -> SchoolSubscription:
    key_hash = _hash_key(raw_key)
    now = datetime.now(timezone.utc)

    record = db.query(ProductKey).filter(
        ProductKey.key_hash == key_hash,
        ProductKey.school_id == school_id,
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid activation key",
        )
    if record.is_used:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This activation key has already been used",
        )
    if record.expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This activation key has expired. Request a new one.",
        )

    record.is_used = True
    record.used_at = now
    record.used_by_id = activating_user_id

    existing = db.query(SchoolSubscription).filter(
        SchoolSubscription.school_id == school_id
    ).order_by(SchoolSubscription.id.desc()).first()

    term_months = 4
    starts_at = now
    expires_at = now + timedelta(days=30 * term_months)

    if existing and existing.status == "active" and existing.expires_at.replace(tzinfo=timezone.utc) > now:
        starts_at = existing.expires_at
        expires_at = starts_at + timedelta(days=30 * term_months)

    subscription = SchoolSubscription(
        school_id=school_id,
        plan_id=record.plan_id,
        status="active",
        starts_at=starts_at,
        expires_at=expires_at,
    )
    db.add(subscription)

    from app.models.school import School
    db.query(School).filter(School.id == school_id).update(
        {"subscription_status": "active"}, synchronize_session=False
    )

    db.commit()
    db.refresh(subscription)
    return subscription


def get_plan_features(db: Session, school_id: int) -> dict:
    sub = (
        db.query(SchoolSubscription)
        .filter(SchoolSubscription.school_id == school_id, SchoolSubscription.status == "active")
        .order_by(SchoolSubscription.id.desc())
        .first()
    )
    if not sub:
        return {}
    return sub.plan.features if sub.plan else {}
