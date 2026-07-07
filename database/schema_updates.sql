-- SMS schema update scaffold.
-- Review against the existing database before applying.

CREATE TABLE IF NOT EXISTS schools (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  logo_url TEXT,
  primary_color VARCHAR(20) DEFAULT '#166534',
  secondary_color VARCHAR(20) DEFAULT '#1e3a8a',
  phone VARCHAR(40),
  email VARCHAR(160),
  address TEXT,
  cashless_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  admission_number_format VARCHAR(80) DEFAULT 'SMS-{YEAR}-{SEQ}',
  status VARCHAR(40) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(120) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT NOT NULL REFERENCES roles(id),
  permission_id BIGINT NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT REFERENCES schools(id),
  full_name VARCHAR(180) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  phone VARCHAR(40),
  password_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id),
  role_id BIGINT NOT NULL REFERENCES roles(id),
  school_id BIGINT REFERENCES schools(id),
  PRIMARY KEY (user_id, role_id, school_id)
);

CREATE TABLE IF NOT EXISTS academic_years (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  name VARCHAR(40) NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS terms (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  academic_year_id BIGINT REFERENCES academic_years(id),
  name VARCHAR(40) NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS classes (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  name VARCHAR(80) NOT NULL,
  level VARCHAR(80)
);

CREATE TABLE IF NOT EXISTS streams (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  class_id BIGINT NOT NULL REFERENCES classes(id),
  name VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  admission_number VARCHAR(80) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  gender VARCHAR(20) NOT NULL,
  date_of_birth DATE,
  photo_url TEXT,
  class_id BIGINT REFERENCES classes(id),
  stream_id BIGINT REFERENCES streams(id),
  status VARCHAR(40) NOT NULL DEFAULT 'Pending Review',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (school_id, admission_number)
);

CREATE INDEX IF NOT EXISTS idx_students_school_class ON students(school_id, class_id, stream_id);
CREATE INDEX IF NOT EXISTS idx_students_gender ON students(school_id, gender);

CREATE TABLE IF NOT EXISTS guardians (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  full_name VARCHAR(180) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(180),
  relationship VARCHAR(80),
  address TEXT
);

CREATE TABLE IF NOT EXISTS student_guardians (
  student_id BIGINT NOT NULL REFERENCES students(id),
  guardian_id BIGINT NOT NULL REFERENCES guardians(id),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (student_id, guardian_id)
);

CREATE TABLE IF NOT EXISTS admission_number_sequences (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  year INTEGER NOT NULL,
  prefix VARCHAR(40) NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  UNIQUE (school_id, year, prefix)
);

CREATE TABLE IF NOT EXISTS student_admissions (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  student_id BIGINT REFERENCES students(id),
  academic_year_id BIGINT REFERENCES academic_years(id),
  term_id BIGINT REFERENCES terms(id),
  generated_admission_number VARCHAR(80),
  submitted_by BIGINT REFERENCES users(id),
  reviewed_by BIGINT REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_comment TEXT,
  status VARCHAR(40) NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_batches (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  import_type VARCHAR(80) NOT NULL,
  file_name VARCHAR(240) NOT NULL,
  uploaded_by BIGINT REFERENCES users(id),
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  invalid_rows INTEGER NOT NULL DEFAULT 0,
  male_count INTEGER NOT NULL DEFAULT 0,
  female_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'Uploaded',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_rows (
  id BIGSERIAL PRIMARY KEY,
  batch_id BIGINT NOT NULL REFERENCES import_batches(id),
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  mapped_data JSONB,
  validation_errors JSONB,
  status VARCHAR(40) NOT NULL DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS staff_profiles (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  user_id BIGINT REFERENCES users(id),
  staff_number VARCHAR(80),
  full_name VARCHAR(180) NOT NULL,
  gender VARCHAR(20),
  department VARCHAR(120),
  job_title VARCHAR(120),
  employment_type VARCHAR(80),
  start_date DATE,
  status VARCHAR(40) NOT NULL DEFAULT 'Active',
  UNIQUE (school_id, staff_number)
);

CREATE TABLE IF NOT EXISTS student_accounts (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  student_id BIGINT NOT NULL REFERENCES students(id),
  current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'Active',
  UNIQUE (school_id, student_id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  invoice_number VARCHAR(80) NOT NULL,
  student_id BIGINT REFERENCES students(id),
  amount NUMERIC(14, 2) NOT NULL,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  due_date DATE,
  status VARCHAR(40) NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (school_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  student_id BIGINT REFERENCES students(id),
  payment_reference VARCHAR(120) NOT NULL,
  payment_method VARCHAR(60) NOT NULL,
  source VARCHAR(80) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  matched_by BIGINT REFERENCES users(id),
  confirmed_by BIGINT REFERENCES users(id),
  confirmed_at TIMESTAMP,
  status VARCHAR(40) NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (school_id, payment_reference)
);

CREATE INDEX IF NOT EXISTS idx_payments_student_status ON payments(school_id, student_id, status);

CREATE TABLE IF NOT EXISTS receipts (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  receipt_number VARCHAR(80) NOT NULL,
  payment_id BIGINT NOT NULL REFERENCES payments(id),
  student_id BIGINT REFERENCES students(id),
  amount NUMERIC(14, 2) NOT NULL,
  balance_after_payment NUMERIC(14, 2),
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  issued_by BIGINT REFERENCES users(id),
  pdf_url TEXT,
  status VARCHAR(40) NOT NULL DEFAULT 'Issued',
  UNIQUE (school_id, receipt_number)
);

CREATE TABLE IF NOT EXISTS finance_documents (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  document_type VARCHAR(80) NOT NULL,
  document_number VARCHAR(80) NOT NULL,
  title VARCHAR(240) NOT NULL,
  total_amount NUMERIC(14, 2) DEFAULT 0,
  prepared_by BIGINT REFERENCES users(id),
  shared_to_admin_at TIMESTAMP,
  reviewed_by BIGINT REFERENCES users(id),
  reviewed_at TIMESTAMP,
  status VARCHAR(40) NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (school_id, document_number)
);

CREATE INDEX IF NOT EXISTS idx_finance_documents_status ON finance_documents(school_id, document_type, status);

CREATE TABLE IF NOT EXISTS finance_document_items (
  id BIGSERIAL PRIMARY KEY,
  finance_document_id BIGINT NOT NULL REFERENCES finance_documents(id),
  description TEXT NOT NULL,
  quantity NUMERIC(12, 2) DEFAULT 1,
  unit_cost NUMERIC(14, 2) DEFAULT 0,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  budget_vote_id BIGINT
);

CREATE TABLE IF NOT EXISTS finance_document_attachments (
  id BIGSERIAL PRIMARY KEY,
  finance_document_id BIGINT NOT NULL REFERENCES finance_documents(id),
  file_url TEXT NOT NULL,
  attachment_type VARCHAR(80),
  uploaded_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budgets (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  academic_year_id BIGINT REFERENCES academic_years(id),
  title VARCHAR(180) NOT NULL,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMP,
  status VARCHAR(40) NOT NULL DEFAULT 'Draft'
);

CREATE TABLE IF NOT EXISTS budget_votes (
  id BIGSERIAL PRIMARY KEY,
  budget_id BIGINT NOT NULL REFERENCES budgets(id),
  department VARCHAR(120),
  vote_code VARCHAR(80) NOT NULL,
  vote_name VARCHAR(180) NOT NULL,
  approved_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  actual_spent NUMERIC(14, 2) NOT NULL DEFAULT 0,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cashbooks (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  cashbook_type VARCHAR(80) NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference VARCHAR(120),
  money_in NUMERIC(14, 2) NOT NULL DEFAULT 0,
  money_out NUMERIC(14, 2) NOT NULL DEFAULT 0,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(80)
);

CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  bank_statement_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  cashbook_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  cash_on_hand NUMERIC(14, 2) NOT NULL DEFAULT 0,
  difference NUMERIC(14, 2) NOT NULL DEFAULT 0,
  prepared_by BIGINT REFERENCES users(id),
  reviewed_by BIGINT REFERENCES users(id),
  status VARCHAR(40) NOT NULL DEFAULT 'Draft',
  UNIQUE (school_id, month, year)
);

CREATE TABLE IF NOT EXISTS library_books (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  title VARCHAR(240) NOT NULL,
  author VARCHAR(180),
  isbn VARCHAR(80),
  category VARCHAR(120),
  subject VARCHAR(120),
  publisher VARCHAR(160),
  class_level VARCHAR(80)
);

CREATE TABLE IF NOT EXISTS library_book_copies (
  id BIGSERIAL PRIMARY KEY,
  book_id BIGINT NOT NULL REFERENCES library_books(id),
  copy_number VARCHAR(80) NOT NULL,
  shelf_label VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Available',
  UNIQUE (book_id, copy_number)
);

CREATE INDEX IF NOT EXISTS idx_library_copies_shelf ON library_book_copies(shelf_label, status);

CREATE TABLE IF NOT EXISTS library_borrowings (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  book_copy_id BIGINT NOT NULL REFERENCES library_book_copies(id),
  student_id BIGINT NOT NULL REFERENCES students(id),
  borrowed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at TIMESTAMP,
  returned_at TIMESTAMP,
  status VARCHAR(40) NOT NULL DEFAULT 'Borrowed'
);

CREATE TABLE IF NOT EXISTS library_book_requests (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  title VARCHAR(240) NOT NULL,
  subject VARCHAR(120),
  requested_by BIGINT REFERENCES users(id),
  request_count INTEGER NOT NULL DEFAULT 1,
  priority VARCHAR(40) NOT NULL DEFAULT 'Medium',
  status VARCHAR(40) NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  channel VARCHAR(40) NOT NULL,
  sender_id BIGINT REFERENCES users(id),
  status VARCHAR(40) NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_recipients (
  id BIGSERIAL PRIMARY KEY,
  notification_id BIGINT NOT NULL REFERENCES notifications(id),
  recipient_user_id BIGINT REFERENCES users(id),
  student_id BIGINT REFERENCES students(id),
  phone VARCHAR(40),
  email VARCHAR(180),
  delivery_status VARCHAR(40) NOT NULL DEFAULT 'Pending',
  delivered_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_threads (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  student_id BIGINT REFERENCES students(id),
  parent_user_id BIGINT REFERENCES users(id),
  teacher_user_id BIGINT REFERENCES users(id),
  status VARCHAR(40) NOT NULL DEFAULT 'Open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_replies (
  id BIGSERIAL PRIMARY KEY,
  thread_id BIGINT NOT NULL REFERENCES message_threads(id),
  sender_id BIGINT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  request_type VARCHAR(80) NOT NULL,
  record_type VARCHAR(80) NOT NULL,
  record_id BIGINT NOT NULL,
  submitted_by BIGINT REFERENCES users(id),
  reviewed_by BIGINT REFERENCES users(id),
  review_comment TEXT,
  status VARCHAR(40) NOT NULL DEFAULT 'Submitted',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT REFERENCES schools(id),
  user_id BIGINT REFERENCES users(id),
  action VARCHAR(120) NOT NULL,
  record_type VARCHAR(80) NOT NULL,
  record_id BIGINT,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_logs(record_type, record_id);

CREATE TABLE IF NOT EXISTS red_flags (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  flag_type VARCHAR(120) NOT NULL,
  severity VARCHAR(40) NOT NULL,
  record_type VARCHAR(80),
  record_id BIGINT,
  description TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Open',
  resolved_by BIGINT REFERENCES users(id),
  resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS export_jobs (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  requested_by BIGINT REFERENCES users(id),
  export_type VARCHAR(120) NOT NULL,
  filters JSONB,
  file_url TEXT,
  status VARCHAR(40) NOT NULL DEFAULT 'Queued',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
