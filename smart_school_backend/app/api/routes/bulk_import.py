from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from app.api.deps import role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.user import User
from app.schemas.bulk_import import BulkImportRequest, BulkImportResult
from app.services import bulk_import_service

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/students", response_model=BulkImportResult)
def bulk_import_json(
    payload: BulkImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.SECRETARY)),
):
    return bulk_import_service.bulk_import_students(db, payload=payload, rows=None, current_user=current_user)


@router.post("/students/csv", response_model=BulkImportResult)
async def bulk_import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.SECRETARY)),
):
    if not file.filename.endswith(".csv"):
        from fastapi import HTTPException
        raise HTTPException(400, "Only CSV files are supported")
    rows = await bulk_import_service.parse_csv_upload(file)
    return bulk_import_service.bulk_import_from_csv(db, rows=rows, current_user=current_user)
