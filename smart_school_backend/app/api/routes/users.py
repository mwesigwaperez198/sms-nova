from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserRead
from app.services.user_service import create_user

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserRead)
def create_school_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN, RoleId.ADMIN)),
) -> User:
    return create_user(db, payload, current_user)
