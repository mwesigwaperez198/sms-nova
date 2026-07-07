from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime
from importlib import resources
from pathlib import Path
from typing import Iterable, Iterator, Optional

from novalib.config import (
    CHECKOUT_DAYS_DEFAULT,
    DAILY_FINE_UGX_DEFAULT,
    DEFAULT_ADMIN_EMAIL,
    DEFAULT_ADMIN_PASSWORD,
    MAX_BOOKS_DEFAULT,
    database_path,
)
from novalib.security import hash_password


class Database:
    def __init__(self, path: Optional[Path | str] = None) -> None:
        self.path = Path(path) if path is not None else database_path()

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def initialize(self, seed: bool = True) -> None:
        schema = resources.files("novalib.data").joinpath("schema.sql").read_text(encoding="utf-8")
        with self.connect() as conn:
            conn.executescript(schema)
            self._migrate(conn)
            self._ensure_catalog_view(conn)
        if seed:
            self.seed_defaults()

    def seed_defaults(self) -> None:
        with self.connect() as conn:
            self._seed_settings(conn)
            self._seed_library(conn)
            admin_id = self._seed_admin(conn)
            self._seed_sample_catalog(conn)
            self._seed_sample_members(conn)
            self._log(conn, admin_id, "NovaLib database initialized")

    def query_one(self, sql: str, params: Iterable[object] = ()) -> Optional[sqlite3.Row]:
        with self.connect() as conn:
            return conn.execute(sql, tuple(params)).fetchone()

    def query_all(self, sql: str, params: Iterable[object] = ()) -> list[sqlite3.Row]:
        with self.connect() as conn:
            return conn.execute(sql, tuple(params)).fetchall()

    def execute(self, sql: str, params: Iterable[object] = ()) -> int:
        with self.connect() as conn:
            cur = conn.execute(sql, tuple(params))
            return int(cur.lastrowid)

    def _seed_settings(self, conn: sqlite3.Connection) -> None:
        settings = {
            "max_books": str(MAX_BOOKS_DEFAULT),
            "checkout_days": str(CHECKOUT_DAYS_DEFAULT),
            "daily_fine_ugx": str(DAILY_FINE_UGX_DEFAULT),
            "reservation_hold_days": "3",
            "theme": "classic_teal",
        }
        conn.executemany(
            "INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)",
            settings.items(),
        )

    def _seed_library(self, conn: sqlite3.Connection) -> None:
        conn.execute(
            "INSERT OR IGNORE INTO library(id, name, address) VALUES (1, ?, ?)",
            ("NovaLib Central Library", "Novara Team Campus"),
        )

    def _seed_admin(self, conn: sqlite3.Connection) -> int:
        row = conn.execute("SELECT id FROM account WHERE email = ?", (DEFAULT_ADMIN_EMAIL,)).fetchone()
        if row:
            return int(row["id"])

        now = datetime.now().isoformat(timespec="seconds")
        cur = conn.execute(
            """
            INSERT INTO account(name, email, phone, role, password_hash, created_at)
            VALUES (?, ?, ?, 'librarian', ?, ?)
            """,
            ("Admin", DEFAULT_ADMIN_EMAIL, "+256700000000", hash_password(DEFAULT_ADMIN_PASSWORD), now),
        )
        return int(cur.lastrowid)

    def _seed_sample_catalog(self, conn: sqlite3.Connection) -> None:
        samples = [
            ("New Secondary Mathematics", "Uganda Curriculum Team", "Mathematics", "NVL-UG-MATH-O", "O Level", "2024-01-01", "O-MATH", 4),
            ("Integrated Science for Lower Secondary", "Uganda Curriculum Team", "Integrated Science", "NVL-UG-SCI-O", "O Level", "2024-01-01", "O-SCI", 4),
            ("Things Fall Apart", "Chinua Achebe", "Literature", "9780385474542", "O Level", "1994-09-01", "O-LIT", 3),
            ("Advanced Level Biology", "Uganda Curriculum Team", "Biology", "NVL-UG-BIO-A", "A Level", "2024-01-01", "A-BIO", 3),
            ("Principles of Accounts", "Uganda Curriculum Team", "Accounts", "NVL-UG-ACC-A", "A Level", "2024-01-01", "A-ACC", 3),
        ]
        for title, author, subject, isbn, class_level, pub_date, rack_number, copies in samples:
            author_id = self._get_or_create_author(conn, author)
            rack_id = self._get_or_create_rack(conn, rack_number, f"Section {rack_number[0]}")
            book = conn.execute("SELECT id FROM book WHERE isbn = ?", (isbn,)).fetchone()
            if book:
                book_id = int(book["id"])
                conn.execute(
                    """
                    UPDATE book
                    SET subject = ?, class_level = ?, pub_date = ?
                    WHERE id = ?
                    """,
                    (subject, class_level, pub_date, book_id),
                )
            else:
                cur = conn.execute(
                    """
                    INSERT INTO book(isbn, title, subject, class_level, author_id, pub_date)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (isbn, title, subject, class_level, author_id, pub_date),
                )
                book_id = int(cur.lastrowid)

            current = conn.execute("SELECT COUNT(*) AS count FROM book_item WHERE book_id = ?", (book_id,)).fetchone()
            for copy_number in range(int(current["count"]) + 1, copies + 1):
                barcode = f"NVL{book_id:04d}{copy_number:03d}"
                conn.execute(
                    "INSERT OR IGNORE INTO book_item(book_id, barcode, rack_id, status) VALUES (?, ?, ?, 'available')",
                    (book_id, barcode, rack_id),
                )

    def _seed_sample_members(self, conn: sqlite3.Connection) -> None:
        members = [
            ("Amina Kato", "amina.kato@example.com", "+256701000001", "CS-2026-001", "Computer Science", None),
            ("Daniel Okello", "daniel.okello@example.com", "+256701000002", "BUS-2026-014", "Business", "CARD-1001"),
            ("Leah Nsubuga", "leah.nsubuga@example.com", "+256701000003", "EDU-2026-022", "Education", None),
        ]
        for name, email, phone, student_id, department, card in members:
            account = conn.execute("SELECT id FROM account WHERE email = ?", (email,)).fetchone()
            if account:
                account_id = int(account["id"])
            else:
                cur = conn.execute(
                    """
                    INSERT INTO account(name, email, phone, role, password_hash, created_at)
                    VALUES (?, ?, ?, 'member', ?, ?)
                    """,
                    (
                        name,
                        email,
                        phone,
                        hash_password("member123"),
                        datetime.now().isoformat(timespec="seconds"),
                    ),
                )
                account_id = int(cur.lastrowid)
            conn.execute(
                """
                INSERT OR IGNORE INTO member_profile(account_id, student_id, department, library_card_number)
                VALUES (?, ?, ?, ?)
                """,
                (account_id, student_id, department, card),
            )

    def _get_or_create_author(self, conn: sqlite3.Connection, name: str) -> int:
        row = conn.execute("SELECT id FROM author WHERE lower(name) = lower(?)", (name,)).fetchone()
        if row:
            return int(row["id"])
        cur = conn.execute("INSERT INTO author(name) VALUES (?)", (name,))
        return int(cur.lastrowid)

    def _get_or_create_rack(self, conn: sqlite3.Connection, number: str, location: str | None = None) -> int:
        row = conn.execute("SELECT id FROM rack WHERE lower(number) = lower(?)", (number,)).fetchone()
        if row:
            return int(row["id"])
        cur = conn.execute("INSERT INTO rack(number, location) VALUES (?, ?)", (number, location))
        return int(cur.lastrowid)

    def _migrate(self, conn: sqlite3.Connection) -> None:
        if not self._has_column(conn, "book", "class_level"):
            conn.execute("ALTER TABLE book ADD COLUMN class_level TEXT")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_book_class_level ON book(class_level)")

    def _has_column(self, conn: sqlite3.Connection, table: str, column: str) -> bool:
        rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
        return any(row["name"] == column for row in rows)

    def _ensure_catalog_view(self, conn: sqlite3.Connection) -> None:
        conn.execute("DROP VIEW IF EXISTS catalog_view")
        conn.execute(
            """
            CREATE VIEW catalog_view AS
            SELECT
                b.id AS book_id,
                b.isbn,
                b.title,
                b.subject,
                b.class_level,
                b.pub_date,
                a.name AS author,
                COUNT(bi.id) AS copies_total,
                COALESCE(SUM(CASE WHEN bi.status = 'available' THEN 1 ELSE 0 END), 0) AS copies_available,
                GROUP_CONCAT(DISTINCT r.number) AS shelves,
                GROUP_CONCAT(DISTINCT CASE WHEN bi.status = 'available' THEN r.number END) AS available_shelves
            FROM book b
            JOIN author a ON a.id = b.author_id
            LEFT JOIN book_item bi ON bi.book_id = b.id
            LEFT JOIN rack r ON r.id = bi.rack_id
            GROUP BY b.id, b.isbn, b.title, b.subject, b.class_level, b.pub_date, a.name
            """
        )

    def _log(self, conn: sqlite3.Connection, actor_id: int | None, content: str) -> None:
        conn.execute(
            "INSERT INTO activity_log(actor_account_id, content) VALUES (?, ?)",
            (actor_id, content),
        )
