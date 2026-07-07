from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    NotificationCreate,
    NotificationRead,
    RoleNotificationPayload,
    SmsNotificationPayload,
    SmsSendResult,
)
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _notification_to_read(n: Notification) -> NotificationRead:
    return NotificationRead(
        id=n.id,
        school_id=n.school_id,
        user_id=n.user_id,
        sender_id=n.sender_id,
        type=n.type,
        channel=n.channel,
        title=n.title,
        message=n.message,
        status=n.status,
        created_at=n.created_at,
        sent_at=n.sent_at,
    )


@router.get("/", response_model=list[NotificationRead])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role_id == RoleId.SUPER_ADMIN:
        return db.query(Notification).order_by(Notification.created_at.desc()).limit(50).all()

    role_filter = _get_role_notification_type_filter(current_user.role_id)
    query = db.query(Notification).filter(
        Notification.school_id == current_user.school_id,
    )
    if role_filter:
        query = query.filter(Notification.type.in_(role_filter))

    return query.order_by(Notification.created_at.desc()).limit(50).all()


def _get_role_notification_type_filter(role_id: int) -> list[str] | None:
    role_filters = {
        RoleId.PARENT: ["attendance_alert", "fee_reminder", "student_alert", "exam_report", "sms_bulk", "role_broadcast", "general"],
        RoleId.STUDENT: ["exam_report", "general", "attendance_alert", "fee_reminder", "student_alert"],
        RoleId.TEACHER: ["class_update", "attendance_alert", "general", "role_broadcast"],
        RoleId.BURSAR: ["fee_reminder", "financial", "general"],
        RoleId.SECRETARY: ["general", "role_broadcast"],
        RoleId.LIBRARIAN: ["library", "general", "role_broadcast"],
    }
    return role_filters.get(role_id)


@router.post("/send", response_model=NotificationRead)
def send_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.TEACHER)),
):
    return notification_service.send_notification(db, payload, current_user)


@router.post("/role", response_model=list[NotificationRead])
def send_role_notification(
    payload: RoleNotificationPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.SUPER_ADMIN)),
):
    notifications = notification_service.send_role_notification(db, payload, current_user)
    return [_notification_to_read(n) for n in notifications]


@router.post("/sms", response_model=SmsSendResult)
def send_sms_broadcast(
    payload: SmsNotificationPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.SUPER_ADMIN)),
):
    queued, failed, details = notification_service.queue_sms_notifications(db, payload, current_user)
    return SmsSendResult(queued=queued, failed=failed, details=details)


@router.get("/user/{user_id}", response_model=list[NotificationRead])
def get_user_notifications(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.TEACHER, RoleId.PARENT, RoleId.STUDENT)),
):
    return notification_service.list_user_notifications(db, user_id, current_user)
