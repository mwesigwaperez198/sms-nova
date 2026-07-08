import secrets
import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.registration import RegistrationKey, RegistrationRequest
from app.models.role import Role
from app.models.school import School
from app.models.user import User
from app.services.email_service import notify_registration_request, send_registration_key_email

logger = logging.getLogger(__name__)


def create_registration_request(
    db: Session,
    school_name: str,
    admin_name: str,
    admin_email: str,
    admin_phone: str,
    address: str | None,
    payment_method: str,
    payment_details: str,
) -> RegistrationRequest:
    existing = db.query(RegistrationRequest).filter(
        RegistrationRequest.admin_email == admin_email,
        RegistrationRequest.status.in_(["pending", "approved"]),
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A registration request for this email is already pending or approved.",
        )

    req = RegistrationRequest(
        school_name=school_name,
        admin_name=admin_name,
        admin_email=admin_email,
        admin_phone=admin_phone,
        address=address,
        payment_method=payment_method,
        payment_details=payment_details,
        status="pending",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    notify_registration_request(
        school_name=school_name,
        admin_name=admin_name,
        admin_email=admin_email,
        admin_phone=admin_phone,
        payment_method=payment_method,
        payment_details=payment_details,
    )

    return req


def generate_registration_key(db: Session, request_id: int) -> RegistrationKey:
    req = db.get(RegistrationRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Registration request not found")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")

    key = secrets.token_hex(16).upper()
    reg_key = RegistrationKey(
        key=key,
        school_name=req.school_name,
        admin_email=req.admin_email,
    )
    db.add(reg_key)

    req.status = "approved"
    db.add(req)
    db.commit()
    db.refresh(reg_key)

    send_registration_key_email(req.admin_email, req.school_name, key)

    return reg_key


def complete_registration(
    db: Session,
    key: str,
    email: str,
    password: str,
    full_name: str,
    phone: str | None,
) -> tuple[User, School]:
    reg_key = db.query(RegistrationKey).filter(
        RegistrationKey.key == key,
        RegistrationKey.is_used == False,
    ).first()
    if not reg_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired registration key",
        )

    if reg_key.admin_email != email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email does not match the registration key",
        )

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    existing_school = db.query(School).filter(School.name == reg_key.school_name).first()
    if existing_school:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A school with this name is already registered",
        )

    school_code = reg_key.school_name[:3].upper() + secrets.token_hex(2).upper()
    school = School(
        name=reg_key.school_name,
        school_code=school_code,
        subscription_status="trial",
    )
    db.add(school)
    db.flush()

    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        raise HTTPException(status_code=500, detail="Admin role not found in system")

    user = User(
        name=full_name,
        email=email,
        phone=phone,
        password_hash=hash_password(password),
        role_id=admin_role.id,
        school_id=school.id,
        is_active=True,
        is_verified=True,
    )
    db.add(user)

    reg_key.is_used = True
    reg_key.used_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    db.add(reg_key)

    db.commit()
    db.refresh(user)
    db.refresh(school)

    return user, school
