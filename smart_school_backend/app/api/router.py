from fastapi import APIRouter

from app.api.routes import (
    admin,
    attendance,
    auth,
    fees,
    library,
    notifications,
    platform,
    report_cards,
    students,
    subscriptions,
    sync,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(platform.router)
api_router.include_router(users.router)
api_router.include_router(students.router)
api_router.include_router(fees.router)
api_router.include_router(attendance.router)
api_router.include_router(report_cards.router)
api_router.include_router(notifications.router)
api_router.include_router(admin.router)
api_router.include_router(sync.router)
api_router.include_router(library.router)
api_router.include_router(subscriptions.router)
