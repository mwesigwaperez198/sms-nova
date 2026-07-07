from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.core.security import decode_refresh_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    AccessTokenResponse,
    LoginRequest,
    MessageResponse,
    ProfileResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.services.auth_service import (
    authenticate_user,
    build_refresh_token,
    build_user_token,
    reset_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.rate_limit_auth)
def login(
    request: Request,
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    user = authenticate_user(db, str(payload.email).lower(), payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(
        access_token=build_user_token(user),
        refresh_token=build_refresh_token(user),
        user=user,
    )


@router.post("/refresh-token", response_model=AccessTokenResponse)
@limiter.limit(settings.rate_limit_auth)
def refresh_token(
    request: Request,
    payload: RefreshTokenRequest,
    db: Session = Depends(get_db),
) -> AccessTokenResponse:
    token_payload = decode_refresh_token(payload.refresh_token)
    if not token_payload or not token_payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(token_payload["sub"])
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token subject",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AccessTokenResponse(access_token=build_user_token(user))


@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit(settings.rate_limit_auth)
def reset_password_route(
    request: Request,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    reset_password(db, current_user, payload.current_password, payload.new_password)
    return MessageResponse(detail="Password updated")


@router.get("/profile", response_model=ProfileResponse)
def profile(current_user: User = Depends(get_current_user)) -> ProfileResponse:
    return ProfileResponse(user=current_user)
