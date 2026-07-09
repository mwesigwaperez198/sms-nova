from datetime import datetime, timedelta, timezone

from app.core.roles import RoleId


def login(client, email: str, password: str) -> str:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.json()
    return r.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def onboard_default_school(client):
    super_token = login(client, "owner@example.com", "ChangeMe123!")
    r = client.post(
        "/api/v1/platform/schools",
        headers=auth(super_token),
        json={
            "school": {"name": "Test Academy", "school_code": "TSTA", "address": "Kampala"},
            "admin": {"name": "Test Admin", "email": "admin@test.ac.ug", "password": "StrongPass123!"},
        },
    )
    assert r.status_code == 200
    return super_token, r.json()


class TestAddSchoolEndpoint:
    def test_add_school_requires_super_admin(self, client):
        admin_token = login(client, "admin@test.ac.ug", "StrongPass123!")
        r = client.post(
            "/api/v1/platform/add-school",
            headers=auth(admin_token),
            json={
                "name": "Unauthorized School",
                "email": "unauth@school.com",
                "admin_name": "Unauth Admin",
                "admin_email": "unauth@admin.com",
                "plan_id": 1,
            },
        )
        assert r.status_code == 403

    def test_add_school_creates_school_admin_subscription(self, client):
        super_token = login(client, "owner@example.com", "ChangeMe123!")
        r = client.post(
            "/api/v1/platform/add-school",
            headers=auth(super_token),
            json={
                "name": "New School",
                "email": "new@school.com",
                "phone": "+256700111222",
                "address": "Jinja Road",
                "country": "Uganda",
                "timezone": "Africa/Kampala",
                "admin_name": "New Admin",
                "admin_email": "newadmin@school.com",
                "admin_password": "SecurePass123!",
                "plan_id": 1,
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["school_id"] > 0
        assert data["school_code"].startswith("SCH")
        assert data["admin_user_id"] > 0
        assert "created" in data["message"].lower()

        admin_token = login(client, "newadmin@school.com", "SecurePass123!")
        overview = client.get("/api/v1/admin/overview", headers=auth(admin_token))
        assert overview.status_code == 200

    def test_add_school_rejects_duplicate_admin_email(self, client):
        super_token = login(client, "owner@example.com", "ChangeMe123!")
        r = client.post(
            "/api/v1/platform/add-school",
            headers=auth(super_token),
            json={
                "name": "Duplicate School",
                "email": "dup@school.com",
                "admin_name": "Dup Admin",
                "admin_email": "newadmin@school.com",
                "plan_id": 1,
            },
        )
        assert r.status_code == 409


class TestApiKeyEndpoints:
    def test_generate_api_key_requires_super_admin(self, client):
        _, school_data = onboard_default_school(client)
        admin_token = login(client, "admin@test.ac.ug", "StrongPass123!")
        r = client.post(
            "/api/v1/platform/api-keys/generate",
            headers=auth(admin_token),
            json={"school_id": school_data["school"]["id"], "description": "Test key"},
        )
        assert r.status_code == 403

    def test_generate_and_list_api_keys(self, client):
        _, school_data = onboard_default_school(client)
        super_token = login(client, "owner@example.com", "ChangeMe123!")

        r = client.post(
            "/api/v1/platform/api-keys/generate",
            headers=auth(super_token),
            json={
                "school_id": school_data["school"]["id"],
                "description": "Integration test key",
                "expires_in_days": 30,
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["api_key"].startswith("novara_")
        assert data["id"] > 0
        assert "Key sent" in data["message"]

        list_r = client.get(
            "/api/v1/platform/api-keys",
            headers=auth(super_token),
        )
        assert list_r.status_code == 200
        keys = list_r.json()
        assert len(keys) >= 1
        assert any(k["key_prefix"] == data["api_key"][:10] for k in keys)

    def test_generate_api_key_rejects_unknown_school(self, client):
        super_token = login(client, "owner@example.com", "ChangeMe123!")
        r = client.post(
            "/api/v1/platform/api-keys/generate",
            headers=auth(super_token),
            json={"school_id": 99999, "description": "Ghost school"},
        )
        assert r.status_code == 404

    def test_revoke_api_key(self, client):
        _, school_data = onboard_default_school(client)
        super_token = login(client, "owner@example.com", "ChangeMe123!")

        gen_r = client.post(
            "/api/v1/platform/api-keys/generate",
            headers=auth(super_token),
            json={"school_id": school_data["school"]["id"], "description": "To revoke"},
        )
        assert gen_r.status_code == 200
        key_id = gen_r.json()["id"]

        rev_r = client.post(
            f"/api/v1/platform/api-keys/{key_id}/revoke",
            headers=auth(super_token),
        )
        assert rev_r.status_code == 200
        assert rev_r.json()["detail"] == "API key revoked"

        list_r = client.get("/api/v1/platform/api-keys", headers=auth(super_token))
        key = next(k for k in list_r.json() if k["id"] == key_id)
        assert key["is_active"] is False

    def test_revoke_nonexistent_key_returns_404(self, client):
        super_token = login(client, "owner@example.com", "ChangeMe123!")
        r = client.post("/api/v1/platform/api-keys/99999/revoke", headers=auth(super_token))
        assert r.status_code == 404

    def test_filter_api_keys_by_school(self, client):
        _, school1 = onboard_default_school(client)
        super_token = login(client, "owner@example.com", "ChangeMe123!")

        client.post(
            "/api/v1/platform/api-keys/generate",
            headers=auth(super_token),
            json={"school_id": school1["school"]["id"], "description": "School 1 key", "expires_in_days": 30},
        )

        r = client.get(
            f"/api/v1/platform/api-keys?school_id={school1['school']['id']}",
            headers=auth(super_token),
        )
        assert r.status_code == 200
        assert all(k["id"] for k in r.json())


class TestSystemCheckEndpoint:
    def test_trigger_system_check_requires_super_admin(self, client):
        _, school_data = onboard_default_school(client)
        admin_token = login(client, "admin@test.ac.ug", "StrongPass123!")
        r = client.post(
            "/api/v1/platform/system-check/trigger",
            headers=auth(admin_token),
        )
        assert r.status_code == 403

    def test_trigger_and_list_system_checks(self, client):
        onboard_default_school(client)
        super_token = login(client, "owner@example.com", "ChangeMe123!")

        r = client.post(
            "/api/v1/platform/system-check/trigger",
            headers=auth(super_token),
        )
        assert r.status_code == 200
        data = r.json()
        assert data["id"] > 0
        assert "midnight" in data["message"].lower() or "scheduled" in data["message"].lower()

        list_r = client.get("/api/v1/platform/system-checks", headers=auth(super_token))
        assert list_r.status_code == 200
        checks = list_r.json()
        assert len(checks) >= 1
        assert checks[0]["status"] == "scheduled"

    def test_system_check_duplicate_trigger_returns_409(self, client):
        onboard_default_school(client)
        super_token = login(client, "owner@example.com", "ChangeMe123!")

        client.post("/api/v1/platform/system-check/trigger", headers=auth(super_token))
        r = client.post("/api/v1/platform/system-check/trigger", headers=auth(super_token))
        assert r.status_code == 409

    def test_list_system_checks_respects_limit(self, client):
        onboard_default_school(client)
        super_token = login(client, "owner@example.com", "ChangeMe123!")

        client.post("/api/v1/platform/system-check/trigger", headers=auth(super_token))

        r = client.get("/api/v1/platform/system-checks?limit=5", headers=auth(super_token))
        assert r.status_code == 200
        assert len(r.json()) <= 5


class TestPlatformStats:
    def test_stats_requires_super_admin(self, client):
        admin_token = login(client, "admin@test.ac.ug", "StrongPass123!")
        r = client.get("/api/v1/platform/stats", headers=auth(admin_token))
        assert r.status_code == 403

    def test_stats_returns_counts(self, client):
        onboard_default_school(client)
        super_token = login(client, "owner@example.com", "ChangeMe123!")
        r = client.get("/api/v1/platform/stats", headers=auth(super_token))
        assert r.status_code == 200
        data = r.json()
        assert data["total_schools"] >= 1
        assert data["pending_registrations"] >= 0
        assert data["active_subscriptions"] >= 0


class TestSubscriptionEnforcement:
    def test_expired_subscription_blocks_operations(self, client):
        super_token = login(client, "owner@example.com", "ChangeMe123!")
        onboard = client.post(
            "/api/v1/platform/schools",
            headers=auth(super_token),
            json={
                "school": {"name": "Expired School", "school_code": "EXPS"},
                "admin": {"name": "Expired Admin", "email": "expired@test.ac.ug", "password": "StrongPass123!"},
            },
        )
        assert onboard.status_code == 200
        school_id = onboard.json()["school"]["id"]

        from app.models.subscription import SchoolSubscription
        from app.db.session import SessionMaker

        db = SessionMaker()
        sub = db.query(SchoolSubscription).filter(SchoolSubscription.school_id == school_id).first()
        if sub:
            sub.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
            sub.status = "expired"
            db.commit()
        db.close()

        admin_token = login(client, "expired@test.ac.ug", "StrongPass123!")
        r = client.get("/api/v1/students/list", headers=auth(admin_token))
        assert r.status_code == 403
        assert "expired" in r.json()["detail"].lower() or "renew" in r.json()["detail"].lower()


class TestPermissionEnforcement:
    def test_teacher_cannot_access_admin_endpoints(self, client):
        onboard_default_school(client)
        teacher_token = None
        admin_token = login(client, "admin@test.ac.ug", "StrongPass123!")

        r = client.post(
            "/api/v1/users/",
            headers=auth(admin_token),
            json={"name": "Test Teacher", "email": "teacher2@test.ac.ug", "password": "StrongPass123!", "role_id": RoleId.TEACHER},
        )
        assert r.status_code == 200
        teacher_token = login(client, "teacher2@test.ac.ug", "StrongPass123!")

        r = client.get("/api/v1/admin/overview", headers=auth(teacher_token))
        assert r.status_code == 403

        r = client.get("/api/v1/fees/report", headers=auth(teacher_token))
        assert r.status_code == 403

    def test_unauthenticated_requests_are_rejected(self, client):
        r = client.get("/api/v1/students/list")
        assert r.status_code == 401

        r = client.get("/api/v1/admin/overview")
        assert r.status_code == 401

        r = client.get("/api/v1/platform/stats")
        assert r.status_code == 401
