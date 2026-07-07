from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.subscription import SchoolSubscription, SubscriptionPlan
from app.models.user import User
from app.schemas.subscription import (
    ActivateKeyRequest,
    ActivateKeyResponse,
    GenerateKeyRequest,
    GenerateKeyResponse,
    SchoolSubscriptionRead,
    SubscriptionPlanRead,
    UpdateSubscriptionStatusRequest,
)
from app.services.subscription_service import activate_product_key, generate_product_key

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("/plans", response_model=list[SubscriptionPlanRead])
def list_plans(db: Session = Depends(get_db)) -> list[SubscriptionPlanRead]:
    return db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active == True).all()


@router.post("/keys/generate", response_model=GenerateKeyResponse)
def generate_key(
    payload: GenerateKeyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> GenerateKeyResponse:
    raw_key = generate_product_key(
        db,
        school_id=payload.school_id,
        plan_id=payload.plan_id,
        generated_by_id=current_user.id,
    )
    expires_at = datetime.now(timezone.utc)
    from datetime import timedelta
    expires_at = expires_at + timedelta(hours=72)
    return GenerateKeyResponse(
        product_key=raw_key,
        expires_at=expires_at,
        message="Product key generated. Dispatch via SMS or email to the school admin.",
    )


@router.post("/activate", response_model=ActivateKeyResponse)
def activate_key(
    payload: ActivateKeyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActivateKeyResponse:
    if current_user.school_id != payload.school_id and current_user.role_id != RoleId.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only activate a key for your own school",
        )

    subscription = activate_product_key(
        db,
        raw_key=payload.product_key,
        school_id=payload.school_id,
        activating_user_id=current_user.id,
    )
    return ActivateKeyResponse(
        message="School subscription activated successfully.",
        subscription=subscription,
    )


@router.get("/schools/{school_id}", response_model=list[SchoolSubscriptionRead])
def school_subscriptions(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN, RoleId.ADMIN)),
) -> list[SchoolSubscriptionRead]:
    if current_user.role_id != RoleId.SUPER_ADMIN and current_user.school_id != school_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return (
        db.query(SchoolSubscription)
        .filter(SchoolSubscription.school_id == school_id)
        .order_by(SchoolSubscription.id.desc())
        .all()
    )


@router.patch("/schools/{school_id}/status", response_model=SchoolSubscriptionRead)
def override_subscription_status(
    school_id: int,
    payload: UpdateSubscriptionStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> SchoolSubscriptionRead:
    sub = (
        db.query(SchoolSubscription)
        .filter(SchoolSubscription.school_id == school_id)
        .order_by(SchoolSubscription.id.desc())
        .first()
    )
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No subscription found for this school")

    sub.status = payload.status
    from app.models.school import School
    db.query(School).filter(School.id == school_id).update(
        {"subscription_status": payload.status}, synchronize_session=False
    )
    db.commit()
    db.refresh(sub)
    return sub
