from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.roles import RoleId
from app.models.notification import Notification
from app.models.student import Student, StudentGuardian
from app.models.user import User
from app.schemas.notification import NotificationCreate, RoleNotificationPayload, SmsNotificationPayload
from app.services.access_service import ensure_school_user
from app.services.audit_service import log_action


def send_notification(
    db: Session,
    payload: NotificationCreate,
    current_user: User,
) -> Notification:
    recipient = ensure_school_user(db, payload.user_id, current_user)
    notification = Notification(
        school_id=recipient.school_id,
        user_id=recipient.id,
        sender_id=current_user.id,
        type=payload.type,
        channel=payload.channel,
        title=payload.title,
        message=payload.message,
        status="queued",
    )
    db.add(notification)
    db.flush()
    log_action(
        db,
        current_user=current_user,
        action="notification.queued",
        entity_type="notification",
        entity_id=notification.id,
        after_data={"user_id": recipient.id, "channel": notification.channel},
    )
    db.commit()
    db.refresh(notification)
    return notification


def list_user_notifications(
    db: Session,
    user_id: int,
    current_user: User,
) -> list[Notification]:
    if current_user.role_id in (RoleId.PARENT, RoleId.STUDENT) and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Users can only view their own notifications",
        )
    recipient = ensure_school_user(db, user_id, current_user)
    return (
        db.query(Notification)
        .filter(Notification.user_id == recipient.id, Notification.school_id == current_user.school_id)
        .order_by(Notification.created_at.desc())
        .all()
    )


def send_role_notification(
    db: Session,
    payload: RoleNotificationPayload,
    current_user: User,
) -> list[Notification]:
    if current_user.role_id != RoleId.ADMIN and current_user.role_id != RoleId.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can broadcast to roles",
        )

    recipients = (
        db.query(User)
        .filter(
            User.role_id == payload.role_id,
            User.school_id == current_user.school_id,
            User.is_active == True,
        )
        .all()
    )

    notifications = []
    for user in recipients:
        notification = Notification(
            school_id=current_user.school_id,
            user_id=user.id,
            sender_id=current_user.id,
            type=payload.type,
            channel=payload.channel,
            title=payload.title,
            message=payload.message,
            status="queued",
        )
        db.add(notification)
        notifications.append(notification)

    db.flush()
    log_action(
        db,
        current_user=current_user,
        action="notification.role_broadcast",
        entity_type="notification",
        after_data={"role_id": payload.role_id, "count": len(notifications)},
    )
    db.commit()
    for n in notifications:
        db.refresh(n)
    return notifications


def notify_parents_of_student(
    db: Session,
    student_id: int,
    title: str,
    message: str,
    notification_type: str = "student_alert",
    sender: User | None = None,
) -> list[Notification]:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return []

    guardian_links = (
        db.query(StudentGuardian)
        .filter(StudentGuardian.student_id == student_id)
        .all()
    )

    sender_id = sender.id if sender else None
    notifications = []
    for link in guardian_links:
        notification = Notification(
            school_id=student.school_id,
            user_id=link.guardian_id,
            sender_id=sender_id,
            type=notification_type,
            channel="in_app",
            title=title,
            message=message,
            status="queued",
        )
        db.add(notification)
        notifications.append(notification)

    if notifications:
        db.flush()
        db.commit()
        for n in notifications:
            db.refresh(n)

    return notifications


def queue_sms_notifications(
    db: Session,
    payload: SmsNotificationPayload,
    current_user: User,
) -> tuple[int, int, list[str]]:
    if current_user.role_id not in (RoleId.ADMIN, RoleId.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can send SMS broadcasts",
        )

    recipients = (
        db.query(User)
        .filter(
            User.role_id == payload.role_id,
            User.school_id == current_user.school_id,
            User.is_active == True,
        )
        .all()
    )

    queued = 0
    failed = 0
    details = []

    for user in recipients:
        if not user.phone:
            failed += 1
            details.append(f"User {user.id} ({user.name}): no phone number")
            continue

        notification = Notification(
            school_id=current_user.school_id,
            user_id=user.id,
            sender_id=current_user.id,
            type=payload.type,
            channel="sms",
            title=payload.title,
            message=payload.message,
            status="queued",
        )
        db.add(notification)
        queued += 1
        details.append(f"User {user.id} ({user.name}): queued to {user.phone}")

    if queued > 0:
        db.flush()
        log_action(
            db,
            current_user=current_user,
            action="sms.bulk_queued",
            entity_type="notification",
            after_data={"role_id": payload.role_id, "queued": queued, "failed": failed},
        )
        db.commit()

    return queued, failed, details
