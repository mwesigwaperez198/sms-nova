import os

os.environ["DATABASE_URL"] = "sqlite:///./test_smart_school.db"
os.environ["INITIAL_SUPER_ADMIN_EMAIL"] = "owner@example.com"
os.environ["INITIAL_SUPER_ADMIN_PASSWORD"] = "ChangeMe123!"
os.environ["BACKEND_CORS_ORIGINS"] = '["http://localhost:5173"]'

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.core.roles import ROLE_SEED_DATA, RoleId
from app.core.security import hash_password
from app.db.base import Base
from app.models.role import Role
from app.models.user import User
from app.models.student import Student
from app.models.notification import Notification
from app.models.school import School
from app.models.subscription import SchoolSubscription, SubscriptionPlan

engine = create_engine(
    "sqlite:///./test_smart_school.db",
    connect_args={"check_same_thread": False},
)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def seed_test_db(db: Session):
    for rd in ROLE_SEED_DATA:
        db.add(Role(id=int(rd["id"]), name=rd["name"], description=rd["description"]))
    school = School(
        id=1, name="Test School", school_code="TST01",
        email="school@test.ac.ug",
    )
    db.add(school)
    db.flush()
    plan = SubscriptionPlan(id=1, name="Premium", price=0, duration_days=365, features={})
    db.add(plan)
    db.flush()
    from datetime import datetime, timezone, timedelta
    sub = SchoolSubscription(
        school_id=1, plan_id=1, status="active",
        starts_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(sub)
    admin = User(
        name="School Admin", email="admin@test.ac.ug",
        password_hash=hash_password("AdminPass123!"),
        role_id=RoleId.ADMIN, school_id=1, is_verified=True,
    )
    teacher = User(
        name="Teacher One", email="teacher@test.ac.ug",
        password_hash=hash_password("TeachPass123!"),
        role_id=RoleId.TEACHER, school_id=1, is_verified=True,
    )
    db.add_all([admin, teacher])
    db.flush()
    stud = Student(school_id=1, name="Student One", admission_number="STU-001", class_name="S1", stream_name="East")
    notif = Notification(user_id=admin.id, school_id=1, title="Welcome", message="Term starts Monday", type="info")
    db.add_all([stud, notif])
    db.commit()


def make_app():
    from contextlib import asynccontextmanager
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from app.api.router import api_router

    settings = get_settings()
    origins = [str(o) for o in settings.backend_cors_origins] if settings.backend_cors_origins else ["*"]
    app = FastAPI(title=settings.app_name)
    app.add_middleware(
        CORSMiddleware, allow_origins=origins,
        allow_credentials=bool(settings.backend_cors_origins),
        allow_methods=["*"], allow_headers=["*"],
    )
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


@pytest.fixture(scope="module", autouse=True)
def db_setup_teardown():
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    db = TestingSession()
    seed_test_db(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def client():
    import app.db.session as session_module
    session_module.engine = engine
    session_module.SessionLocal = TestingSession
    app = make_app()
    with TestClient(app) as c:
        yield c


def login(client, email, password):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.json()
    return r.json()["access_token"]


class TestStudentsEndpoint:
    def test_list_students(self, client):
        token = login(client, "admin@test.ac.ug", "AdminPass123!")
        r = client.get("/api/v1/students/list", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        assert data[0]["name"] == "Student One"
        assert data[0]["admission_number"] == "STU-001"

    def test_list_students_requires_auth(self, client):
        assert client.get("/api/v1/students/list").status_code == 401

    def test_list_students_pagination(self, client):
        token = login(client, "admin@test.ac.ug", "AdminPass123!")
        r = client.get("/api/v1/students/list?skip=0&limit=10", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestNotificationsEndpoint:
    def test_list_notifications(self, client):
        token = login(client, "admin@test.ac.ug", "AdminPass123!")
        r = client.get("/api/v1/notifications/", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_notifications_requires_auth(self, client):
        assert client.get("/api/v1/notifications/").status_code == 401


class TestAdminEndpoints:
    def test_overview(self, client):
        token = login(client, "admin@test.ac.ug", "AdminPass123!")
        r = client.get("/api/v1/admin/overview", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["students_count"] >= 1
        assert "total_invoiced" in data
        assert "total_paid" in data
        assert "outstanding_balance" in data

    def test_teachers_list(self, client):
        token = login(client, "admin@test.ac.ug", "AdminPass123!")
        r = client.get("/api/v1/admin/teachers", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert any(t["name"] == "Teacher One" for t in r.json())

    def test_audit_logs(self, client):
        token = login(client, "admin@test.ac.ug", "AdminPass123!")
        r = client.get("/api/v1/admin/audit-logs", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestLibraryEndpoint:
    def test_list_books(self, client):
        token = login(client, "admin@test.ac.ug", "AdminPass123!")
        r = client.get("/api/v1/library/books?limit=10", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)
