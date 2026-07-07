from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.user import User
from app.schemas.onboarding import SchoolOnboardingCreate, SchoolOnboardingRead
from app.services.onboarding_service import onboard_school

router = APIRouter(prefix="/platform", tags=["platform"])


@router.post("/schools", response_model=SchoolOnboardingRead)
def create_school_with_admin(
    payload: SchoolOnboardingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> SchoolOnboardingRead:
    school, admin = onboard_school(db, payload)
    return SchoolOnboardingRead(school=school, admin=admin)
