from pydantic import BaseModel

from app.schemas.school import SchoolCreate, SchoolRead
from app.schemas.user import SchoolAdminCreate, UserRead


class SchoolOnboardingCreate(BaseModel):
    school: SchoolCreate
    admin: SchoolAdminCreate


class SchoolOnboardingRead(BaseModel):
    school: SchoolRead
    admin: UserRead
