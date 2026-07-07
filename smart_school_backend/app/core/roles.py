from enum import IntEnum


class RoleId(IntEnum):
    SUPER_ADMIN = 1
    ADMIN = 2
    TEACHER = 3
    PARENT = 4
    STUDENT = 5
    BURSAR = 6
    SECRETARY = 7
    LIBRARIAN = 8


ROLE_SEED_DATA = (
    {
        "id": RoleId.SUPER_ADMIN,
        "name": "super_admin",
        "description": "Platform owner with access to onboarding and tenant management.",
    },
    {
        "id": RoleId.ADMIN,
        "name": "admin",
        "description": "School administrator with full access inside one school.",
    },
    {
        "id": RoleId.TEACHER,
        "name": "teacher",
        "description": "Teacher who manages attendance and academic submissions.",
    },
    {
        "id": RoleId.PARENT,
        "name": "parent",
        "description": "Guardian who views linked children and makes fee payments.",
    },
    {
        "id": RoleId.STUDENT,
        "name": "student",
        "description": "Student account with access to own records.",
    },
    {
        "id": RoleId.BURSAR,
        "name": "bursar",
        "description": "Bursar who manages fees, invoices, and payments.",
    },
    {
        "id": RoleId.SECRETARY,
        "name": "secretary",
        "description": "Secretary who manages administrative tasks and communication.",
    },
    {
        "id": RoleId.LIBRARIAN,
        "name": "librarian",
        "description": "Librarian who manages library books and borrowing.",
    },
)
