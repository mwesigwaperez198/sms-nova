from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.user import User
from app.schemas.subject import ClassCreate, ClassRead, SubjectCreate, SubjectRead
from app.services import subject_service

router = APIRouter(prefix="/academics", tags=["academics"])


@router.post("/subjects", response_model=SubjectRead)
def add_subject(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.ICT_ADMIN)),
):
    return subject_service.create_subject(db, payload, current_user)


@router.get("/subjects", response_model=list[SubjectRead])
def list_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.TEACHER, RoleId.ICT_ADMIN)),
):
    return subject_service.list_subjects(db, current_user.school_id)


@router.delete("/subjects/{subject_id}")
def remove_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.ICT_ADMIN)),
):
    subject_service.delete_subject(db, subject_id, current_user.school_id)
    return {"msg": "Subject deactivated"}


@router.post("/classes", response_model=ClassRead)
def add_class(
    payload: ClassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.ICT_ADMIN)),
):
    return subject_service.create_class(db, payload, current_user)


@router.get("/classes", response_model=list[ClassRead])
def list_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.TEACHER, RoleId.ICT_ADMIN)),
):
    return subject_service.list_classes(db, current_user.school_id)


@router.delete("/classes/{class_id}")
def remove_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.ICT_ADMIN)),
):
    subject_service.delete_class(db, class_id, current_user.school_id)
    return {"msg": "Class deactivated"}
