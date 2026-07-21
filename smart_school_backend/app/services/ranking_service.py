from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.assessment import Assessment
from app.models.student import Student


def compute_class_positions(
    db: Session,
    class_name: str,
    academic_year: str,
    term: str,
    school_id: int,
) -> list[dict]:
    students = (
        db.query(Student)
        .filter(
            Student.school_id == school_id,
            Student.class_name == class_name,
            Student.is_active == True,
        )
        .order_by(Student.name)
        .all()
    )

    results = []
    for student in students:
        assessments = (
            db.query(Assessment)
            .filter(
                Assessment.student_id == student.id,
                Assessment.school_id == school_id,
                Assessment.academic_year == academic_year,
                Assessment.term == term,
            )
            .all()
        )

        if not assessments:
            results.append({
                "student_id": student.id,
                "student_name": student.name,
                "average": 0,
                "grade": "N/A",
                "position": None,
            })
            continue

        total = sum(float(a.score) for a in assessments)
        avg = round(total / len(assessments), 1)
        grade = _compute_grade(avg)

        results.append({
            "student_id": student.id,
            "student_name": student.name,
            "average": avg,
            "grade": grade,
            "position": None,
        })

    ranked = sorted(results, key=lambda x: x["average"], reverse=True)
    pos = 1
    for i, r in enumerate(ranked):
        if i > 0 and r["average"] < ranked[i - 1]["average"]:
            pos = i + 1
        r["position"] = pos

    return ranked


def _compute_grade(score: float) -> str:
    if score >= 80:
        return "D1"
    if score >= 70:
        return "D2"
    if score >= 65:
        return "C3"
    if score >= 60:
        return "C4"
    if score >= 55:
        return "C5"
    if score >= 50:
        return "C6"
    if score >= 45:
        return "P7"
    if score >= 40:
        return "P8"
    return "F9"
