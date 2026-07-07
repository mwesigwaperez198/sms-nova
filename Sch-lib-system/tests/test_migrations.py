from novalib.db import Database


def test_existing_database_without_class_level_is_upgraded(tmp_path):
    db_path = tmp_path / "old-novalib.sqlite3"
    db = Database(db_path)

    with db.connect() as conn:
        conn.executescript(
            """
            CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE library (id INTEGER PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL);
            CREATE TABLE author (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT);
            CREATE TABLE rack (id INTEGER PRIMARY KEY, number TEXT NOT NULL UNIQUE, location TEXT);
            CREATE TABLE book (
                id INTEGER PRIMARY KEY,
                isbn TEXT UNIQUE,
                title TEXT NOT NULL,
                subject TEXT,
                author_id INTEGER NOT NULL,
                pub_date TEXT,
                FOREIGN KEY (author_id) REFERENCES author(id)
            );
            CREATE TABLE book_item (
                id INTEGER PRIMARY KEY,
                book_id INTEGER NOT NULL,
                barcode TEXT NOT NULL UNIQUE,
                rack_id INTEGER,
                status TEXT NOT NULL DEFAULT 'available',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (book_id) REFERENCES book(id),
                FOREIGN KEY (rack_id) REFERENCES rack(id)
            );
            CREATE TABLE account (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                phone TEXT,
                role TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE member_profile (
                account_id INTEGER PRIMARY KEY,
                student_id TEXT UNIQUE,
                department TEXT,
                library_card_number TEXT UNIQUE,
                FOREIGN KEY (account_id) REFERENCES account(id) ON DELETE CASCADE
            );
            CREATE TABLE book_lending (
                id INTEGER PRIMARY KEY,
                book_item_id INTEGER NOT NULL,
                account_id INTEGER NOT NULL,
                checkout_date TEXT NOT NULL,
                due_date TEXT NOT NULL,
                return_date TEXT,
                status TEXT NOT NULL DEFAULT 'active'
            );
            CREATE TABLE book_reservation (
                id INTEGER PRIMARY KEY,
                book_id INTEGER NOT NULL,
                account_id INTEGER NOT NULL,
                creation_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                fulfilled_date TEXT,
                status TEXT NOT NULL DEFAULT 'active'
            );
            CREATE TABLE fine (
                id INTEGER PRIMARY KEY,
                lending_id INTEGER NOT NULL UNIQUE,
                amount INTEGER NOT NULL,
                date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                status TEXT NOT NULL DEFAULT 'unpaid'
            );
            CREATE TABLE notification (
                id INTEGER PRIMARY KEY,
                account_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                is_read INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE activity_log (
                id INTEGER PRIMARY KEY,
                actor_account_id INTEGER,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO author(id, name) VALUES (1, 'Old Author');
            INSERT INTO rack(id, number, location) VALUES (1, 'OLD-A1', 'Old section');
            INSERT INTO book(id, isbn, title, subject, author_id, pub_date)
            VALUES (1, 'OLD-1', 'Old Book', 'Mathematics', 1, '2020-01-01');
            INSERT INTO book_item(book_id, barcode, rack_id, status)
            VALUES (1, 'OLD001', 1, 'available');
            """
        )

    db.initialize(seed=False)

    with db.connect() as conn:
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(book)").fetchall()}
        row = conn.execute(
            """
            SELECT title, subject, class_level, shelves, copies_available
            FROM catalog_view
            WHERE book_id = 1
            """
        ).fetchone()

    assert "class_level" in columns
    assert row["title"] == "Old Book"
    assert row["shelves"] == "OLD-A1"
    assert row["copies_available"] == 1

