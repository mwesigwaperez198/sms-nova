from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.subject import SchoolClass, Subject
from app.models.user import User
from app.schemas.subject import ClassCreate, SubjectCreate
from app.services.audit_service import log_action


def create_subject(db: Session, payload: SubjectCreate, current_user: User) -> Subject:
    existing = (
        db.query(Subject)
        .filter(Subject.school_id == current_user.school_id, Subject.name == payload.name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Subject already exists")

    subject = Subject(
        school_id=current_user.school_id,
        name=payload.name,
        code=payload.code,
        category=payload.category,
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


def list_subjects(db: Session, school_id: int) -> list[Subject]:
    return db.query(Subject).filter(Subject.school_id == school_id, Subject.is_active == True).order_by(Subject.name).all()


def delete_subject(db: Session, subject_id: int, school_id: int) -> None:
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.school_id == school_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    subject.is_active = False
    db.commit()


def create_class(db: Session, payload: ClassCreate, current_user: User) -> SchoolClass:
    existing = (
        db.query(SchoolClass)
        .filter(SchoolClass.school_id == current_user.school_id, SchoolClass.name == payload.name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Class already exists")

    cls = SchoolClass(
        school_id=current_user.school_id,
        name=payload.name,
        section=payload.section,
        capacity=payload.capacity,
        class_teacher_id=payload.class_teacher_id,
    )
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls


def list_classes(db: Session, school_id: int) -> list[SchoolClass]:
    return db.query(SchoolClass).filter(SchoolClass.school_id == school_id, SchoolClass.is_active == True).order_by(SchoolClass.name).all()


def delete_class(db: Session, class_id: int, school_id: int) -> None:
    cls = db.query(SchoolClass).filter(SchoolClass.id == class_id, SchoolClass.school_id == school_id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    cls.is_active = False
    db.commit()
