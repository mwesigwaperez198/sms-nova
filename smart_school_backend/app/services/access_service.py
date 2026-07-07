from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.roles import RoleId
from app.models.student import Student, StudentGuardian
from app.models.user import User


def get_student_in_school(db: Session, student_id: int, school_id: int | None) -> Student:
    student = (
        db.query(Student)
        .filter(Student.id == student_id, Student.school_id == school_id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


def user_can_access_student(db: Session, current_user: User, student: Student) -> bool:
    if current_user.school_id != student.school_id:
        return False

    if current_user.role_id == RoleId.ADMIN:
        return True

    if current_user.role_id == RoleId.PARENT:
        return (
            db.query(StudentGuardian)
            .filter(
                StudentGuardian.student_id == student.id,
                StudentGuardian.guardian_id == current_user.id,
            )
            .first()
            is not None
        )

    if current_user.role_id == RoleId.STUDENT:
        return student.user_id == current_user.id

    return False


def ensure_student_access(db: Session, student_id: int, current_user: User) -> Student:
    student = get_student_in_school(db, student_id, current_user.school_id)
    if not user_can_access_student(db, current_user, student):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this student",
        )
    return student


def ensure_school_user(db: Session, user_id: int, current_user: User) -> User:
    user = (
        db.query(User)
        .filter(User.id == user_id, User.school_id == current_user.school_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
