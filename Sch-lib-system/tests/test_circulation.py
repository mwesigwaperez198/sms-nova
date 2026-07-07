from datetime import date

import pytest

from novalib.db import Database
from novalib.services import NovaLibError, NovaLibService


class Clock:
    def __init__(self, value: date):
        self.value = value

    def today(self) -> date:
        return self.value


@pytest.fixture()
def service(tmp_path):
    db = Database(tmp_path / "novalib.sqlite3")
    db.initialize(seed=False)
    service = NovaLibService(db, today_provider=Clock(date(2026, 5, 1)).today)
    book_id = service.create_book(
        title="The Pragmatic Programmer",
        author_name="Andrew Hunt",
        subject="Software Engineering",
        class_level="O Level",
        isbn="9780201616224",
        rack_number="A1",
        copies=1,
    )
    member_id = service.register_member(
        name="Grace Nambi",
        email="grace@example.com",
        student_id="CS-001",
        department="Computer Science",
        library_card_number="",
    )
    return service, book_id, member_id


def test_checkout_accepts_student_id_when_library_card_is_missing(service):
    svc, _, _ = service

    result = svc.checkout_book("CS-001", "NVL0001001")

    assert result.due_date == "2026-05-11"
    loans = svc.list_active_loans()
    assert loans[0]["student_id"] == "CS-001"
    assert loans[0]["barcode"] == "NVL0001001"


def test_return_late_creates_fine(service):
    svc, _, _ = service
    clock = Clock(date(2026, 5, 1))
    svc.today_provider = clock.today
    svc.checkout_book("CS-001", "NVL0001001")

    clock.value = date(2026, 5, 14)
    result = svc.return_book("NVL0001001")

    assert result.fine_amount == 1500
    fines = svc.list_fines()
    assert fines[0]["amount"] == 1500
    assert fines[0]["status"] == "unpaid"


def test_reservation_blocks_renewal(service):
    svc, book_id, _ = service
    svc.checkout_book("CS-001", "NVL0001001")
    svc.register_member("Brian Ssenyonga", "brian@example.com", student_id="CS-002")
    reservation_id = svc.reserve_book(book_id, "CS-002")

    assert reservation_id > 0
    lending_id = svc.list_active_loans()[0]["id"]
    with pytest.raises(NovaLibError, match="reserved"):
        svc.renew_book(lending_id)


def test_librarian_can_locate_book_by_subject_and_level(service):
    svc, book_id, _ = service

    rows = svc.locate_books("Software", "O Level")

    assert rows[0]["book_id"] == book_id
    assert rows[0]["title"] == "The Pragmatic Programmer"
    assert rows[0]["class_level"] == "O Level"
    assert rows[0]["copies_available"] == 1
    assert rows[0]["shelves"] == "A1"
    assert rows[0]["available_barcode"] == "NVL0001001"


def test_school_profile_and_librarian_account_can_be_managed(service):
    svc, _, _ = service

    svc.update_school_profile("Kampala High School", "P.O. Box 100, Kampala", "C:/school/logo.png")
    librarian_id = svc.create_librarian("Sarah Admin", "sarah.admin@example.com", "+256700100200", "secret123")

    profile = svc.get_school_profile()
    librarians = svc.list_librarians()

    assert profile["name"] == "Kampala High School"
    assert profile["logo_path"] == "C:/school/logo.png"
    assert any(row["id"] == librarian_id and row["email"] == "sarah.admin@example.com" for row in librarians)


def test_theme_preference_is_saved(service):
    svc, _, _ = service

    assert svc.get_theme_key() == "classic_teal"

    svc.update_theme("forest_gold")

    assert svc.get_theme_key() == "forest_gold"


def test_librarian_can_change_own_password(service):
    svc, _, _ = service
    librarian_id = svc.create_librarian("Theme Admin", "theme.admin@example.com", password="oldpass")

    svc.change_password(librarian_id, "oldpass", "newpass1", "newpass1")

    assert svc.authenticate("theme.admin@example.com", "oldpass") is None
    assert svc.authenticate("theme.admin@example.com", "newpass1")["id"] == librarian_id
    with pytest.raises(NovaLibError, match="Current password"):
        svc.change_password(librarian_id, "badpass", "another1", "another1")


def test_catalog_book_can_be_updated(service):
    svc, book_id, _ = service

    svc.update_book(
        book_id,
        title="Updated Programming",
        author_name="New Author",
        subject="ICT",
        class_level="A Level",
        isbn="NEW-ISBN-1",
        pub_date="2026-01-01",
        rack_number="A-ICT",
    )

    book = svc.get_book(book_id)
    rows = svc.locate_books("ICT", "A Level")

    assert book["title"] == "Updated Programming"
    assert book["author"] == "New Author"
    assert book["shelf"] == "A-ICT"
    assert rows[0]["shelves"] == "A-ICT"
