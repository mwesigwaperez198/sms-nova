from __future__ import annotations

import secrets
from pathlib import Path

from fastapi import FastAPI, HTTPException, status
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import seed_data
from .security import verify_password
from .settings import get_settings

settings = get_settings()
PREVIEW_PATH = Path(__file__).resolve().parent / "static" / "index.html"

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    email: str
    password: str


class DemoLoginRequest(BaseModel):
    role: str


class ApprovalDecision(BaseModel):
    decision: str
    comment: str | None = None


class SmsBatchRequest(BaseModel):
    recipient_group_id: str
    message: str
    comment: str | None = None


def _role_key(role: str) -> str:
    return role.lower().replace(" / ", "-").replace(" ", "-")


def _session_for(user: dict) -> dict[str, object]:
    return {
        "access_token": f"local_{secrets.token_urlsafe(24)}",
        "token_type": "bearer",
        "user": {
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "role_key": _role_key(user["role"]),
            "school": user["school"],
        },
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


@app.get("/", response_class=HTMLResponse)
def local_preview() -> str:
    return PREVIEW_PATH.read_text(encoding="utf-8")


@app.post("/auth/login")
def login(payload: LoginRequest) -> dict[str, object]:
    user = seed_data.find_user_by_email(payload.email)
    if not user or not user.get("password_hash") or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    return _session_for(user)


@app.post("/auth/demo-login")
def demo_login(payload: DemoLoginRequest) -> dict[str, object]:
    if settings.environment != "local":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Demo login is local-only.")
    user = seed_data.find_user_by_role(payload.role)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo role not found.")
    return _session_for(user)


@app.get("/auth/mock-users")
def mock_users() -> list[dict]:
    return seed_data.public_users()


@app.get("/dashboard/{role}")
def dashboard(role: str) -> dict[str, object]:
    role_name = role.replace("-", " ").title()
    if role == "super-admin":
        role_name = "Super Admin"
    metrics = seed_data.role_metrics.get(role_name, seed_data.role_metrics["Admin"])
    return {
        "school": seed_data.school_profile,
        "metrics": metrics,
        "red_flags": seed_data.red_flags,
        "home": seed_data.admin_home,
        "notifications": seed_data.admin_notifications,
        "approvals": seed_data.approval_items,
        "nav": seed_data.role_nav.get(role, seed_data.role_nav["admin"]),
    }


@app.get("/students")
def list_students() -> dict[str, object]:
    return {"items": seed_data.students, "total": len(seed_data.students)}


@app.get("/imports")
def list_imports() -> dict[str, object]:
    return {"items": seed_data.imports, "total": len(seed_data.imports)}


@app.get("/finance/documents")
def list_finance_documents() -> dict[str, object]:
    return {"items": seed_data.finance_documents, "total": len(seed_data.finance_documents)}


@app.post("/finance/documents/{document_number}/share-to-admin")
def share_finance_document(document_number: str) -> dict[str, str]:
    return {
        "document_number": document_number,
        "status": "Submitted to Admin",
        "message": "Mock review task created for admin approval.",
    }


@app.get("/payments")
def list_payments() -> dict[str, object]:
    return {"items": seed_data.payments, "total": len(seed_data.payments)}


@app.get("/library/books")
def list_library_books() -> dict[str, object]:
    return {"items": seed_data.library_books, "total": len(seed_data.library_books)}


@app.get("/library/requested-books")
def list_requested_books() -> dict[str, object]:
    return {"items": seed_data.requested_books, "total": len(seed_data.requested_books)}


@app.post("/library/requested-books/share-to-admin")
def share_requested_books() -> dict[str, str]:
    return {
        "status": "Submitted to Admin",
        "message": "Mock requested-books document added to admin review queue.",
    }


@app.get("/staff")
def list_staff() -> dict[str, object]:
    return {"items": seed_data.staff, "total": len(seed_data.staff)}


@app.get("/school/profile")
def school_profile() -> dict[str, object]:
    return seed_data.school_profile


@app.get("/admin/approvals")
def list_approvals() -> dict[str, object]:
    return {"items": seed_data.approval_items, "total": len(seed_data.approval_items)}


@app.post("/admin/approvals/{approval_id}/decision")
def approval_decision(approval_id: str, payload: ApprovalDecision) -> dict[str, str]:
    return {
        "approval_id": approval_id,
        "decision": payload.decision,
        "status": "Recorded",
        "message": f"{payload.decision.title()} recorded for {approval_id}.",
    }


@app.get("/admin/notifications")
def list_notifications() -> dict[str, object]:
    return {"items": seed_data.admin_notifications, "total": len(seed_data.admin_notifications)}


@app.get("/communications/batches")
def list_communication_batches() -> dict[str, object]:
    return {"items": seed_data.communication_batches, "total": len(seed_data.communication_batches)}


@app.get("/communications/sms-recipient-groups")
def sms_groups() -> dict[str, object]:
    return {"items": seed_data.sms_recipient_groups, "total": len(seed_data.sms_recipient_groups)}


@app.post("/communications/sms-batches")
def create_sms_batch(payload: SmsBatchRequest) -> dict[str, str]:
    return {
        "status": "Queued",
        "message": "SMS batch queued for selected parent phone numbers.",
        "recipient_group_id": payload.recipient_group_id,
    }
