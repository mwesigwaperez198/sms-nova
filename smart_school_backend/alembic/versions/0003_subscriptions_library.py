"""subscription plans, product keys, and library

Revision ID: 0003_subscriptions_library
Revises: 0002_mvp_modules
Create Date: 2026-07-01
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0003_subscriptions_library"
down_revision: str | None = "0002_mvp_modules"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "subscription_plans",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency_code", sa.String(length=3), nullable=False),
        sa.Column("max_students", sa.Integer(), nullable=True),
        sa.Column("max_staff", sa.Integer(), nullable=True),
        sa.Column("features", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_subscription_plans_id"), "subscription_plans", ["id"], unique=False)

    op.create_table(
        "school_subscriptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("plan_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.id"]),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_school_subscriptions_id"), "school_subscriptions", ["id"], unique=False)
    op.create_index(op.f("ix_school_subscriptions_school_id"), "school_subscriptions", ["school_id"], unique=False)
    op.create_index(op.f("ix_school_subscriptions_status"), "school_subscriptions", ["status"], unique=False)

    op.create_table(
        "product_keys",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("plan_id", sa.Integer(), nullable=False),
        sa.Column("key_hash", sa.String(length=64), nullable=False),
        sa.Column("generated_by_id", sa.Integer(), nullable=False),
        sa.Column("is_used", sa.Boolean(), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("used_by_id", sa.Integer(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["generated_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.id"]),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.ForeignKeyConstraint(["used_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key_hash"),
    )
    op.create_index(op.f("ix_product_keys_id"), "product_keys", ["id"], unique=False)
    op.create_index(op.f("ix_product_keys_school_id"), "product_keys", ["school_id"], unique=False)
    op.create_index(op.f("ix_product_keys_key_hash"), "product_keys", ["key_hash"], unique=True)
    op.create_index(op.f("ix_product_keys_expires_at"), "product_keys", ["expires_at"], unique=False)

    op.create_table(
        "library_books",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("author", sa.String(length=200), nullable=True),
        sa.Column("isbn", sa.String(length=30), nullable=True),
        sa.Column("publisher", sa.String(length=200), nullable=True),
        sa.Column("publication_year", sa.Integer(), nullable=True),
        sa.Column("shelf_location", sa.String(length=80), nullable=True),
        sa.Column("total_copies", sa.Integer(), nullable=False),
        sa.Column("available_copies", sa.Integer(), nullable=False),
        sa.Column("education_tier", sa.String(length=80), nullable=True),
        sa.Column("subject_area", sa.String(length=100), nullable=True),
        sa.Column("curriculum_level", sa.String(length=80), nullable=True),
        sa.Column("digital_url", sa.Text(), nullable=True),
        sa.Column("cover_url", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_digital", sa.Boolean(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("added_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["added_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("school_id", "isbn", name="uq_library_books_school_isbn"),
    )
    op.create_index(op.f("ix_library_books_id"), "library_books", ["id"], unique=False)
    op.create_index(op.f("ix_library_books_school_id"), "library_books", ["school_id"], unique=False)
    op.create_index(op.f("ix_library_books_title"), "library_books", ["title"], unique=False)
    op.create_index(op.f("ix_library_books_isbn"), "library_books", ["isbn"], unique=False)
    op.create_index(op.f("ix_library_books_education_tier"), "library_books", ["education_tier"], unique=False)
    op.create_index(op.f("ix_library_books_subject_area"), "library_books", ["subject_area"], unique=False)
    op.create_index(op.f("ix_library_books_curriculum_level"), "library_books", ["curriculum_level"], unique=False)

    op.create_table(
        "library_borrows",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("book_id", sa.Integer(), nullable=False),
        sa.Column("borrower_id", sa.Integer(), nullable=False),
        sa.Column("issued_by_id", sa.Integer(), nullable=True),
        sa.Column("borrowed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("returned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["book_id"], ["library_books.id"]),
        sa.ForeignKeyConstraint(["borrower_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["issued_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_library_borrows_id"), "library_borrows", ["id"], unique=False)
    op.create_index(op.f("ix_library_borrows_school_id"), "library_borrows", ["school_id"], unique=False)
    op.create_index(op.f("ix_library_borrows_book_id"), "library_borrows", ["book_id"], unique=False)
    op.create_index(op.f("ix_library_borrows_borrower_id"), "library_borrows", ["borrower_id"], unique=False)
    op.create_index(op.f("ix_library_borrows_status"), "library_borrows", ["status"], unique=False)

    op.create_table(
        "library_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("requested_by_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=100), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["requested_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_library_requests_id"), "library_requests", ["id"], unique=False)
    op.create_index(op.f("ix_library_requests_school_id"), "library_requests", ["school_id"], unique=False)
    op.create_index(op.f("ix_library_requests_status"), "library_requests", ["status"], unique=False)

    import json
    conn = op.get_bind()
    plans = [
        ("Starter", 150000, "UGX", 200, 20, {"library": False, "bulk_sms": False, "exports": False, "analytics": False, "mobile_app": False}, True),
        ("Growth", 400000, "UGX", 800, 80, {"library": True, "bulk_sms": True, "exports": False, "analytics": False, "mobile_app": False}, True),
        ("Professional", 900000, "UGX", 2500, 250, {"library": True, "bulk_sms": True, "exports": True, "analytics": True, "mobile_app": True}, True),
        ("Enterprise", 0, "UGX", None, None, {"library": True, "bulk_sms": True, "exports": True, "analytics": True, "mobile_app": True, "custom_branding": True, "api_access": True}, True),
    ]
    for name, price, currency, max_s, max_st, features, active in plans:
        conn.execute(
            sa.text(
                "INSERT INTO subscription_plans (name, price, currency_code, max_students, max_staff, features, is_active) "
                "VALUES (:name, :price, :currency_code, :max_students, :max_staff, CAST(:features AS jsonb), :is_active)"
            ),
            {"name": name, "price": price, "currency_code": currency, "max_students": max_s, "max_staff": max_st, "features": json.dumps(features), "is_active": active},
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_library_requests_status"), table_name="library_requests")
    op.drop_index(op.f("ix_library_requests_school_id"), table_name="library_requests")
    op.drop_index(op.f("ix_library_requests_id"), table_name="library_requests")
    op.drop_table("library_requests")

    op.drop_index(op.f("ix_library_borrows_status"), table_name="library_borrows")
    op.drop_index(op.f("ix_library_borrows_borrower_id"), table_name="library_borrows")
    op.drop_index(op.f("ix_library_borrows_book_id"), table_name="library_borrows")
    op.drop_index(op.f("ix_library_borrows_school_id"), table_name="library_borrows")
    op.drop_index(op.f("ix_library_borrows_id"), table_name="library_borrows")
    op.drop_table("library_borrows")

    op.drop_index(op.f("ix_library_books_curriculum_level"), table_name="library_books")
    op.drop_index(op.f("ix_library_books_subject_area"), table_name="library_books")
    op.drop_index(op.f("ix_library_books_education_tier"), table_name="library_books")
    op.drop_index(op.f("ix_library_books_isbn"), table_name="library_books")
    op.drop_index(op.f("ix_library_books_title"), table_name="library_books")
    op.drop_index(op.f("ix_library_books_school_id"), table_name="library_books")
    op.drop_index(op.f("ix_library_books_id"), table_name="library_books")
    op.drop_table("library_books")

    op.drop_index(op.f("ix_product_keys_expires_at"), table_name="product_keys")
    op.drop_index(op.f("ix_product_keys_key_hash"), table_name="product_keys")
    op.drop_index(op.f("ix_product_keys_school_id"), table_name="product_keys")
    op.drop_index(op.f("ix_product_keys_id"), table_name="product_keys")
    op.drop_table("product_keys")

    op.drop_index(op.f("ix_school_subscriptions_status"), table_name="school_subscriptions")
    op.drop_index(op.f("ix_school_subscriptions_school_id"), table_name="school_subscriptions")
    op.drop_index(op.f("ix_school_subscriptions_id"), table_name="school_subscriptions")
    op.drop_table("school_subscriptions")

    op.drop_index(op.f("ix_subscription_plans_id"), table_name="subscription_plans")
    op.drop_table("subscription_plans")
