from fastapi import APIRouter

from app.api.routes import (
    admin,
    academics,
    api_key_auth,
    assessments,
    attendance,
    auth,
    bulk_import,
    face_auth,
    fees,
    finance,
    headteacher,
    incidents,
    library,
    notifications,
    novara_admin,
    platform,
    platform_admin,
    ranking,
    registration,
    report_cards,
    report_remarks,
    role_extensions,
    students,
    subscriptions,
    sync,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(face_auth.router)
api_router.include_router(assessments.router)
api_router.include_router(registration.router)
api_router.include_router(platform.router)
api_router.include_router(users.router)
api_router.include_router(students.router)
api_router.include_router(fees.router)
api_router.include_router(finance.router)
api_router.include_router(attendance.router)
api_router.include_router(report_cards.router)
api_router.include_router(report_remarks.router)
api_router.include_router(notifications.router)
api_router.include_router(admin.router)
api_router.include_router(headteacher.router)
api_router.include_router(sync.router)
api_router.include_router(library.router)
api_router.include_router(subscriptions.router)
api_router.include_router(platform_admin.router)
api_router.include_router(novara_admin.router)
api_router.include_router(api_key_auth.router)
api_router.include_router(role_extensions.router)
api_router.include_router(incidents.router)
api_router.include_router(academics.router)
api_router.include_router(bulk_import.router)
api_router.include_router(ranking.router)
