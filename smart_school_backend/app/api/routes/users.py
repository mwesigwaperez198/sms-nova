from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, role_required
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
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN, RoleId.ADMIN, RoleId.HEADTEACHER)),
) -> User:
    return create_user(db, payload, current_user)


@router.get("/", dependencies=[Depends(role_required(RoleId.SUPER_ADMIN))])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role_id": u.role_id,
            "is_active": u.is_active,
        }
        for u in users
    ]


@router.get("/{user_id}", dependencies=[Depends(role_required(RoleId.SUPER_ADMIN, RoleId.ADMIN))])
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")
    if current_user.role_id != RoleId.SUPER_ADMIN and u.school_id != current_user.school_id:
        raise HTTPException(404, "User not found")
    return {
        "id": u.id,
        "email": u.email,
        "name": u.name,
        "role_id": u.role_id,
        "is_active": u.is_active,
    }


@router.patch("/{user_id}", dependencies=[Depends(role_required(RoleId.SUPER_ADMIN, RoleId.ADMIN))])
def update_user(user_id: int, name: str = None, is_active: bool = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")
    if current_user.role_id != RoleId.SUPER_ADMIN and u.school_id != current_user.school_id:
        raise HTTPException(404, "User not found")
    if name is not None:
        u.name = name
    if is_active is not None:
        u.is_active = is_active
    db.commit()
    return {"msg": "updated"}


@router.delete("/{user_id}", dependencies=[Depends(role_required(RoleId.SUPER_ADMIN))])
def delete_user(user_id: int, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")
    u.is_active = False
    db.commit()
    return {"msg": "deactivated"}
