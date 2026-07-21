import csv
import io
import logging

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.user import User
from app.schemas.bulk_import import BulkImportRequest, BulkImportResult
from app.services.audit_service import log_action

logger = logging.getLogger(__name__)

EXPECTED_HEADERS = {"name", "admission_number", "class_name", "stream_name", "gender", "date_of_birth", "parent_name", "parent_phone"}


async def parse_csv_upload(file: UploadFile) -> list[dict]:
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows = []
    for row in reader:
        cleaned = {k.strip().lower().replace(" ", "_"): v.strip() for k, v in row.items() if v}
        rows.append(cleaned)
    return rows


def bulk_import_students(
    db: Session,
    payload: BulkImportRequest | None,
    rows: list[dict] | None,
    current_user: User,
) -> BulkImportResult:
    if current_user.school_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="School context required")

    school_id = current_user.school_id
    imported = 0
    skipped = 0
    errors = []

    items = []
    if payload and payload.students:
        items = [s.model_dump() for s in payload.students]
    elif rows:
        items = rows
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No student data provided")

    existing_admissions = {
        s.admission_number
        for s in db.query(Student.admission_number).filter(
            Student.school_id == school_id,
            Student.admission_number.isnot(None),
        ).all()
    }
    existing_names = {
        s.name.lower()
        for s in db.query(Student.name).filter(Student.school_id == school_id).all()
    }

    for idx, item in enumerate(items):
        name = item.get("name", "").strip()
        admission = item.get("admission_number", "").strip() if item.get("admission_number") else None

        if not name:
            errors.append({"row": idx + 1, "error": "Name is required"})
            skipped += 1
            continue

        if admission and admission in existing_admissions:
            errors.append({"row": idx + 1, "error": f"Admission number '{admission}' already exists"})
            skipped += 1
            continue

        if name.lower() in existing_names:
            errors.append({"row": idx + 1, "error": f"Student '{name}' already exists"})
            skipped += 1
            continue

        student = Student(
            school_id=school_id,
            name=name,
            admission_number=admission,
            class_name=item.get("class_name"),
            stream_name=item.get("stream_name"),
        )
        db.add(student)
        db.flush()

        if admission:
            existing_admissions.add(admission)
        existing_names.add(name.lower())
        imported += 1

    log_action(
        db,
        current_user=current_user,
        action="students.bulk_imported",
        entity_type="student",
        entity_id=0,
        after_data={"imported": imported, "skipped": skipped},
    )
    db.commit()

    return BulkImportResult(
        total=len(items),
        imported=imported,
        skipped=skipped,
        errors=errors,
    )


def bulk_import_from_csv(
    db: Session,
    rows: list[dict],
    current_user: User,
) -> BulkImportResult:
    return bulk_import_students(db, payload=None, rows=rows, current_user=current_user)
