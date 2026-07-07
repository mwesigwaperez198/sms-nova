"""foundation schema

Revision ID: 0001_foundation
Revises:
Create Date: 2026-06-06
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0001_foundation"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_roles_id"), "roles", ["id"], unique=False)
    op.create_index(op.f("ix_roles_name"), "roles", ["name"], unique=True)

    op.create_table(
        "schools",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("school_code", sa.String(length=30), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("country", sa.String(length=80), nullable=False),
        sa.Column("currency_code", sa.String(length=3), nullable=False),
        sa.Column("timezone", sa.String(length=80), nullable=False),
        sa.Column("subscription_status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_schools_id"), "schools", ["id"], unique=False)
    op.create_index(op.f("ix_schools_school_code"), "schools", ["school_code"], unique=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "(role_id = 1 AND school_id IS NULL) OR (role_id <> 1 AND school_id IS NOT NULL)",
            name="ck_users_school_scope_by_role",
        ),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_role_id"), "users", ["role_id"], unique=False)
    op.create_index(op.f("ix_users_school_id"), "users", ["school_id"], unique=False)

    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("admission_number", sa.String(length=80), nullable=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("class_name", sa.String(length=80), nullable=True),
        sa.Column("stream_name", sa.String(length=80), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("school_id", "admission_number", name="uq_students_school_admission"),
    )
    op.create_index(op.f("ix_students_admission_number"), "students", ["admission_number"], unique=False)
    op.create_index(op.f("ix_students_id"), "students", ["id"], unique=False)
    op.create_index(op.f("ix_students_school_id"), "students", ["school_id"], unique=False)

    op.create_table(
        "student_guardians",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("guardian_id", sa.Integer(), nullable=False),
        sa.Column("relationship", sa.String(length=50), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["guardian_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "guardian_id", name="uq_student_guardian"),
    )
    op.create_index(op.f("ix_student_guardians_guardian_id"), "student_guardians", ["guardian_id"], unique=False)
    op.create_index(op.f("ix_student_guardians_id"), "student_guardians", ["id"], unique=False)
    op.create_index(op.f("ix_student_guardians_student_id"), "student_guardians", ["student_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_student_guardians_student_id"), table_name="student_guardians")
    op.drop_index(op.f("ix_student_guardians_id"), table_name="student_guardians")
    op.drop_index(op.f("ix_student_guardians_guardian_id"), table_name="student_guardians")
    op.drop_table("student_guardians")
    op.drop_index(op.f("ix_students_school_id"), table_name="students")
    op.drop_index(op.f("ix_students_id"), table_name="students")
    op.drop_index(op.f("ix_students_admission_number"), table_name="students")
    op.drop_table("students")
    op.drop_index(op.f("ix_users_school_id"), table_name="users")
    op.drop_index(op.f("ix_users_role_id"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    op.drop_index(op.f("ix_schools_school_code"), table_name="schools")
    op.drop_index(op.f("ix_schools_id"), table_name="schools")
    op.drop_table("schools")
    op.drop_index(op.f("ix_roles_name"), table_name="roles")
    op.drop_index(op.f("ix_roles_id"), table_name="roles")
    op.drop_table("roles")
