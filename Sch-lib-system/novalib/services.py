from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Callable, Optional

from novalib.config import CHECKOUT_DAYS_DEFAULT, DAILY_FINE_UGX_DEFAULT, MAX_BOOKS_DEFAULT
from novalib.db import Database
from novalib.security import hash_password, verify_password


class NovaLibError(Exception):
    pass


class MemberLookupError(NovaLibError):
    pass


@dataclass(frozen=True)
class CheckoutResult:
    lending_id: int
    due_date: str
    message: str


@dataclass(frozen=True)
class ReturnResult:
    lending_id: int
    fine_amount: int
    message: str


class NovaLibService:
    def __init__(self, db: Database, today_provider: Callable[[], date] | None = None) -> None:
        self.db = db
        self.today_provider = today_provider or date.today

    def authenticate(self, username: str, password: str) -> Optional[dict]:
        identifier = username.strip()
        if not identifier or not password:
            return None

        with self.db.connect() as conn:
            row = conn.execute(
                """
                SELECT a.*
                FROM account a
                LEFT JOIN member_profile mp ON mp.account_id = a.id
                WHERE a.is_active = 1
                  AND (
                    lower(a.email) = lower(?)
                    OR lower(a.name) = lower(?)
                    OR lower(coalesce(mp.student_id, '')) = lower(?)
                    OR lower(coalesce(mp.library_card_number, '')) = lower(?)
                  )
                LIMIT 1
                """,
                (identifier, identifier, identifier, identifier),
            ).fetchone()
            if row and verify_password(password, row["password_hash"]):
                return dict(row)
        return None

    def dashboard_stats(self) -> dict[str, int]:
        with self.db.connect() as conn:
            members = conn.execute(
                "SELECT COUNT(*) AS count FROM account WHERE role = 'member' AND is_active = 1"
            ).fetchone()["count"]
            active_loans = conn.execute(
                "SELECT COUNT(*) AS count FROM book_lending WHERE status IN ('active', 'overdue')"
            ).fetchone()["count"]
            books = conn.execute("SELECT COUNT(*) AS count FROM book").fetchone()["count"]
            fines = conn.execute(
                "SELECT coalesce(SUM(amount), 0) AS total FROM fine WHERE status = 'unpaid'"
            ).fetchone()["total"]
            available = conn.execute(
                "SELECT COUNT(*) AS count FROM book_item WHERE status = 'available'"
            ).fetchone()["count"]
            reservations = conn.execute(
                "SELECT COUNT(*) AS count FROM book_reservation WHERE status = 'active'"
            ).fetchone()["count"]
        return {
            "members": int(members),
            "issued_books": int(active_loans),
            "books": int(books),
            "fine": int(fines),
            "available": int(available),
            "requested_books": int(reservations),
        }

    def get_school_profile(self) -> dict[str, str]:
        with self.db.connect() as conn:
            row = conn.execute("SELECT name, address FROM library WHERE id = 1").fetchone()
            logo = conn.execute("SELECT value FROM settings WHERE key = 'school_logo_path'").fetchone()
        return {
            "name": row["name"] if row else "NovaLib School Library",
            "address": row["address"] if row else "",
            "logo_path": logo["value"] if logo else "",
        }

    def update_school_profile(self, name: str, address: str = "", logo_path: str = "") -> None:
        name = name.strip()
        if not name:
            raise NovaLibError("School name is required")
        with self.db.connect() as conn:
            conn.execute(
                """
                INSERT INTO library(id, name, address)
                VALUES (1, ?, ?)
                ON CONFLICT(id) DO UPDATE SET name = excluded.name, address = excluded.address
                """,
                (name, address.strip()),
            )
            conn.execute(
                """
                INSERT INTO settings(key, value)
                VALUES ('school_logo_path', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                (logo_path.strip(),),
            )
            self._log(conn, None, "Updated school profile")

    def get_theme_key(self) -> str:
        with self.db.connect() as conn:
            row = conn.execute("SELECT value FROM settings WHERE key = 'theme'").fetchone()
        return row["value"] if row else "classic_teal"

    def update_theme(self, theme_key: str) -> None:
        theme_key = theme_key.strip()
        if not theme_key:
            raise NovaLibError("Choose a theme first")
        with self.db.connect() as conn:
            conn.execute(
                """
                INSERT INTO settings(key, value)
                VALUES ('theme', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                (theme_key,),
            )
            self._log(conn, None, f"Updated theme to {theme_key}")

    def list_librarians(self) -> list[dict]:
        with self.db.connect() as conn:
            rows = conn.execute(
                """
                SELECT id, name, email, phone, is_active, created_at
                FROM account
                WHERE role = 'librarian'
                ORDER BY name
                """
            ).fetchall()
        return [dict(row) for row in rows]

    def create_librarian(self, name: str, email: str, phone: str = "", password: str = "admin123") -> int:
        name = name.strip()
        email = email.strip()
        if not name:
            raise NovaLibError("Admin/librarian name is required")
        if not email:
            raise NovaLibError("Admin/librarian email is required")
        if not password:
            raise NovaLibError("Password is required")

        with self.db.connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO account(name, email, phone, role, password_hash, created_at)
                VALUES (?, ?, nullif(?, ''), 'librarian', ?, ?)
                """,
                (name, email, phone.strip(), hash_password(password), datetime.now().isoformat(timespec="seconds")),
            )
            account_id = int(cur.lastrowid)
            self._log(conn, account_id, f"Created librarian account {account_id}")
        return account_id

    def change_password(
        self,
        account_id: int,
        current_password: str,
        new_password: str,
        confirm_password: str = "",
    ) -> None:
        if not current_password:
            raise NovaLibError("Current password is required")
        if not new_password:
            raise NovaLibError("New password is required")
        if len(new_password) < 6:
            raise NovaLibError("New password must be at least 6 characters")
        if confirm_password and new_password != confirm_password:
            raise NovaLibError("New password and confirmation do not match")

        with self.db.connect() as conn:
            row = conn.execute(
                """
                SELECT id, role, password_hash, is_active
                FROM account
                WHERE id = ?
                """,
                (int(account_id),),
            ).fetchone()
            if row is None or row["role"] != "librarian" or int(row["is_active"]) != 1:
                raise NovaLibError("Admin/librarian account not found")
            if not verify_password(current_password, row["password_hash"]):
                raise NovaLibError("Current password is incorrect")
            conn.execute(
                "UPDATE account SET password_hash = ? WHERE id = ?",
                (hash_password(new_password), int(account_id)),
            )
            self._log(conn, int(account_id), "Changed admin/librarian password")

    def search_catalog(self, term: str = "", class_level: str = "") -> list[dict]:
        like = f"%{term.strip()}%"
        level_like = f"%{class_level.strip()}%"
        with self.db.connect() as conn:
            rows = conn.execute(
                """
                SELECT cv.*,
                       (
                         SELECT COUNT(*)
                         FROM book_reservation br
                         WHERE br.book_id = cv.book_id AND br.status = 'active'
                       ) AS active_reservations
                FROM catalog_view cv
                WHERE (
                    ? = '%%'
                    OR cv.title LIKE ?
                    OR cv.author LIKE ?
                    OR coalesce(cv.subject, '') LIKE ?
                    OR coalesce(cv.class_level, '') LIKE ?
                    OR coalesce(cv.pub_date, '') LIKE ?
                    OR coalesce(cv.isbn, '') LIKE ?
                    OR coalesce(cv.shelves, '') LIKE ?
                )
                AND (? = '%%' OR coalesce(cv.class_level, '') LIKE ?)
                ORDER BY cv.title
                """,
                (like, like, like, like, like, like, like, like, level_like, level_like),
            ).fetchall()
        return [dict(row) for row in rows]

    def locate_books(self, term: str = "", class_level: str = "") -> list[dict]:
        like = f"%{term.strip()}%"
        level_like = f"%{class_level.strip()}%"
        with self.db.connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    cv.book_id,
                    cv.title,
                    cv.author,
                    cv.subject,
                    cv.class_level,
                    cv.copies_total,
                    cv.copies_available,
                    coalesce(cv.available_shelves, cv.shelves, '') AS shelves,
                    (
                      SELECT bi.barcode
                      FROM book_item bi
                      WHERE bi.book_id = cv.book_id AND bi.status = 'available'
                      ORDER BY bi.id
                      LIMIT 1
                    ) AS available_barcode
                FROM catalog_view cv
                WHERE (
                    ? = '%%'
                    OR cv.title LIKE ?
                    OR cv.author LIKE ?
                    OR coalesce(cv.subject, '') LIKE ?
                    OR coalesce(cv.class_level, '') LIKE ?
                    OR coalesce(cv.isbn, '') LIKE ?
                    OR coalesce(cv.shelves, '') LIKE ?
                )
                AND (? = '%%' OR coalesce(cv.class_level, '') LIKE ?)
                ORDER BY
                    CASE WHEN cv.copies_available > 0 THEN 0 ELSE 1 END,
                    cv.title
                """,
                (like, like, like, like, like, like, like, level_like, level_like),
            ).fetchall()
        return [dict(row) for row in rows]

    def list_members(self, term: str = "") -> list[dict]:
        like = f"%{term.strip()}%"
        with self.db.connect() as conn:
            rows = conn.execute(
                """
                SELECT a.id, a.name, a.email, a.phone, a.is_active,
                       mp.student_id, mp.department, mp.library_card_number,
                       (
                         SELECT COUNT(*)
                         FROM book_lending bl
                         WHERE bl.account_id = a.id AND bl.status IN ('active', 'overdue')
                       ) AS active_loans,
                       (
                         SELECT coalesce(SUM(f.amount), 0)
                         FROM fine f
                         JOIN book_lending bl ON bl.id = f.lending_id
                         WHERE bl.account_id = a.id AND f.status = 'unpaid'
                       ) AS unpaid_fines
                FROM account a
                LEFT JOIN member_profile mp ON mp.account_id = a.id
                WHERE a.role = 'member'
                  AND (
                    ? = '%%'
                    OR a.name LIKE ?
                    OR a.email LIKE ?
                    OR coalesce(mp.student_id, '') LIKE ?
                    OR coalesce(mp.library_card_number, '') LIKE ?
                  )
                ORDER BY a.name
                """,
                (like, like, like, like, like),
            ).fetchall()
        return [dict(row) for row in rows]

    def list_active_loans(self) -> list[dict]:
        with self.db.connect() as conn:
            rows = conn.execute(
                """
                SELECT bl.id, a.name AS member, mp.student_id, b.title, b.subject,
                       b.class_level, bi.barcode, coalesce(r.number, '') AS shelf,
                       bl.checkout_date, bl.due_date, bl.status
                FROM book_lending bl
                JOIN account a ON a.id = bl.account_id
                LEFT JOIN member_profile mp ON mp.account_id = a.id
                JOIN book_item bi ON bi.id = bl.book_item_id
                JOIN book b ON b.id = bi.book_id
                LEFT JOIN rack r ON r.id = bi.rack_id
                WHERE bl.status IN ('active', 'overdue')
                ORDER BY bl.due_date, a.name
                """
            ).fetchall()
        return [dict(row) for row in rows]

    def list_reservations(self) -> list[dict]:
        with self.db.connect() as conn:
            rows = conn.execute(
                """
                SELECT br.id, br.creation_date, br.status, a.name AS member,
                       mp.student_id, b.title, b.subject, b.class_level,
                       coalesce(cv.copies_available, 0) AS copies_available,
                       CASE WHEN coalesce(cv.copies_available, 0) = 0
                            THEN 'Purchase / restock'
                            ELSE 'Available in stock'
                       END AS purchase_note
                FROM book_reservation br
                JOIN account a ON a.id = br.account_id
                LEFT JOIN member_profile mp ON mp.account_id = a.id
                JOIN book b ON b.id = br.book_id
                LEFT JOIN catalog_view cv ON cv.book_id = b.id
                ORDER BY br.status, br.creation_date
                """
            ).fetchall()
        return [dict(row) for row in rows]

    def list_fines(self) -> list[dict]:
        with self.db.connect() as conn:
            rows = conn.execute(
                """
                SELECT f.id, f.amount, f.date, f.status, a.name AS member,
                       mp.student_id, b.title, b.subject, b.class_level, bi.barcode,
                       bl.due_date, bl.return_date
                FROM fine f
                JOIN book_lending bl ON bl.id = f.lending_id
                JOIN account a ON a.id = bl.account_id
                LEFT JOIN member_profile mp ON mp.account_id = a.id
                JOIN book_item bi ON bi.id = bl.book_item_id
                JOIN book b ON b.id = bi.book_id
                ORDER BY f.status, f.date DESC
                """
            ).fetchall()
        return [dict(row) for row in rows]

    def create_book(
        self,
        title: str,
        author_name: str,
        subject: str = "",
        class_level: str = "",
        isbn: str = "",
        pub_date: str = "",
        rack_number: str = "",
        copies: int = 1,
    ) -> int:
        title = title.strip()
        author_name = author_name.strip()
        if not title:
            raise NovaLibError("Book title is required")
        if not author_name:
            raise NovaLibError("Author is required")
        if copies < 1:
            raise NovaLibError("At least one copy is required")

        with self.db.connect() as conn:
            author_id = self._get_or_create_author(conn, author_name)
            rack_id = self._get_or_create_rack(conn, rack_number) if rack_number.strip() else None

            book = None
            if isbn.strip():
                book = conn.execute("SELECT id FROM book WHERE isbn = ?", (isbn.strip(),)).fetchone()
            if book is None:
                book = conn.execute(
                    """
                    SELECT b.id
                    FROM book b
                    WHERE lower(b.title) = lower(?) AND b.author_id = ?
                    """,
                    (title, author_id),
                ).fetchone()

            if book:
                book_id = int(book["id"])
                conn.execute(
                    """
                    UPDATE book
                    SET subject = coalesce(nullif(?, ''), subject),
                        class_level = coalesce(nullif(?, ''), class_level),
                        pub_date = coalesce(nullif(?, ''), pub_date),
                        isbn = coalesce(nullif(?, ''), isbn)
                    WHERE id = ?
                    """,
                    (subject.strip(), class_level.strip(), pub_date.strip(), isbn.strip(), book_id),
                )
            else:
                cur = conn.execute(
                    """
                    INSERT INTO book(isbn, title, subject, class_level, author_id, pub_date)
                    VALUES (nullif(?, ''), ?, nullif(?, ''), nullif(?, ''), ?, nullif(?, ''))
                    """,
                    (isbn.strip(), title, subject.strip(), class_level.strip(), author_id, pub_date.strip()),
                )
                book_id = int(cur.lastrowid)

            current = conn.execute("SELECT COUNT(*) AS count FROM book_item WHERE book_id = ?", (book_id,)).fetchone()
            start = int(current["count"]) + 1
            for copy_number in range(start, start + copies):
                barcode = self._next_barcode(conn, book_id, copy_number)
                conn.execute(
                    "INSERT INTO book_item(book_id, barcode, rack_id, status) VALUES (?, ?, ?, 'available')",
                    (book_id, barcode, rack_id),
                )
            self._log(conn, None, f"Added {copies} book item(s) for book {book_id}")
        return book_id

    def get_book(self, book_id: int) -> dict:
        with self.db.connect() as conn:
            row = conn.execute(
                """
                SELECT b.id AS book_id, b.isbn, b.title, b.subject, b.class_level,
                       b.pub_date, a.name AS author,
                       (
                         SELECT r.number
                         FROM book_item bi
                         LEFT JOIN rack r ON r.id = bi.rack_id
                         WHERE bi.book_id = b.id
                         ORDER BY bi.id
                         LIMIT 1
                       ) AS shelf
                FROM book b
                JOIN author a ON a.id = b.author_id
                WHERE b.id = ?
                """,
                (int(book_id),),
            ).fetchone()
        if row is None:
            raise NovaLibError("Book not found")
        return dict(row)

    def update_book(
        self,
        book_id: int,
        title: str,
        author_name: str,
        subject: str = "",
        class_level: str = "",
        isbn: str = "",
        pub_date: str = "",
        rack_number: str = "",
    ) -> None:
        title = title.strip()
        author_name = author_name.strip()
        if not title:
            raise NovaLibError("Book title is required")
        if not author_name:
            raise NovaLibError("Author is required")

        with self.db.connect() as conn:
            existing = conn.execute("SELECT id FROM book WHERE id = ?", (int(book_id),)).fetchone()
            if existing is None:
                raise NovaLibError("Book not found")

            author_id = self._get_or_create_author(conn, author_name)
            conn.execute(
                """
                UPDATE book
                SET isbn = nullif(?, ''),
                    title = ?,
                    subject = nullif(?, ''),
                    class_level = nullif(?, ''),
                    author_id = ?,
                    pub_date = nullif(?, '')
                WHERE id = ?
                """,
                (
                    isbn.strip(),
                    title,
                    subject.strip(),
                    class_level.strip(),
                    author_id,
                    pub_date.strip(),
                    int(book_id),
                ),
            )

            if rack_number.strip():
                rack_id = self._get_or_create_rack(conn, rack_number.strip())
                conn.execute("UPDATE book_item SET rack_id = ? WHERE book_id = ?", (rack_id, int(book_id)))

            self._log(conn, None, f"Updated book {book_id}")

    def register_member(
        self,
        name: str,
        email: str,
        phone: str = "",
        student_id: str = "",
        department: str = "",
        library_card_number: str = "",
        password: str = "member123",
    ) -> int:
        name = name.strip()
        email = email.strip()
        if not name:
            raise NovaLibError("Member name is required")
        if not email:
            raise NovaLibError("Email is required")

        with self.db.connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO account(name, email, phone, role, password_hash, created_at)
                VALUES (?, ?, nullif(?, ''), 'member', ?, ?)
                """,
                (
                    name,
                    email,
                    phone.strip(),
                    hash_password(password or "member123"),
                    datetime.now().isoformat(timespec="seconds"),
                ),
            )
            account_id = int(cur.lastrowid)
            conn.execute(
                """
                INSERT INTO member_profile(account_id, student_id, department, library_card_number)
                VALUES (?, nullif(?, ''), nullif(?, ''), nullif(?, ''))
                """,
                (account_id, student_id.strip(), department.strip(), library_card_number.strip()),
            )
            self._log(conn, None, f"Registered member {account_id}")
        return account_id

    def checkout_book(
        self,
        member_identifier: str,
        book_barcode: str,
        librarian_id: int | None = None,
    ) -> CheckoutResult:
        member_identifier = member_identifier.strip()
        book_barcode = book_barcode.strip()
        if not member_identifier:
            raise NovaLibError("Member identifier is required")
        if not book_barcode:
            raise NovaLibError("Book barcode is required")

        today = self.today_provider()
        checkout_date = today.isoformat()
        due_date = (today + timedelta(days=self._setting_int("checkout_days", CHECKOUT_DAYS_DEFAULT))).isoformat()

        with self.db.connect() as conn:
            account = self._resolve_member(conn, member_identifier)
            active_loans = self._active_loan_count(conn, int(account["id"]))
            max_books = self._setting_int("max_books", MAX_BOOKS_DEFAULT, conn)
            if active_loans >= max_books:
                raise NovaLibError(f"Checkout limit reached ({max_books} books)")

            item = conn.execute(
                """
                SELECT bi.*, b.title
                FROM book_item bi
                JOIN book b ON b.id = bi.book_id
                WHERE lower(bi.barcode) = lower(?)
                """,
                (book_barcode,),
            ).fetchone()
            if item is None:
                raise NovaLibError("Book item not found")

            reservation = self._first_active_reservation(conn, int(item["book_id"]))
            if item["status"] == "reserved":
                if reservation is None or int(reservation["account_id"]) != int(account["id"]):
                    raise NovaLibError("Book is reserved for another member")
            elif item["status"] != "available":
                raise NovaLibError("Book unavailable")
            elif reservation is not None and int(reservation["account_id"]) != int(account["id"]):
                raise NovaLibError("Book is reserved for another member")

            cur = conn.execute(
                """
                INSERT INTO book_lending(book_item_id, account_id, checkout_date, due_date, status)
                VALUES (?, ?, ?, ?, 'active')
                """,
                (int(item["id"]), int(account["id"]), checkout_date, due_date),
            )
            lending_id = int(cur.lastrowid)
            conn.execute("UPDATE book_item SET status = 'checked_out' WHERE id = ?", (int(item["id"]),))

            if reservation is not None and int(reservation["account_id"]) == int(account["id"]):
                conn.execute(
                    """
                    UPDATE book_reservation
                    SET status = 'fulfilled', fulfilled_date = ?
                    WHERE id = ?
                    """,
                    (checkout_date, int(reservation["id"])),
                )

            self._notify(conn, int(account["id"]), f"Checked out {item['title']}. Due {due_date}.")
            self._log(conn, librarian_id, f"Checked out {book_barcode} to account {account['id']}")

        return CheckoutResult(lending_id, due_date, f"Success. Due date: {due_date}")

    def return_book(self, book_barcode: str, librarian_id: int | None = None) -> ReturnResult:
        book_barcode = book_barcode.strip()
        if not book_barcode:
            raise NovaLibError("Book barcode is required")

        today = self.today_provider()
        return_date = today.isoformat()

        with self.db.connect() as conn:
            item = conn.execute(
                "SELECT * FROM book_item WHERE lower(barcode) = lower(?)",
                (book_barcode,),
            ).fetchone()
            if item is None:
                raise NovaLibError("Book item not found")

            lending = conn.execute(
                """
                SELECT *
                FROM book_lending
                WHERE book_item_id = ? AND status IN ('active', 'overdue')
                ORDER BY checkout_date DESC
                LIMIT 1
                """,
                (int(item["id"]),),
            ).fetchone()
            if lending is None:
                raise NovaLibError("Book not checked out")

            due = date.fromisoformat(lending["due_date"])
            days_late = max(0, (today - due).days)
            fine_amount = days_late * self._setting_int("daily_fine_ugx", DAILY_FINE_UGX_DEFAULT, conn)

            conn.execute(
                """
                UPDATE book_lending
                SET return_date = ?, status = 'returned'
                WHERE id = ?
                """,
                (return_date, int(lending["id"])),
            )

            if fine_amount:
                conn.execute(
                    """
                    INSERT INTO fine(lending_id, amount, date, status)
                    VALUES (?, ?, ?, 'unpaid')
                    ON CONFLICT(lending_id) DO UPDATE SET amount = excluded.amount, status = 'unpaid'
                    """,
                    (int(lending["id"]), fine_amount, return_date),
                )

            next_reservation = self._first_active_reservation(conn, int(item["book_id"]))
            if next_reservation:
                conn.execute("UPDATE book_item SET status = 'reserved' WHERE id = ?", (int(item["id"]),))
                self._notify(
                    conn,
                    int(next_reservation["account_id"]),
                    f"Reserved book is ready for pickup: {book_barcode}.",
                )
            else:
                conn.execute("UPDATE book_item SET status = 'available' WHERE id = ?", (int(item["id"]),))

            self._notify(conn, int(lending["account_id"]), f"Returned {book_barcode}. Fine: UGX {fine_amount}.")
            self._log(conn, librarian_id, f"Returned {book_barcode}; fine UGX {fine_amount}")

        return ReturnResult(int(lending["id"]), fine_amount, f"Returned. Fine: UGX {fine_amount}")

    def renew_book(self, lending_id: int, librarian_id: int | None = None) -> str:
        today = self.today_provider()
        with self.db.connect() as conn:
            lending = conn.execute(
                """
                SELECT bl.*, bi.book_id
                FROM book_lending bl
                JOIN book_item bi ON bi.id = bl.book_item_id
                WHERE bl.id = ? AND bl.status IN ('active', 'overdue')
                """,
                (int(lending_id),),
            ).fetchone()
            if lending is None:
                raise NovaLibError("Invalid lending")

            unpaid = self._unpaid_fines(conn, int(lending["account_id"]))
            if unpaid > 0:
                raise NovaLibError("Clear fines first")

            if self._first_active_reservation(conn, int(lending["book_id"])) is not None:
                raise NovaLibError("Book is reserved")

            current_due = date.fromisoformat(lending["due_date"])
            base = max(today, current_due)
            new_due = (base + timedelta(days=self._setting_int("checkout_days", CHECKOUT_DAYS_DEFAULT, conn))).isoformat()
            conn.execute(
                "UPDATE book_lending SET due_date = ?, status = 'active' WHERE id = ?",
                (new_due, int(lending["id"])),
            )
            self._notify(conn, int(lending["account_id"]), f"Loan renewed. New due date: {new_due}.")
            self._log(conn, librarian_id, f"Renewed lending {lending_id} to {new_due}")
        return f"Renewed. New due date: {new_due}"

    def reserve_book(
        self,
        book_id: int,
        member_identifier: str,
        librarian_id: int | None = None,
    ) -> int:
        with self.db.connect() as conn:
            account = self._resolve_member(conn, member_identifier.strip())
            book = conn.execute("SELECT * FROM book WHERE id = ?", (int(book_id),)).fetchone()
            if book is None:
                raise NovaLibError("Book not found")

            available = conn.execute(
                "SELECT COUNT(*) AS count FROM book_item WHERE book_id = ? AND status = 'available'",
                (int(book_id),),
            ).fetchone()["count"]
            if int(available) > 0:
                raise NovaLibError("Book is available for checkout")

            duplicate = conn.execute(
                """
                SELECT id FROM book_reservation
                WHERE book_id = ? AND account_id = ? AND status = 'active'
                """,
                (int(book_id), int(account["id"])),
            ).fetchone()
            if duplicate:
                raise NovaLibError("Member already has an active reservation for this book")

            cur = conn.execute(
                """
                INSERT INTO book_reservation(book_id, account_id, creation_date, status)
                VALUES (?, ?, ?, 'active')
                """,
                (int(book_id), int(account["id"]), datetime.now().isoformat(timespec="seconds")),
            )
            reservation_id = int(cur.lastrowid)
            self._notify(conn, int(account["id"]), f"Reservation created for {book['title']}.")
            self._log(conn, librarian_id, f"Reserved book {book_id} for account {account['id']}")
        return reservation_id

    def run_daily_housekeeping(self) -> int:
        today = self.today_provider().isoformat()
        updated = 0
        with self.db.connect() as conn:
            rows = conn.execute(
                """
                SELECT bl.id, bl.account_id, b.title, bl.due_date
                FROM book_lending bl
                JOIN book_item bi ON bi.id = bl.book_item_id
                JOIN book b ON b.id = bi.book_id
                WHERE bl.status = 'active' AND bl.due_date < ?
                """,
                (today,),
            ).fetchall()
            for row in rows:
                conn.execute("UPDATE book_lending SET status = 'overdue' WHERE id = ?", (int(row["id"]),))
                self._notify(conn, int(row["account_id"]), f"Overdue: {row['title']} was due {row['due_date']}.")
                updated += 1
            self._log(conn, None, f"Daily housekeeping marked {updated} loan(s) overdue")
        return updated

    def _resolve_member(self, conn, identifier: str):
        if not identifier:
            raise MemberLookupError("Member identifier is required")

        by_id = None
        if identifier.isdigit():
            by_id = conn.execute(
                """
                SELECT a.*, mp.student_id, mp.library_card_number
                FROM account a
                LEFT JOIN member_profile mp ON mp.account_id = a.id
                WHERE a.id = ? AND a.role = 'member' AND a.is_active = 1
                """,
                (int(identifier),),
            ).fetchone()
            if by_id:
                return by_id

        exact = conn.execute(
            """
            SELECT a.*, mp.student_id, mp.library_card_number
            FROM account a
            LEFT JOIN member_profile mp ON mp.account_id = a.id
            WHERE a.role = 'member' AND a.is_active = 1
              AND (
                lower(a.email) = lower(?)
                OR lower(coalesce(mp.student_id, '')) = lower(?)
                OR lower(coalesce(mp.library_card_number, '')) = lower(?)
              )
            """,
            (identifier, identifier, identifier),
        ).fetchall()
        if len(exact) == 1:
            return exact[0]
        if len(exact) > 1:
            raise MemberLookupError("Member identifier matched multiple accounts")

        like = f"%{identifier}%"
        rows = conn.execute(
            """
            SELECT a.*, mp.student_id, mp.library_card_number
            FROM account a
            LEFT JOIN member_profile mp ON mp.account_id = a.id
            WHERE a.role = 'member' AND a.is_active = 1 AND a.name LIKE ?
            ORDER BY a.name
            """,
            (like,),
        ).fetchall()
        if len(rows) == 1:
            return rows[0]
        if len(rows) > 1:
            raise MemberLookupError("Name matched multiple members. Use student ID or library card.")
        raise MemberLookupError("Member not found")

    def _setting_int(self, key: str, default: int, conn=None) -> int:
        if conn is not None:
            row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
        else:
            row = self.db.query_one("SELECT value FROM settings WHERE key = ?", (key,))
        if not row:
            return default
        try:
            return int(row["value"])
        except (TypeError, ValueError):
            return default

    def _active_loan_count(self, conn, account_id: int) -> int:
        return int(
            conn.execute(
                """
                SELECT COUNT(*) AS count
                FROM book_lending
                WHERE account_id = ? AND status IN ('active', 'overdue')
                """,
                (account_id,),
            ).fetchone()["count"]
        )

    def _unpaid_fines(self, conn, account_id: int) -> int:
        return int(
            conn.execute(
                """
                SELECT coalesce(SUM(f.amount), 0) AS amount
                FROM fine f
                JOIN book_lending bl ON bl.id = f.lending_id
                WHERE bl.account_id = ? AND f.status = 'unpaid'
                """,
                (account_id,),
            ).fetchone()["amount"]
        )

    def _first_active_reservation(self, conn, book_id: int):
        return conn.execute(
            """
            SELECT *
            FROM book_reservation
            WHERE book_id = ? AND status = 'active'
            ORDER BY creation_date, id
            LIMIT 1
            """,
            (book_id,),
        ).fetchone()

    def _get_or_create_author(self, conn, name: str) -> int:
        row = conn.execute("SELECT id FROM author WHERE lower(name) = lower(?)", (name,)).fetchone()
        if row:
            return int(row["id"])
        cur = conn.execute("INSERT INTO author(name) VALUES (?)", (name,))
        return int(cur.lastrowid)

    def _get_or_create_rack(self, conn, number: str) -> int:
        row = conn.execute("SELECT id FROM rack WHERE lower(number) = lower(?)", (number,)).fetchone()
        if row:
            return int(row["id"])
        cur = conn.execute("INSERT INTO rack(number, location) VALUES (?, ?)", (number, f"Section {number[:1]}"))
        return int(cur.lastrowid)

    def _next_barcode(self, conn, book_id: int, copy_number: int) -> str:
        barcode = f"NVL{book_id:04d}{copy_number:03d}"
        while conn.execute("SELECT 1 FROM book_item WHERE barcode = ?", (barcode,)).fetchone():
            copy_number += 1
            barcode = f"NVL{book_id:04d}{copy_number:03d}"
        return barcode

    def _notify(self, conn, account_id: int, content: str) -> None:
        conn.execute(
            "INSERT INTO notification(account_id, content, date, is_read) VALUES (?, ?, ?, 0)",
            (account_id, content, datetime.now().isoformat(timespec="seconds")),
        )

    def _log(self, conn, actor_id: int | None, content: str) -> None:
        conn.execute(
            "INSERT INTO activity_log(actor_account_id, content, created_at) VALUES (?, ?, ?)",
            (actor_id, content, datetime.now().isoformat(timespec="seconds")),
        )
