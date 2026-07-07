from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.user import User
from app.schemas.sync import SyncChangeRead, SyncUploadRequest, SyncUploadResponse
from app.services import sync_service

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("/upload", response_model=SyncUploadResponse)
def upload_sync_changes(
    payload: SyncUploadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        role_required(RoleId.ADMIN, RoleId.TEACHER, RoleId.PARENT, RoleId.STUDENT)
    ),
):
    return sync_service.upload_changes(db, payload, current_user)


@router.get("/download", response_model=list[SyncChangeRead])
def download_sync_changes(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        role_required(RoleId.ADMIN, RoleId.TEACHER, RoleId.PARENT, RoleId.STUDENT)
    ),
):
    return sync_service.download_changes(db, current_user)
