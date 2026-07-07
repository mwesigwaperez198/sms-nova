"""mvp modules

Revision ID: 0002_mvp_modules
Revises: 0001_foundation
Create Date: 2026-06-06
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0002_mvp_modules"
down_revision: str | None = "0001_foundation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=True),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("actor_role_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("before_data", sa.JSON(), nullable=True),
        sa.Column("after_data", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(length=80), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["actor_role_id"], ["roles.id"]),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_logs_action"), "audit_logs", ["action"], unique=False)
    op.create_index(op.f("ix_audit_logs_actor_user_id"), "audit_logs", ["actor_user_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_entity_id"), "audit_logs", ["entity_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_entity_type"), "audit_logs", ["entity_type"], unique=False)
    op.create_index(op.f("ix_audit_logs_id"), "audit_logs", ["id"], unique=False)
    op.create_index(op.f("ix_audit_logs_school_id"), "audit_logs", ["school_id"], unique=False)

    op.create_table(
        "fee_categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("school_id", "name", name="uq_fee_categories_school_name"),
    )
    op.create_index(op.f("ix_fee_categories_id"), "fee_categories", ["id"], unique=False)
    op.create_index(op.f("ix_fee_categories_school_id"), "fee_categories", ["school_id"], unique=False)

    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("fee_category_id", sa.Integer(), nullable=True),
        sa.Column("academic_year", sa.String(length=20), nullable=False),
        sa.Column("term", sa.String(length=20), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["fee_category_id"], ["fee_categories.id"]),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invoices_academic_year"), "invoices", ["academic_year"], unique=False)
    op.create_index(op.f("ix_invoices_id"), "invoices", ["id"], unique=False)
    op.create_index(op.f("ix_invoices_school_id"), "invoices", ["school_id"], unique=False)
    op.create_index(op.f("ix_invoices_status"), "invoices", ["status"], unique=False)
    op.create_index(op.f("ix_invoices_student_id"), "invoices", ["student_id"], unique=False)
    op.create_index(op.f("ix_invoices_term"), "invoices", ["term"], unique=False)

    op.create_table(
        "attendance",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("attendance_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("edit_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "attendance_date", name="uq_attendance_student_date"),
    )
    op.create_index(op.f("ix_attendance_attendance_date"), "attendance", ["attendance_date"], unique=False)
    op.create_index(op.f("ix_attendance_id"), "attendance", ["id"], unique=False)
    op.create_index(op.f("ix_attendance_school_id"), "attendance", ["school_id"], unique=False)
    op.create_index(op.f("ix_attendance_status"), "attendance", ["status"], unique=False)
    op.create_index(op.f("ix_attendance_student_id"), "attendance", ["student_id"], unique=False)
    op.create_index(op.f("ix_attendance_teacher_id"), "attendance", ["teacher_id"], unique=False)

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invoice_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("payer_id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("method", sa.String(length=50), nullable=False),
        sa.Column("reference", sa.String(length=120), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"]),
        sa.ForeignKeyConstraint(["payer_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_payments_id"), "payments", ["id"], unique=False)
    op.create_index(op.f("ix_payments_invoice_id"), "payments", ["invoice_id"], unique=False)
    op.create_index(op.f("ix_payments_payer_id"), "payments", ["payer_id"], unique=False)
    op.create_index(op.f("ix_payments_school_id"), "payments", ["school_id"], unique=False)
    op.create_index(op.f("ix_payments_status"), "payments", ["status"], unique=False)
    op.create_index(op.f("ix_payments_student_id"), "payments", ["student_id"], unique=False)

    op.create_table(
        "report_cards",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("academic_year", sa.String(length=20), nullable=False),
        sa.Column("term", sa.String(length=20), nullable=False),
        sa.Column("subject", sa.String(length=100), nullable=False),
        sa.Column("score", sa.Numeric(5, 2), nullable=False),
        sa.Column("grade", sa.String(length=5), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=True),
        sa.Column("teacher_remarks", sa.Text(), nullable=True),
        sa.Column("class_teacher_remarks", sa.Text(), nullable=True),
        sa.Column("head_teacher_remarks", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "student_id",
            "academic_year",
            "term",
            "subject",
            name="uq_report_cards_student_period_subject",
        ),
    )
    op.create_index(op.f("ix_report_cards_academic_year"), "report_cards", ["academic_year"], unique=False)
    op.create_index(op.f("ix_report_cards_id"), "report_cards", ["id"], unique=False)
    op.create_index(op.f("ix_report_cards_school_id"), "report_cards", ["school_id"], unique=False)
    op.create_index(op.f("ix_report_cards_status"), "report_cards", ["status"], unique=False)
    op.create_index(op.f("ix_report_cards_student_id"), "report_cards", ["student_id"], unique=False)
    op.create_index(op.f("ix_report_cards_subject"), "report_cards", ["subject"], unique=False)
    op.create_index(op.f("ix_report_cards_teacher_id"), "report_cards", ["teacher_id"], unique=False)
    op.create_index(op.f("ix_report_cards_term"), "report_cards", ["term"], unique=False)

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=True),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("channel", sa.String(length=30), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notifications_id"), "notifications", ["id"], unique=False)
    op.create_index(op.f("ix_notifications_school_id"), "notifications", ["school_id"], unique=False)
    op.create_index(op.f("ix_notifications_status"), "notifications", ["status"], unique=False)
    op.create_index(op.f("ix_notifications_type"), "notifications", ["type"], unique=False)
    op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"], unique=False)

    op.create_table(
        "receipts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("payment_id", sa.Integer(), nullable=False),
        sa.Column("receipt_number", sa.String(length=80), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("pdf_url", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_receipts_id"), "receipts", ["id"], unique=False)
    op.create_index(op.f("ix_receipts_payment_id"), "receipts", ["payment_id"], unique=True)
    op.create_index(op.f("ix_receipts_receipt_number"), "receipts", ["receipt_number"], unique=True)

    op.create_table(
        "sync_changes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("school_id", "idempotency_key", name="uq_sync_changes_school_key"),
    )
    op.create_index(op.f("ix_sync_changes_entity_id"), "sync_changes", ["entity_id"], unique=False)
    op.create_index(op.f("ix_sync_changes_entity_type"), "sync_changes", ["entity_type"], unique=False)
    op.create_index(op.f("ix_sync_changes_id"), "sync_changes", ["id"], unique=False)
    op.create_index(op.f("ix_sync_changes_school_id"), "sync_changes", ["school_id"], unique=False)
    op.create_index(op.f("ix_sync_changes_status"), "sync_changes", ["status"], unique=False)
    op.create_index(op.f("ix_sync_changes_user_id"), "sync_changes", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_sync_changes_user_id"), table_name="sync_changes")
    op.drop_index(op.f("ix_sync_changes_status"), table_name="sync_changes")
    op.drop_index(op.f("ix_sync_changes_school_id"), table_name="sync_changes")
    op.drop_index(op.f("ix_sync_changes_id"), table_name="sync_changes")
    op.drop_index(op.f("ix_sync_changes_entity_type"), table_name="sync_changes")
    op.drop_index(op.f("ix_sync_changes_entity_id"), table_name="sync_changes")
    op.drop_table("sync_changes")

    op.drop_index(op.f("ix_receipts_receipt_number"), table_name="receipts")
    op.drop_index(op.f("ix_receipts_payment_id"), table_name="receipts")
    op.drop_index(op.f("ix_receipts_id"), table_name="receipts")
    op.drop_table("receipts")

    op.drop_index(op.f("ix_notifications_user_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_type"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_status"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_school_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_id"), table_name="notifications")
    op.drop_table("notifications")

    op.drop_index(op.f("ix_report_cards_term"), table_name="report_cards")
    op.drop_index(op.f("ix_report_cards_teacher_id"), table_name="report_cards")
    op.drop_index(op.f("ix_report_cards_subject"), table_name="report_cards")
    op.drop_index(op.f("ix_report_cards_student_id"), table_name="report_cards")
    op.drop_index(op.f("ix_report_cards_status"), table_name="report_cards")
    op.drop_index(op.f("ix_report_cards_school_id"), table_name="report_cards")
    op.drop_index(op.f("ix_report_cards_id"), table_name="report_cards")
    op.drop_index(op.f("ix_report_cards_academic_year"), table_name="report_cards")
    op.drop_table("report_cards")

    op.drop_index(op.f("ix_payments_student_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_status"), table_name="payments")
    op.drop_index(op.f("ix_payments_school_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_payer_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_invoice_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_id"), table_name="payments")
    op.drop_table("payments")

    op.drop_index(op.f("ix_attendance_teacher_id"), table_name="attendance")
    op.drop_index(op.f("ix_attendance_student_id"), table_name="attendance")
    op.drop_index(op.f("ix_attendance_status"), table_name="attendance")
    op.drop_index(op.f("ix_attendance_school_id"), table_name="attendance")
    op.drop_index(op.f("ix_attendance_id"), table_name="attendance")
    op.drop_index(op.f("ix_attendance_attendance_date"), table_name="attendance")
    op.drop_table("attendance")

    op.drop_index(op.f("ix_invoices_term"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_student_id"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_status"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_school_id"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_id"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_academic_year"), table_name="invoices")
    op.drop_table("invoices")

    op.drop_index(op.f("ix_fee_categories_school_id"), table_name="fee_categories")
    op.drop_index(op.f("ix_fee_categories_id"), table_name="fee_categories")
    op.drop_table("fee_categories")

    op.drop_index(op.f("ix_audit_logs_school_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_entity_type"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_entity_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_actor_user_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_action"), table_name="audit_logs")
    op.drop_table("audit_logs")
