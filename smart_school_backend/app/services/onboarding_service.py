from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.roles import RoleId
from app.core.security import hash_password
from app.models.fees import FeeCategory
from app.models.school import School
from app.models.user import User
from app.schemas.onboarding import SchoolOnboardingCreate


DEFAULT_FEE_CATEGORIES = ("tuition", "boarding", "transport", "exams", "uniform")


def onboard_school(
    db: Session,
    payload: SchoolOnboardingCreate,
) -> tuple[School, User]:
    existing_school = (
        db.query(School)
        .filter(School.school_code == payload.school.school_code.upper())
        .first()
    )
    if existing_school:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="School code already exists",
        )

    existing_admin = db.query(User).filter(User.email == payload.admin.email).first()
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Admin email already exists",
        )

    settings = get_settings()
    school = School(
        name=payload.school.name,
        school_code=payload.school.school_code.upper(),
        address=payload.school.address,
        phone=payload.school.phone,
        email=str(payload.school.email) if payload.school.email else None,
        country=payload.school.country or settings.default_country,
        currency_code=(payload.school.currency_code or settings.default_currency_code).upper(),
        timezone=payload.school.timezone or settings.default_timezone,
        subscription_status=payload.school.subscription_status,
    )

    db.add(school)
    db.flush()

    for category_name in DEFAULT_FEE_CATEGORIES:
        db.add(FeeCategory(school_id=school.id, name=category_name))

    admin = User(
        name=payload.admin.name,
        email=str(payload.admin.email).lower(),
        password_hash=hash_password(payload.admin.password),
        role_id=RoleId.ADMIN,
        school_id=school.id,
    )
    db.add(admin)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(school)
    db.refresh(admin)
    return school, admin
