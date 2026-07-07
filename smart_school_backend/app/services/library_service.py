from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.library import LibraryBook, LibraryBorrow, LibraryRequest

UGANDAN_CURRICULUM_LEVELS = {
    "kindergarten": ["Nursery", "Baby Class", "Top Class"],
    "primary": ["P1", "P2", "P3", "P4", "P5", "P6", "P7"],
    "olevel": ["S1", "S2", "S3", "S4"],
    "alevel": ["S5", "S6"],
    "tertiary": ["Year 1", "Year 2", "Year 3", "Year 4"],
    "university": ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"],
}

NCDC_SUBJECT_AREAS = {
    "olevel": [
        "Mathematics", "English Language", "Biology", "Chemistry", "Physics",
        "Geography", "History", "Commerce", "Computer Studies", "Agriculture",
        "Fine Art", "Religious Education", "French", "Luganda",
    ],
    "alevel": [
        "Mathematics", "Further Mathematics", "Physics", "Chemistry", "Biology",
        "Economics", "Geography", "History", "Literature in English",
        "Computer Science", "Entrepreneurship", "Agriculture",
    ],
    "primary": [
        "Mathematics", "English", "Science", "Social Studies", "Religious Education",
        "Local Languages", "Physical Education",
    ],
}


def list_books(
    db: Session,
    school_id: int,
    curriculum_level: str | None = None,
    subject_area: str | None = None,
    education_tier: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[LibraryBook]:
    query = db.query(LibraryBook).filter(
        LibraryBook.school_id == school_id,
        LibraryBook.is_active == True,
    )

    if curriculum_level:
        query = query.filter(LibraryBook.curriculum_level == curriculum_level)
    if subject_area:
        query = query.filter(LibraryBook.subject_area == subject_area)
    if education_tier:
        query = query.filter(LibraryBook.education_tier == education_tier)
    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            LibraryBook.title.ilike(term) | LibraryBook.author.ilike(term)
        )

    return query.order_by(LibraryBook.title).offset(skip).limit(limit).all()


def add_book(db: Session, school_id: int, added_by_id: int, data: dict) -> LibraryBook:
    if data.get("isbn"):
        collision = db.query(LibraryBook).filter(
            LibraryBook.school_id == school_id,
            LibraryBook.isbn == data["isbn"],
        ).first()
        if collision:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A book with this ISBN already exists in this school's library",
            )

    book = LibraryBook(school_id=school_id, added_by_id=added_by_id, **data)
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


def issue_book(
    db: Session,
    school_id: int,
    book_id: int,
    borrower_id: int,
    issued_by_id: int,
    due_date,
) -> LibraryBorrow:
    book = db.query(LibraryBook).filter(
        LibraryBook.id == book_id,
        LibraryBook.school_id == school_id,
        LibraryBook.is_active == True,
    ).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    if book.available_copies < 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No copies available for borrowing",
        )

    active_borrow = db.query(LibraryBorrow).filter(
        LibraryBorrow.book_id == book_id,
        LibraryBorrow.borrower_id == borrower_id,
        LibraryBorrow.status == "active",
    ).first()
    if active_borrow:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This user already has an active borrow record for this book",
        )

    record = LibraryBorrow(
        school_id=school_id,
        book_id=book_id,
        borrower_id=borrower_id,
        issued_by_id=issued_by_id,
        due_date=due_date,
        status="active",
    )
    db.add(record)
    book.available_copies -= 1
    db.commit()
    db.refresh(record)
    return record


def return_book(
    db: Session,
    school_id: int,
    borrow_id: int,
) -> LibraryBorrow:
    from datetime import datetime, timezone

    record = db.query(LibraryBorrow).filter(
        LibraryBorrow.id == borrow_id,
        LibraryBorrow.school_id == school_id,
    ).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrow record not found")
    if record.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This book has already been returned",
        )

    record.status = "returned"
    record.returned_at = datetime.now(timezone.utc)
    record.book.available_copies += 1
    db.commit()
    db.refresh(record)
    return record


def submit_book_request(
    db: Session,
    school_id: int,
    requested_by_id: int,
    title: str,
    subject: str | None,
    reason: str | None,
    priority: str = "normal",
) -> LibraryRequest:
    req = LibraryRequest(
        school_id=school_id,
        requested_by_id=requested_by_id,
        title=title,
        subject=subject,
        reason=reason,
        priority=priority,
        status="pending",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


def list_book_requests(
    db: Session,
    school_id: int,
    status_filter: str | None = None,
) -> list[LibraryRequest]:
    query = db.query(LibraryRequest).filter(LibraryRequest.school_id == school_id)
    if status_filter:
        query = query.filter(LibraryRequest.status == status_filter)
    return query.order_by(LibraryRequest.created_at.desc()).all()


def get_curriculum_map() -> dict:
    return {
        "levels": UGANDAN_CURRICULUM_LEVELS,
        "ncdc_subjects": NCDC_SUBJECT_AREAS,
    }
