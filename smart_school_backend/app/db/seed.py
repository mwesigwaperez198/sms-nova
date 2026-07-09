from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.roles import ROLE_SEED_DATA, RoleId
from app.core.security import hash_password
from app.models.role import Role
from app.models.subscription import SubscriptionPlan
from app.models.user import User


def seed_roles(db: Session) -> None:
    for role_data in ROLE_SEED_DATA:
        role = db.get(Role, int(role_data["id"]))
        if role:
            role.name = role_data["name"]
            role.description = role_data["description"]
            continue

        db.add(
            Role(
                id=int(role_data["id"]),
                name=role_data["name"],
                description=role_data["description"],
            )
        )
    db.commit()


def seed_initial_super_admin(db: Session) -> None:
    settings = get_settings()
    if not settings.initial_super_admin_email or not settings.initial_super_admin_password:
        return

    existing = db.query(User).filter(
        User.email == settings.initial_super_admin_email.lower()
    ).first()
    if existing:
        return

    user = User(
        name=settings.initial_super_admin_name,
        email=settings.initial_super_admin_email.lower(),
        password_hash=hash_password(settings.initial_super_admin_password),
        role_id=RoleId.SUPER_ADMIN,
        is_verified=True,
        is_active=True,
    )
    db.add(user)
    db.commit()


def seed_subscription_plans(db: Session) -> None:
    plans = [
        {"name": "1 Month", "price": 50000, "duration_days": 30, "max_students": 100, "max_staff": 20,
         "features": {"attendance": True, "fees": True, "reports": True, "sms": True}},
        {"name": "6 Months", "price": 250000, "duration_days": 180, "max_students": 300, "max_staff": 50,
         "features": {"attendance": True, "fees": True, "reports": True, "sms": True, "library": True}},
        {"name": "1 Year", "price": 450000, "duration_days": 365, "max_students": 500, "max_staff": 100,
         "features": {"attendance": True, "fees": True, "reports": True, "sms": True, "library": True, "bulk_sms": True}},
        {"name": "5 Years", "price": 1500000, "duration_days": 1825, "max_students": 1000, "max_staff": 200,
         "features": {"attendance": True, "fees": True, "reports": True, "sms": True, "library": True, "bulk_sms": True, "api_access": True}},
        {"name": "Lifetime", "price": 5000000, "duration_days": 99999, "max_students": 5000, "max_staff": 500,
         "features": {"attendance": True, "fees": True, "reports": True, "sms": True, "library": True, "bulk_sms": True, "api_access": True, "priority_support": True}},
    ]
    for p in plans:
        existing = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == p["name"]).first()
        if existing:
            continue
        db.add(SubscriptionPlan(**p))
    db.commit()


def seed_foundation(db: Session) -> None:
    seed_roles(db)
    seed_initial_super_admin(db)
    seed_subscription_plans(db)
