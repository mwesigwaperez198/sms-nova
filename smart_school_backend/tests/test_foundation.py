from app.core.roles import RoleId


def login(client, email: str, password: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def login_tokens(client, email: str, password: str) -> dict:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()


def test_health_check(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login_returns_refresh_token_and_refresh_issues_access_token(client):
    tokens = login_tokens(client, "owner@example.com", "ChangeMe123!")

    assert tokens["token_type"] == "bearer"
    assert tokens["access_token"]
    assert tokens["refresh_token"]

    response = client.post(
        "/api/v1/auth/refresh-token",
        json={"refresh_token": tokens["refresh_token"]},
    )

    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["access_token"]


def test_refresh_endpoint_rejects_access_token(client):
    tokens = login_tokens(client, "owner@example.com", "ChangeMe123!")

    response = client.post(
        "/api/v1/auth/refresh-token",
        json={"refresh_token": tokens["access_token"]},
    )

    assert response.status_code == 401


def test_authenticated_user_can_reset_password(client):
    tokens = login_tokens(client, "owner@example.com", "ChangeMe123!")

    response = client.post(
        "/api/v1/auth/reset-password",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        json={
            "current_password": "ChangeMe123!",
            "new_password": "NewChangeMe123!",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"detail": "Password updated"}

    old_login = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@example.com", "password": "ChangeMe123!"},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@example.com", "password": "NewChangeMe123!"},
    )
    assert new_login.status_code == 200


def test_super_admin_can_onboard_school_and_admin_can_create_student(client):
    super_token = login(client, "owner@example.com", "ChangeMe123!")

    onboard_response = client.post(
        "/api/v1/platform/schools",
        headers={"Authorization": f"Bearer {super_token}"},
        json={
            "school": {
                "name": "Nile High School",
                "school_code": "NHS",
                "address": "Kampala",
            },
            "admin": {
                "name": "School Admin",
                "email": "admin@nile.ac.ug",
                "password": "StrongPass123!",
            },
        },
    )
    assert onboard_response.status_code == 200
    onboarded = onboard_response.json()
    assert onboarded["school"]["school_code"] == "NHS"
    assert onboarded["school"]["currency_code"] == "UGX"
    assert onboarded["school"]["timezone"] == "Africa/Kampala"
    assert onboarded["admin"]["role_id"] == RoleId.ADMIN

    admin_token = login(client, "admin@nile.ac.ug", "StrongPass123!")

    parent_response = client.post(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Parent One",
            "email": "parent@nile.ac.ug",
            "password": "ParentPass123!",
            "role_id": RoleId.PARENT,
        },
    )
    assert parent_response.status_code == 200
    parent = parent_response.json()

    student_response = client.post(
        "/api/v1/students/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Student One",
            "admission_number": "NHS-001",
            "class_name": "S1",
            "stream_name": "East",
        },
    )
    assert student_response.status_code == 200
    student = student_response.json()

    link_response = client.post(
        f"/api/v1/students/{student['id']}/guardians",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "guardian_id": parent["id"],
            "relationship": "father",
            "is_primary": True,
        },
    )
    assert link_response.status_code == 200
    assert link_response.json()["guardian_id"] == parent["id"]


def test_school_admin_cannot_create_another_admin(client):
    super_token = login(client, "owner@example.com", "ChangeMe123!")
    client.post(
        "/api/v1/platform/schools",
        headers={"Authorization": f"Bearer {super_token}"},
        json={
            "school": {"name": "Lake School", "school_code": "LKS"},
            "admin": {
                "name": "Lake Admin",
                "email": "admin@lake.ac.ug",
                "password": "StrongPass123!",
            },
        },
    )
    admin_token = login(client, "admin@lake.ac.ug", "StrongPass123!")

    response = client.post(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Second Admin",
            "email": "second@lake.ac.ug",
            "password": "StrongPass123!",
            "role_id": RoleId.ADMIN,
        },
    )

    assert response.status_code == 403
