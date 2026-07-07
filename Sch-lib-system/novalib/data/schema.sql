PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS library (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS account (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('librarian', 'member')),
    password_hash TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_profile (
    account_id INTEGER PRIMARY KEY,
    student_id TEXT UNIQUE,
    department TEXT,
    library_card_number TEXT UNIQUE,
    FOREIGN KEY (account_id) REFERENCES account(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS author (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS rack (
    id INTEGER PRIMARY KEY,
    number TEXT NOT NULL UNIQUE,
    location TEXT
);

CREATE TABLE IF NOT EXISTS book (
    id INTEGER PRIMARY KEY,
    isbn TEXT UNIQUE,
    title TEXT NOT NULL,
    subject TEXT,
    class_level TEXT,
    author_id INTEGER NOT NULL,
    pub_date TEXT,
    FOREIGN KEY (author_id) REFERENCES author(id)
);

CREATE TABLE IF NOT EXISTS book_item (
    id INTEGER PRIMARY KEY,
    book_id INTEGER NOT NULL,
    barcode TEXT NOT NULL UNIQUE,
    rack_id INTEGER,
    status TEXT NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'checked_out', 'reserved', 'lost')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES book(id),
    FOREIGN KEY (rack_id) REFERENCES rack(id)
);

CREATE TABLE IF NOT EXISTS book_lending (
    id INTEGER PRIMARY KEY,
    book_item_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    checkout_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    return_date TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'returned', 'overdue')),
    FOREIGN KEY (book_item_id) REFERENCES book_item(id),
    FOREIGN KEY (account_id) REFERENCES account(id)
);

CREATE TABLE IF NOT EXISTS book_reservation (
    id INTEGER PRIMARY KEY,
    book_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    creation_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fulfilled_date TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'fulfilled', 'cancelled')),
    FOREIGN KEY (book_id) REFERENCES book(id),
    FOREIGN KEY (account_id) REFERENCES account(id)
);

CREATE TABLE IF NOT EXISTS fine (
    id INTEGER PRIMARY KEY,
    lending_id INTEGER NOT NULL UNIQUE,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'unpaid'
        CHECK (status IN ('unpaid', 'paid')),
    FOREIGN KEY (lending_id) REFERENCES book_lending(id)
);

CREATE TABLE IF NOT EXISTS notification (
    id INTEGER PRIMARY KEY,
    account_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
    FOREIGN KEY (account_id) REFERENCES account(id)
);

CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY,
    actor_account_id INTEGER,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_account_id) REFERENCES account(id)
);

CREATE INDEX IF NOT EXISTS idx_account_role ON account(role);
CREATE INDEX IF NOT EXISTS idx_member_student_id ON member_profile(student_id);
CREATE INDEX IF NOT EXISTS idx_member_card ON member_profile(library_card_number);
CREATE INDEX IF NOT EXISTS idx_book_title ON book(title);
CREATE INDEX IF NOT EXISTS idx_book_subject ON book(subject);
CREATE INDEX IF NOT EXISTS idx_book_item_status ON book_item(status);
CREATE INDEX IF NOT EXISTS idx_lending_status_due ON book_lending(status, due_date);
CREATE INDEX IF NOT EXISTS idx_reservation_book_status ON book_reservation(book_id, status, creation_date);
