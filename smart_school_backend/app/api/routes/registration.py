from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.api.deps import role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.registration import RegistrationRequest
from app.models.user import User
from app.services.auth_service import validate_password_strength
from app.services.registration_service import (
    complete_registration,
    create_registration_request,
    generate_registration_key,
)

router = APIRouter(prefix="/registration", tags=["registration"])


class RegisterSchoolRequest(BaseModel):
    school_name: str = Field(min_length=2, max_length=150)
    admin_name: str = Field(min_length=2, max_length=150)
    admin_email: EmailStr
    admin_phone: str = Field(min_length=8, max_length=30)
    address: str | None = None
    plan_id: int | None = None
    payment_method: str = Field(pattern=r"^(mobile_money|bank_account)$")
    payment_details: str = Field(min_length=5)


class RegisterSchoolResponse(BaseModel):
    id: int
    message: str


class GenerateKeyRequest(BaseModel):
    request_id: int


class GenerateKeyResponse(BaseModel):
    key: str


class CompleteRegistrationRequest(BaseModel):
    key: str = Field(min_length=8)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=150)
    phone: str | None = None
    profile_photo: str | None = None


class CompleteRegistrationResponse(BaseModel):
    message: str
    school_name: str
    school_code: str


@router.post("/register-school", response_model=RegisterSchoolResponse)
def register_school(
    payload: RegisterSchoolRequest,
    db: Session = Depends(get_db),
) -> RegisterSchoolResponse:
    req = create_registration_request(
        db=db,
        school_name=payload.school_name,
        admin_name=payload.admin_name,
        admin_email=str(payload.admin_email).lower(),
        admin_phone=payload.admin_phone,
        address=payload.address,
        plan_id=payload.plan_id,
        payment_method=payload.payment_method,
        payment_details=payload.payment_details,
    )
    return RegisterSchoolResponse(
        id=req.id,
        message="Registration submitted. Check your email within 48 hours for payment quotation and verification.",
    )


@router.post("/generate-key", response_model=GenerateKeyResponse)
def generate_key(
    payload: GenerateKeyRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> GenerateKeyResponse:
    reg_key = generate_registration_key(db, payload.request_id)
    return GenerateKeyResponse(key=reg_key.key)


@router.post("/complete", response_model=CompleteRegistrationResponse)
def complete(
    payload: CompleteRegistrationRequest,
    db: Session = Depends(get_db),
) -> CompleteRegistrationResponse:
    validate_password_strength(payload.password)
    user, school = complete_registration(
        db=db,
        key=payload.key,
        email=str(payload.email).lower(),
        password=payload.password,
        full_name=payload.full_name,
        phone=payload.phone,
        profile_photo=payload.profile_photo,
    )
    return CompleteRegistrationResponse(
        message="Account created successfully. You can now login.",
        school_name=school.name,
        school_code=school.school_code,
    )


@router.get("/requests", response_model=list[RegisterSchoolResponse])
def list_requests(
    db: Session = Depends(get_db),
) -> list[RegisterSchoolResponse]:
    requests = db.query(RegistrationRequest).order_by(RegistrationRequest.created_at.desc()).all()
    return [
        RegisterSchoolResponse(id=r.id, message=r.status)
        for r in requests
    ]
