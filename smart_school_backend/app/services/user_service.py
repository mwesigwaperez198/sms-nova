from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.roles import RoleId
from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate
from app.services.auth_service import validate_password_strength


def create_user(db: Session, payload: UserCreate, current_user: User) -> User:
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists",
        )

    if current_user.role_id == RoleId.SUPER_ADMIN:
        school_id = payload.school_id
        if payload.role_id == RoleId.SUPER_ADMIN:
            school_id = None
        elif school_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="school_id is required for school users",
            )
    else:
        if payload.role_id in (RoleId.SUPER_ADMIN, RoleId.ADMIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="School admins cannot create platform or admin users",
            )
        school_id = current_user.school_id

    validate_password_strength(payload.password)
    user = User(
        name=payload.name,
        email=str(payload.email).lower(),
        password_hash=hash_password(payload.password),
        role_id=payload.role_id,
        school_id=school_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
