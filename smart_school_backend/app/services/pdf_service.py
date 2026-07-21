import io
import logging
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from weasyprint import HTML

logger = logging.getLogger(__name__)


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


def _ordinal(n: int) -> str:
    if 11 <= (n % 100) <= 13:
        return f"{n}th"
    return f"{n}{['th','st','nd','rd','th','th','th','th','th','th'][n % 10]}"


def generate_report_card_pdf(
    school,
    student,
    assessments: list,
    report_card=None,
    attendance_summary: dict = None,
    conduct: str = None,
    effort: str = None,
    participation: str = None,
    class_position: int = None,
    total_students: int = None,
) -> bytes:
    subject_map = {}
    for a in assessments:
        subj = a.subject
        if subj not in subject_map:
            subject_map[subj] = {"bot": None, "mot": None, "eot": None, "remarks": None}
        atype = a.assessment_type.upper()
        if atype == "BOT":
            subject_map[subj]["bot"] = float(a.score)
        elif atype == "MOT":
            subject_map[subj]["mot"] = float(a.score)
        elif atype == "EOT":
            subject_map[subj]["eot"] = float(a.score)
        if a.remarks:
            subject_map[subj]["remarks"] = a.remarks

    subjects = []
    total_avg = 0
    for name in sorted(subject_map.keys()):
        data = subject_map[name]
        scores = [s for s in [data["bot"], data["mot"], data["eot"]] if s is not None]
        avg = round(sum(scores) / len(scores), 1) if scores else 0
        grade = _compute_grade(avg)
        total_avg += avg
        subjects.append({
            "name": name,
            "bot": data["bot"],
            "mot": data["mot"],
            "eot": data["eot"],
            "average": avg,
            "grade": grade,
            "remarks": data["remarks"],
        })

    num_subjects = len(subjects)
    overall_avg = round(total_avg / num_subjects, 1) if num_subjects > 0 else 0
    overall_grade = _compute_grade(overall_avg)

    attendance_rate = 0
    if attendance_summary:
        total_days = attendance_summary.get("total_days", 0)
        present_days = attendance_summary.get("present_days", 0)
        if total_days > 0:
            attendance_rate = round((present_days / total_days) * 100, 1)

    pos_text = _ordinal(class_position) if class_position else "N/A"
    total_text = str(total_students) if total_students else "N/A"

    from jinja2 import Template
    template_path = Path(__file__).parent.parent / "templates" / "report_card.html"
    template_html = template_path.read_text()
    tmpl = Template(template_html)

    html_content = tmpl.render(
        school_name=school.name,
        school_motto=getattr(school, "motto", "") or "",
        school_address=school.address or "",
        school_phone=school.phone or "",
        school_email=school.email or "",
        student_name=student.name,
        admission_number=student.admission_number or "N/A",
        class_name=student.class_name or "N/A",
        stream_name=student.stream_name or "",
        academic_year=report_card.academic_year if report_card else "N/A",
        term=report_card.term if report_card else "N/A",
        subjects=subjects,
        total_subjects=num_subjects,
        overall_average=overall_avg,
        overall_grade=overall_grade,
        class_position=pos_text,
        total_students=total_text,
        attendance_rate=attendance_rate,
        conduct=conduct or "",
        effort=effort or "",
        participation=participation or "",
        class_teacher_remarks=report_card.class_teacher_remarks if report_card else "",
        head_teacher_remarks=report_card.head_teacher_remarks if report_card else "",
        generated_date=datetime.now().strftime("%d %B %Y"),
    )

    pdf_bytes = HTML(string=html_content).write_pdf()
    return pdf_bytes
