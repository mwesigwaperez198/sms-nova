import logging
import random
import re
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.user import User

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def _is_locked(user: User) -> bool:
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        return True
    return False


def _reset_lockout(db: Session, user: User) -> None:
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()


def _record_failed_attempt(db: Session, user: User) -> None:
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
        user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
    db.add(user)
    db.commit()


def validate_password_strength(password: str) -> None:
    """Enforce: min 8 chars, 1 uppercase, 1 lowercase, 1 digit."""
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters",
        )
    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain at least one uppercase letter",
        )
    if not re.search(r"[a-z]", password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain at least one lowercase letter",
        )
    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain at least one digit",
        )


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email).first()
    # Return None for non-existent users without leaking info
    if not user or not user.is_active:
        return None

    if _is_locked(user):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account locked due to too many failed attempts. Try again in {LOCKOUT_MINUTES} minutes.",
        )

    if not verify_password(password, user.password_hash):
        _record_failed_attempt(db, user)
        return None

    _reset_lockout(db, user)
    db.refresh(user)
    return user


def _token_claims(user: User) -> dict[str, int | str | None]:
    return {
        "role_id": user.role_id,
        "school_id": user.school_id,
        "email": user.email,
    }


def build_user_token(user: User) -> str:
    return create_access_token(
        subject=str(user.id),
        claims=_token_claims(user),
    )


def build_refresh_token(user: User) -> str:
    return create_refresh_token(
        subject=str(user.id),
        claims=_token_claims(user),
    )


def request_password_reset(db: Session, email: str) -> str:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return "If the account exists, a reset code has been sent."
    code = str(random.randint(100000, 999999))
    user.reset_code = code
    user.reset_code_expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.add(user)
    db.commit()
    logger.info("Password reset code for %s: %s", email, code)
    return "Reset code sent to your registered email/phone."


def verify_reset_code(db: Session, email: str, code: str, new_password: str) -> str:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request")
    if user.reset_code != code or not user.reset_code_expires:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")
    if user.reset_code_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset code expired. Request a new one.")
    validate_password_strength(new_password)
    user.password_hash = hash_password(new_password)
    user.reset_code = None
    user.reset_code_expires = None
    user.failed_login_attempts = 0
    user.locked_until = None
    db.add(user)
    db.commit()
    logger.info("Password reset completed for %s", email)
    return "Password reset successful."


def reset_password(
    db: Session,
    user: User,
    current_password: str,
    new_password: str,
) -> None:
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    validate_password_strength(new_password)
    user.password_hash = hash_password(new_password)
    db.add(user)
    db.commit()
