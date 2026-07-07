from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.roles import RoleId
from app.models.student import Student, StudentGuardian
from app.models.user import User
from app.schemas.student import GuardianLinkCreate, StudentCreate


def create_student(db: Session, payload: StudentCreate, current_user: User) -> Student:
    if current_user.school_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="School context is required",
        )

    student = Student(
        school_id=current_user.school_id,
        user_id=payload.user_id,
        admission_number=payload.admission_number,
        name=payload.name,
        class_name=payload.class_name,
        stream_name=payload.stream_name,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def link_guardian(
    db: Session,
    student_id: int,
    payload: GuardianLinkCreate,
    current_user: User,
) -> StudentGuardian:
    student = (
        db.query(Student)
        .filter(Student.id == student_id, Student.school_id == current_user.school_id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    guardian = (
        db.query(User)
        .filter(
            User.id == payload.guardian_id,
            User.school_id == current_user.school_id,
            User.role_id == RoleId.PARENT,
        )
        .first()
    )
    if not guardian:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent not found")

    existing_link = (
        db.query(StudentGuardian)
        .filter(
            StudentGuardian.student_id == student.id,
            StudentGuardian.guardian_id == guardian.id,
        )
        .first()
    )
    if existing_link:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Guardian is already linked to this student",
        )

    link = StudentGuardian(
        student_id=student.id,
        guardian_id=guardian.id,
        relationship=payload.relationship,
        is_primary=payload.is_primary,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link
