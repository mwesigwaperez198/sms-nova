from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.user import User
from app.services import ranking_service

router = APIRouter(prefix="/ranking", tags=["ranking"])


@router.get("/class/{class_name}")
def get_class_ranking(
    class_name: str,
    academic_year: str = Query(...),
    term: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.TEACHER, RoleId.ADMIN, RoleId.HEADTEACHER)),
):
    return ranking_service.compute_class_positions(
        db, class_name, academic_year, term, current_user.school_id
    )
