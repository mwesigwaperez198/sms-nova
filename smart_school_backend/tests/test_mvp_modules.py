from datetime import date

from app.core.roles import RoleId


def login(client, email: str, password: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def onboard_school(client):
    super_token = login(client, "owner@example.com", "ChangeMe123!")
    response = client.post(
        "/api/v1/platform/schools",
        headers=auth_header(super_token),
        json={
            "school": {
                "name": "MVP High School",
                "school_code": "MVP",
                "address": "Kampala",
            },
            "admin": {
                "name": "MVP Admin",
                "email": "admin@mvp.ac.ug",
                "password": "StrongPass123!",
            },
        },
    )
    assert response.status_code == 200
    admin_token = login(client, "admin@mvp.ac.ug", "StrongPass123!")
    return admin_token


def create_user(client, admin_token: str, name: str, email: str, role_id: int) -> dict:
    response = client.post(
        "/api/v1/users/",
        headers=auth_header(admin_token),
        json={
            "name": name,
            "email": email,
            "password": "StrongPass123!",
            "role_id": role_id,
        },
    )
    assert response.status_code == 200
    return response.json()


def setup_school_people(client):
    admin_token = onboard_school(client)
    teacher = create_user(
        client,
        admin_token,
        "Teacher One",
        "teacher@mvp.ac.ug",
        RoleId.TEACHER,
    )
    parent = create_user(
        client,
        admin_token,
        "Parent One",
        "parent@mvp.ac.ug",
        RoleId.PARENT,
    )
    student_user = create_user(
        client,
        admin_token,
        "Student Login",
        "student@mvp.ac.ug",
        RoleId.STUDENT,
    )

    student_response = client.post(
        "/api/v1/students/",
        headers=auth_header(admin_token),
        json={
            "name": "Student One",
            "admission_number": "MVP-001",
            "class_name": "S1",
            "stream_name": "East",
            "user_id": student_user["id"],
        },
    )
    assert student_response.status_code == 200
    student = student_response.json()

    link_response = client.post(
        f"/api/v1/students/{student['id']}/guardians",
        headers=auth_header(admin_token),
        json={
            "guardian_id": parent["id"],
            "relationship": "mother",
            "is_primary": True,
        },
    )
    assert link_response.status_code == 200

    return {
        "admin_token": admin_token,
        "teacher_token": login(client, "teacher@mvp.ac.ug", "StrongPass123!"),
        "parent_token": login(client, "parent@mvp.ac.ug", "StrongPass123!"),
        "student_token": login(client, "student@mvp.ac.ug", "StrongPass123!"),
        "teacher": teacher,
        "parent": parent,
        "student": student,
    }


def test_fees_payment_receipt_and_reports(client):
    ctx = setup_school_people(client)

    invoice_response = client.post(
        "/api/v1/fees/invoices",
        headers=auth_header(ctx["admin_token"]),
        json={
            "student_id": ctx["student"]["id"],
            "academic_year": "2026",
            "term": "Term 1",
            "amount": "1000.00",
            "description": "Term 1 tuition",
            "due_date": "2026-02-15",
        },
    )
    assert invoice_response.status_code == 200
    invoice = invoice_response.json()
    assert invoice["status"] == "unpaid"

    teacher_denied = client.get(
        f"/api/v1/fees/student/{ctx['student']['id']}",
        headers=auth_header(ctx["teacher_token"]),
    )
    assert teacher_denied.status_code == 403

    payment_response = client.post(
        "/api/v1/fees/payment",
        headers=auth_header(ctx["parent_token"]),
        json={
            "invoice_id": invoice["id"],
            "amount": "400.00",
            "method": "cash",
            "reference": "CASH-001",
        },
    )
    assert payment_response.status_code == 200
    payment_payload = payment_response.json()
    assert payment_payload["invoice"]["status"] == "partial"
    assert payment_payload["receipt"]["receipt_number"].startswith("MVP-2026-")

    fees_response = client.get(
        f"/api/v1/fees/student/{ctx['student']['id']}",
        headers=auth_header(ctx["parent_token"]),
    )
    assert fees_response.status_code == 200
    assert fees_response.json()["outstanding_balance"] == "600.00"

    report_response = client.get(
        "/api/v1/fees/report?academic_year=2026&term=Term%201",
        headers=auth_header(ctx["admin_token"]),
    )
    assert report_response.status_code == 200
    report = report_response.json()
    assert report["total_invoiced"] == "1000.00"
    assert report["total_paid"] == "400.00"
    assert report["partial_invoice_count"] == 1

    student_report_response = client.get(
        "/api/v1/fees/report/students?academic_year=2026&term=Term%201",
        headers=auth_header(ctx["admin_token"]),
    )
    assert student_report_response.status_code == 200
    assert student_report_response.json()[0]["student_id"] == ctx["student"]["id"]


def test_attendance_report_cards_notifications_admin_and_sync(client):
    ctx = setup_school_people(client)

    attendance_response = client.post(
        "/api/v1/attendance/mark",
        headers=auth_header(ctx["teacher_token"]),
        json={
            "attendance_date": str(date(2026, 2, 2)),
            "records": [
                {
                    "student_id": ctx["student"]["id"],
                    "status": "absent",
                    "remarks": "Did not report",
                }
            ],
        },
    )
    assert attendance_response.status_code == 200
    assert attendance_response.json()[0]["status"] == "absent"

    parent_attendance = client.get(
        f"/api/v1/attendance/student/{ctx['student']['id']}",
        headers=auth_header(ctx["parent_token"]),
    )
    assert parent_attendance.status_code == 200
    assert len(parent_attendance.json()) == 1

    absence_notification = client.get(
        f"/api/v1/notifications/user/{ctx['parent']['id']}",
        headers=auth_header(ctx["parent_token"]),
    )
    assert absence_notification.status_code == 200
    assert absence_notification.json()[0]["type"] == "attendance_absent"

    report_submit = client.post(
        "/api/v1/report-cards/submit",
        headers=auth_header(ctx["teacher_token"]),
        json={
            "student_id": ctx["student"]["id"],
            "academic_year": "2026",
            "term": "Term 1",
            "subject": "Mathematics",
            "score": "82.50",
            "grade": "A",
            "teacher_remarks": "Strong performance",
        },
    )
    assert report_submit.status_code == 200
    report_card = report_submit.json()
    assert report_card["status"] == "submitted"

    hidden_from_parent = client.get(
        f"/api/v1/report-cards/student/{ctx['student']['id']}",
        headers=auth_header(ctx["parent_token"]),
    )
    assert hidden_from_parent.status_code == 200
    assert hidden_from_parent.json() == []

    approved = client.post(
        f"/api/v1/report-cards/{report_card['id']}/approve",
        headers=auth_header(ctx["admin_token"]),
        json={
            "class_teacher_remarks": "Keep it up",
            "head_teacher_remarks": "Excellent",
        },
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"

    visible_to_parent = client.get(
        f"/api/v1/report-cards/student/{ctx['student']['id']}",
        headers=auth_header(ctx["parent_token"]),
    )
    assert visible_to_parent.status_code == 200
    assert len(visible_to_parent.json()) == 1

    manual_notification = client.post(
        "/api/v1/notifications/send",
        headers=auth_header(ctx["admin_token"]),
        json={
            "user_id": ctx["parent"]["id"],
            "type": "fee_reminder",
            "channel": "sms",
            "title": "Fee reminder",
            "message": "Please clear your balance.",
        },
    )
    assert manual_notification.status_code == 200
    assert manual_notification.json()["channel"] == "sms"

    overview = client.get(
        "/api/v1/admin/overview",
        headers=auth_header(ctx["admin_token"]),
    )
    assert overview.status_code == 200
    overview_data = overview.json()
    assert overview_data["students_count"] == 1
    assert overview_data["attendance_records_count"] == 1
    assert overview_data["report_cards_count"] == 1

    sync_response = client.post(
        "/api/v1/sync/upload",
        headers=auth_header(ctx["teacher_token"]),
        json={
            "changes": [
                {
                    "entity_type": "attendance",
                    "entity_id": 1,
                    "action": "offline_update",
                    "payload": {"status": "present"},
                    "idempotency_key": "teacher-offline-001",
                }
            ]
        },
    )
    assert sync_response.status_code == 200
    assert sync_response.json()["accepted"] == 1

    sync_download = client.get(
        "/api/v1/sync/download",
        headers=auth_header(ctx["teacher_token"]),
    )
    assert sync_download.status_code == 200
    assert sync_download.json()[0]["idempotency_key"] == "teacher-offline-001"
