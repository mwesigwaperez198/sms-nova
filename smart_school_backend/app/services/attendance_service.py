from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.roles import RoleId
from app.models.attendance import Attendance
from app.models.notification import Notification
from app.models.student import Student, StudentGuardian
from app.models.user import User
from app.schemas.attendance import AttendanceMarkCreate, AttendanceUpdate
from app.services.access_service import ensure_student_access, get_student_in_school
from app.services.audit_service import log_action


def _queue_absence_notifications(
    db: Session,
    student: Student,
    attendance: Attendance,
    sender: User,
) -> None:
    guardian_ids = (
        db.query(StudentGuardian.guardian_id)
        .filter(StudentGuardian.student_id == student.id)
        .all()
    )
    for guardian_id_row in guardian_ids:
        guardian_id = guardian_id_row[0]
        db.add(
            Notification(
                school_id=student.school_id,
                user_id=guardian_id,
                sender_id=sender.id,
                type="attendance_absent",
                channel="in_app",
                title="Attendance alert",
                message=f"{student.name} was marked absent on {attendance.attendance_date}.",
                status="queued",
            )
        )


def mark_attendance(
    db: Session,
    payload: AttendanceMarkCreate,
    current_user: User,
) -> list[Attendance]:
    records: list[Attendance] = []
    for entry in payload.records:
        student = get_student_in_school(db, entry.student_id, current_user.school_id)
        attendance = (
            db.query(Attendance)
            .filter(
                Attendance.student_id == student.id,
                Attendance.attendance_date == payload.attendance_date,
            )
            .first()
        )
        if attendance:
            before = {"status": attendance.status, "remarks": attendance.remarks}
            attendance.status = entry.status
            attendance.remarks = entry.remarks
            attendance.teacher_id = current_user.id
            log_action(
                db,
                current_user=current_user,
                action="attendance.updated",
                entity_type="attendance",
                entity_id=attendance.id,
                before_data=before,
                after_data={"status": attendance.status, "remarks": attendance.remarks},
            )
        else:
            attendance = Attendance(
                student_id=student.id,
                school_id=student.school_id,
                attendance_date=payload.attendance_date,
                status=entry.status,
                teacher_id=current_user.id,
                remarks=entry.remarks,
            )
            db.add(attendance)
            db.flush()
            log_action(
                db,
                current_user=current_user,
                action="attendance.created",
                entity_type="attendance",
                entity_id=attendance.id,
                after_data={"student_id": student.id, "status": attendance.status},
            )

        if entry.status == "absent":
            _queue_absence_notifications(db, student, attendance, current_user)
        records.append(attendance)

    db.commit()
    for record in records:
        db.refresh(record)
    return records


def get_student_attendance(
    db: Session,
    student_id: int,
    current_user: User,
) -> list[Attendance]:
    student = ensure_student_access(db, student_id, current_user)
    return (
        db.query(Attendance)
        .filter(Attendance.student_id == student.id, Attendance.school_id == student.school_id)
        .order_by(Attendance.attendance_date.desc())
        .all()
    )


def get_class_attendance(
    db: Session,
    class_name: str,
    current_user: User,
) -> list[Attendance]:
    return (
        db.query(Attendance)
        .join(Student, Attendance.student_id == Student.id)
        .filter(
            Attendance.school_id == current_user.school_id,
            Student.class_name == class_name,
        )
        .order_by(Attendance.attendance_date.desc(), Student.name.asc())
        .all()
    )


def update_attendance(
    db: Session,
    attendance_id: int,
    payload: AttendanceUpdate,
    current_user: User,
) -> Attendance:
    attendance = (
        db.query(Attendance)
        .filter(Attendance.id == attendance_id, Attendance.school_id == current_user.school_id)
        .first()
    )
    if not attendance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance not found")

    before = {
        "status": attendance.status,
        "remarks": attendance.remarks,
        "edit_reason": attendance.edit_reason,
    }
    attendance.status = payload.status
    attendance.remarks = payload.remarks
    attendance.edit_reason = payload.edit_reason
    log_action(
        db,
        current_user=current_user,
        action="attendance.admin_edited",
        entity_type="attendance",
        entity_id=attendance.id,
        before_data=before,
        after_data={
            "status": attendance.status,
            "remarks": attendance.remarks,
            "edit_reason": attendance.edit_reason,
        },
    )
    db.commit()
    db.refresh(attendance)
    return attendance
