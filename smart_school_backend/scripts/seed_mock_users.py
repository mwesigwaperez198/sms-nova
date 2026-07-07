from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.config import get_settings
from app.core.roles import RoleId
from app.core.security import hash_password
from app.db.seed import seed_roles
from app.db.session import SessionLocal
from app.models.attendance import Attendance
from app.models.audit import AuditLog
from app.models.fees import FeeCategory, Invoice, Payment, Receipt
from app.models.notification import Notification
from app.models.report_card import ReportCard
from app.models.school import School
from app.models.student import Student, StudentGuardian
from app.models.sync import SyncChange
from app.models.user import User
from app.services.onboarding_service import DEFAULT_FEE_CATEGORIES


DEMO_PASSWORD = "DemoPass123!"


def clear_demo_data(db):
    for model in (
        SyncChange,
        AuditLog,
        Notification,
        Receipt,
        Payment,
        ReportCard,
        Attendance,
        Invoice,
        FeeCategory,
        StudentGuardian,
        Student,
        User,
        School,
    ):
        db.query(model).delete(synchronize_session=False)
    db.commit()


def seed_demo_data():
    settings = get_settings()
    db = SessionLocal()
    try:
        seed_roles(db)
        clear_demo_data(db)

        super_admin_email = settings.initial_super_admin_email or "owner@example.com"
        super_admin_password = settings.initial_super_admin_password or "ChangeMe123!"
        super_admin_name = settings.initial_super_admin_name or "Platform Owner"

        super_admin = User(
            name=super_admin_name,
            email=super_admin_email.lower(),
            password_hash=hash_password(super_admin_password),
            role_id=RoleId.SUPER_ADMIN,
            school_id=None,
        )
        db.add(super_admin)
        db.flush()

        school = School(
            name="Demo Smart School",
            school_code="DEMO",
            address="Kampala, Uganda",
            phone="+256700000000",
            email="info@demo.ac.ug",
            country=settings.default_country,
            currency_code=settings.default_currency_code,
            timezone=settings.default_timezone,
            subscription_status="trial",
        )
        db.add(school)
        db.flush()

        for category_name in DEFAULT_FEE_CATEGORIES:
            db.add(FeeCategory(school_id=school.id, name=category_name))

        admin = User(
            name="Demo School Admin",
            email="admin@demo.ac.ug",
            password_hash=hash_password(DEMO_PASSWORD),
            role_id=RoleId.ADMIN,
            school_id=school.id,
        )
        teacher = User(
            name="Demo Teacher",
            email="teacher@demo.ac.ug",
            password_hash=hash_password(DEMO_PASSWORD),
            role_id=RoleId.TEACHER,
            school_id=school.id,
        )
        parent = User(
            name="Demo Parent",
            email="parent@demo.ac.ug",
            password_hash=hash_password(DEMO_PASSWORD),
            role_id=RoleId.PARENT,
            school_id=school.id,
        )
        student_user = User(
            name="Demo Student",
            email="student@demo.ac.ug",
            password_hash=hash_password(DEMO_PASSWORD),
            role_id=RoleId.STUDENT,
            school_id=school.id,
        )
        bursar = User(
            name="Demo Bursar",
            email="bursar@demo.ac.ug",
            password_hash=hash_password(DEMO_PASSWORD),
            role_id=RoleId.BURSAR,
            school_id=school.id,
        )
        secretary = User(
            name="Demo Secretary",
            email="secretary@demo.ac.ug",
            password_hash=hash_password(DEMO_PASSWORD),
            role_id=RoleId.SECRETARY,
            school_id=school.id,
        )
        librarian = User(
            name="Demo Librarian",
            email="librarian@demo.ac.ug",
            password_hash=hash_password(DEMO_PASSWORD),
            role_id=RoleId.LIBRARIAN,
            school_id=school.id,
        )
        db.add_all([admin, teacher, parent, student_user, bursar, secretary, librarian])
        db.flush()

        student = Student(
            school_id=school.id,
            user_id=student_user.id,
            admission_number="DEMO-001",
            name="Demo Student",
            class_name="S1",
            stream_name="East",
        )
        db.add(student)
        db.flush()

        db.add(
            StudentGuardian(
                student_id=student.id,
                guardian_id=parent.id,
                relationship="guardian",
                is_primary=True,
            )
        )

        db.commit()

        print("Mock data seeded successfully.")
        print("")
        print("School:")
        print("  Demo Smart School (DEMO)")
        print("")
        print("Users:")
        print(f"  super_admin: {super_admin.email} / {super_admin_password}")
        print(f"  admin:       {admin.email} / {DEMO_PASSWORD}")
        print(f"  teacher:     {teacher.email} / {DEMO_PASSWORD}")
        print(f"  parent:      {parent.email} / {DEMO_PASSWORD}")
        print(f"  student:     {student_user.email} / {DEMO_PASSWORD}")
        print(f"  bursar:      {bursar.email} / {DEMO_PASSWORD}")
        print(f"  secretary:   {secretary.email} / {DEMO_PASSWORD}")
        print(f"  librarian:   {librarian.email} / {DEMO_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
