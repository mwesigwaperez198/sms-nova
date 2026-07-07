from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.roles import RoleId
from app.models.attendance import Attendance
from app.models.fees import Invoice, Payment
from app.models.notification import Notification
from app.models.report_card import ReportCard
from app.models.student import Student
from app.models.user import User


def get_admin_overview(db: Session, school_id: int) -> dict:
    total_invoiced = Decimal(
        db.query(func.coalesce(func.sum(Invoice.amount), 0))
        .filter(Invoice.school_id == school_id)
        .scalar()
    )
    total_paid = Decimal(
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.school_id == school_id, Payment.status == "confirmed")
        .scalar()
    )

    return {
        "school_id": school_id,
        "users_count": db.query(func.count(User.id)).filter(User.school_id == school_id).scalar(),
        "students_count": db.query(func.count(Student.id)).filter(Student.school_id == school_id).scalar(),
        "teachers_count": db.query(func.count(User.id))
        .filter(User.school_id == school_id, User.role_id == RoleId.TEACHER)
        .scalar(),
        "parents_count": db.query(func.count(User.id))
        .filter(User.school_id == school_id, User.role_id == RoleId.PARENT)
        .scalar(),
        "total_invoiced": str(total_invoiced),
        "total_paid": str(total_paid),
        "outstanding_balance": str(total_invoiced - total_paid),
        "attendance_records_count": db.query(func.count(Attendance.id))
        .filter(Attendance.school_id == school_id)
        .scalar(),
        "report_cards_count": db.query(func.count(ReportCard.id))
        .filter(ReportCard.school_id == school_id)
        .scalar(),
        "notifications_count": db.query(func.count(Notification.id))
        .filter(Notification.school_id == school_id)
        .scalar(),
    }


def get_analytics(db: Session, school_id: int) -> dict:
    attendance_by_status = {
        status: count
        for status, count in db.query(Attendance.status, func.count(Attendance.id))
        .filter(Attendance.school_id == school_id)
        .group_by(Attendance.status)
        .all()
    }
    report_cards_by_status = {
        status: count
        for status, count in db.query(ReportCard.status, func.count(ReportCard.id))
        .filter(ReportCard.school_id == school_id)
        .group_by(ReportCard.status)
        .all()
    }
    invoice_by_status = {
        status: count
        for status, count in db.query(Invoice.status, func.count(Invoice.id))
        .filter(Invoice.school_id == school_id)
        .group_by(Invoice.status)
        .all()
    }
    return {
        "school_id": school_id,
        "fees": {"invoice_status": invoice_by_status},
        "attendance": {"status": attendance_by_status},
        "report_cards": {"status": report_cards_by_status},
    }
