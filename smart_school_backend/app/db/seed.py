from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.roles import ROLE_SEED_DATA, RoleId
from app.core.security import hash_password
from app.models.role import Role
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

    existing_user = (
        db.query(User)
        .filter(User.email == settings.initial_super_admin_email.lower())
        .first()
    )
    if existing_user:
        return

    db.add(
        User(
            name=settings.initial_super_admin_name,
            email=settings.initial_super_admin_email.lower(),
            password_hash=hash_password(settings.initial_super_admin_password),
            role_id=RoleId.SUPER_ADMIN,
            school_id=None,
            is_verified=True,
        )
    )
    db.commit()


def seed_foundation(db: Session) -> None:
    seed_roles(db)
    seed_initial_super_admin(db)
