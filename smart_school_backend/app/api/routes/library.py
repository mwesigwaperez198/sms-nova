from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.user import User
from app.schemas.library import (
    LibraryBookCreate,
    LibraryBookRead,
    LibraryBorrowCreate,
    LibraryBorrowRead,
    LibraryRequestCreate,
    LibraryRequestRead,
)
from app.services.library_service import (
    add_book,
    get_curriculum_map,
    issue_book,
    list_book_requests,
    list_books,
    return_book,
    submit_book_request,
)

router = APIRouter(prefix="/library", tags=["library"])


@router.get("/curriculum-map")
def curriculum_map() -> dict:
    return get_curriculum_map()


@router.get("/books", response_model=list[LibraryBookRead])
def get_books(
    curriculum_level: str | None = Query(None),
    subject_area: str | None = Query(None),
    education_tier: str | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LibraryBookRead]:
    return list_books(
        db,
        school_id=current_user.school_id,
        curriculum_level=curriculum_level,
        subject_area=subject_area,
        education_tier=education_tier,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.post("/books", response_model=LibraryBookRead, status_code=201)
def create_book(
    payload: LibraryBookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.LIBRARIAN, RoleId.ADMIN)),
) -> LibraryBookRead:
    return add_book(db, current_user.school_id, current_user.id, payload.model_dump())


@router.post("/borrows", response_model=LibraryBorrowRead, status_code=201)
def borrow_book(
    payload: LibraryBorrowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.LIBRARIAN, RoleId.ADMIN)),
) -> LibraryBorrowRead:
    return issue_book(
        db,
        school_id=current_user.school_id,
        book_id=payload.book_id,
        borrower_id=payload.borrower_id,
        issued_by_id=current_user.id,
        due_date=payload.due_date,
    )


@router.patch("/borrows/{borrow_id}/return", response_model=LibraryBorrowRead)
def return_borrowed_book(
    borrow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.LIBRARIAN, RoleId.ADMIN)),
) -> LibraryBorrowRead:
    return return_book(db, school_id=current_user.school_id, borrow_id=borrow_id)


@router.post("/requests", response_model=LibraryRequestRead, status_code=201)
def request_book(
    payload: LibraryRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LibraryRequestRead:
    return submit_book_request(
        db,
        school_id=current_user.school_id,
        requested_by_id=current_user.id,
        title=payload.title,
        subject=payload.subject,
        reason=payload.reason,
        priority=payload.priority,
    )


@router.get("/requests", response_model=list[LibraryRequestRead])
def get_book_requests(
    status_filter: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.LIBRARIAN, RoleId.ADMIN)),
) -> list[LibraryRequestRead]:
    return list_book_requests(db, school_id=current_user.school_id, status_filter=status_filter)


@router.get("/books/{book_id}", response_model=LibraryBookRead)
def get_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.library import LibraryBook
    book = db.query(LibraryBook).filter(LibraryBook.id == book_id).first()
    if not book:
        from fastapi import HTTPException
        raise HTTPException(404, "Book not found")
    if current_user.school_id and book.school_id != current_user.school_id:
        from fastapi import HTTPException
        raise HTTPException(404, "Book not found")
    return book


@router.patch("/books/{book_id}", response_model=LibraryBookRead)
def update_book(
    book_id: int,
    title: str | None = None,
    author: str | None = None,
    shelf_location: str | None = None,
    total_copies: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.LIBRARIAN, RoleId.ADMIN)),
):
    from app.models.library import LibraryBook
    book = db.query(LibraryBook).filter(LibraryBook.id == book_id).first()
    if not book:
        from fastapi import HTTPException
        raise HTTPException(404, "Book not found")
    if current_user.school_id and book.school_id != current_user.school_id:
        from fastapi import HTTPException
        raise HTTPException(404, "Book not found")
    if title:
        book.title = title
    if author:
        book.author = author
    if shelf_location:
        book.shelf_location = shelf_location
    if total_copies is not None:
        book.total_copies = total_copies
    db.commit()
    db.refresh(book)
    return book


@router.delete("/books/{book_id}")
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.LIBRARIAN, RoleId.ADMIN)),
):
    from app.models.library import LibraryBook
    from fastapi import HTTPException
    book = db.query(LibraryBook).filter(LibraryBook.id == book_id).first()
    if not book:
        raise HTTPException(404, "Book not found")
    db.delete(book)
    db.commit()
    return {"msg": "deleted"}
