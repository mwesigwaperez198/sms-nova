-- ============================================================
-- SCHOOL MANAGEMENT SYSTEM (SMS) - PostgreSQL Schema
-- Multi-tenant | Uganda-specific | Full Structure
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'school_admin', 'teacher', 'parent', 'student');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE report_card_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'published');
CREATE TYPE invoice_status AS ENUM ('unpaid', 'partial', 'paid', 'overdue', 'cancelled');
CREATE TYPE delivery_status AS ENUM ('queued', 'sent', 'delivered', 'failed', 'read');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'trial');
CREATE TYPE payment_method AS ENUM ('cash', 'mobile_money', 'bank_transfer', 'cheque');

-- ============================================================
-- 2. PLATFORM / TENANT SCHEMA
-- ============================================================

CREATE TABLE schools (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    code        VARCHAR(50) UNIQUE NOT NULL,
    address     TEXT,
    phone       VARCHAR(30),
    email       VARCHAR(255),
    logo_url    TEXT,
    country     VARCHAR(100) DEFAULT 'Uganda',
    currency    VARCHAR(10) DEFAULT 'UGX',
    timezone    VARCHAR(50) DEFAULT 'Africa/Kampala',
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE school_settings (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id               UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    terms_per_year          INT DEFAULT 3,
    grading_system          VARCHAR(50) DEFAULT 'UNEB',
    sms_notifications       BOOLEAN DEFAULT TRUE,
    allow_partial_payment   BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id)
);

CREATE TABLE school_branding (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    primary_color   VARCHAR(20),
    secondary_color VARCHAR(20),
    banner_url      TEXT,
    motto           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id)
);

CREATE TABLE subscription_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    price           NUMERIC(12,2) NOT NULL,
    currency        VARCHAR(10) DEFAULT 'UGX',
    max_students    INT,
    max_teachers    INT,
    features        JSONB,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE school_subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    plan_id         UUID NOT NULL REFERENCES subscription_plans(id),
    status          subscription_status DEFAULT 'trial',
    starts_at       DATE NOT NULL,
    expires_at      DATE NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_school_subscriptions_school ON school_subscriptions(school_id);

-- ============================================================
-- 3. AUTH / ROLES / PERMISSIONS SCHEMA
-- ============================================================

CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) UNIQUE NOT NULL,   -- e.g. 'school_admin', 'teacher'
    description TEXT,
    is_global   BOOLEAN DEFAULT FALSE,           -- TRUE for super_admin
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(100) UNIQUE NOT NULL,    -- e.g. 'fees.view', 'attendance.submit'
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE role_permissions (
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID REFERENCES schools(id),   -- NULL for super_admin
    role_id         UUID NOT NULL REFERENCES roles(id),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(30),
    password_hash   TEXT NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT UNIQUE NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE login_attempts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id),
    email       VARCHAR(255),
    ip_address  VARCHAR(45),
    success     BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_user ON login_attempts(user_id);

-- ============================================================
-- 4. PEOPLE SCHEMA
-- ============================================================

CREATE TABLE students (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           UUID NOT NULL REFERENCES schools(id),
    user_id             UUID REFERENCES users(id),
    student_number      VARCHAR(50),
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    date_of_birth       DATE,
    gender              VARCHAR(20),
    photo_url           TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, student_number)
);

CREATE INDEX idx_students_school ON students(school_id);

CREATE TABLE student_guardians (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    student_id      UUID NOT NULL REFERENCES students(id),
    user_id         UUID REFERENCES users(id),   -- parent user account if exists
    full_name       VARCHAR(255) NOT NULL,
    relationship    VARCHAR(50),                  -- e.g. 'father', 'mother', 'uncle'
    phone           VARCHAR(30),
    email           VARCHAR(255),
    is_primary      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_guardians_student ON student_guardians(student_id);
CREATE INDEX idx_student_guardians_school ON student_guardians(school_id);

CREATE TABLE staff_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    staff_number    VARCHAR(50),
    department      VARCHAR(100),
    date_joined     DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, staff_number)
);

CREATE TABLE teacher_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           UUID NOT NULL REFERENCES schools(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    employee_number     VARCHAR(50),
    qualification       TEXT,
    specialization      VARCHAR(100),
    date_employed       DATE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, employee_number)
);

CREATE INDEX idx_teacher_profiles_school ON teacher_profiles(school_id);

CREATE TABLE parent_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    occupation      VARCHAR(100),
    address         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. SCHOOL STRUCTURE SCHEMA
-- ============================================================

CREATE TABLE academic_years (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools(id),
    name        VARCHAR(50) NOT NULL,   -- e.g. '2024'
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    is_current  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, name)
);

CREATE INDEX idx_academic_years_school ON academic_years(school_id);

CREATE TABLE terms (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           UUID NOT NULL REFERENCES schools(id),
    academic_year_id    UUID NOT NULL REFERENCES academic_years(id),
    name                VARCHAR(50) NOT NULL,   -- e.g. 'Term 1'
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    is_current          BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, academic_year_id, name)
);

CREATE INDEX idx_terms_school ON terms(school_id);

CREATE TABLE classes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools(id),
    name        VARCHAR(50) NOT NULL,   -- e.g. 'S1', 'P5'
    level       INT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, name)
);

CREATE TABLE streams (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools(id),
    class_id    UUID NOT NULL REFERENCES classes(id),
    name        VARCHAR(50) NOT NULL,   -- e.g. 'East', 'Blue'
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, class_id, name)
);

CREATE INDEX idx_streams_class ON streams(class_id);

CREATE TABLE subjects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools(id),
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(20),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, code)
);

CREATE TABLE class_subjects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools(id),
    class_id    UUID NOT NULL REFERENCES classes(id),
    subject_id  UUID NOT NULL REFERENCES subjects(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, class_id, subject_id)
);

CREATE TABLE teacher_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    teacher_id      UUID NOT NULL REFERENCES teacher_profiles(id),
    class_id        UUID NOT NULL REFERENCES classes(id),
    stream_id       UUID REFERENCES streams(id),
    subject_id      UUID NOT NULL REFERENCES subjects(id),
    term_id         UUID NOT NULL REFERENCES terms(id),
    is_class_teacher BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, teacher_id, class_id, subject_id, term_id)
);

CREATE INDEX idx_teacher_assignments_school ON teacher_assignments(school_id);

CREATE TABLE student_enrollments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           UUID NOT NULL REFERENCES schools(id),
    student_id          UUID NOT NULL REFERENCES students(id),
    class_id            UUID NOT NULL REFERENCES classes(id),
    stream_id           UUID REFERENCES streams(id),
    academic_year_id    UUID NOT NULL REFERENCES academic_years(id),
    enrolled_at         DATE DEFAULT CURRENT_DATE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, student_id, academic_year_id)
);

CREATE INDEX idx_student_enrollments_school ON student_enrollments(school_id);
CREATE INDEX idx_student_enrollments_student ON student_enrollments(student_id);

-- ============================================================
-- 6. FEES SCHEMA
-- ============================================================

CREATE TABLE fee_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools(id),
    name        VARCHAR(100) NOT NULL,   -- e.g. 'Tuition', 'Transport', 'Uniform'
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, name)
);

CREATE TABLE fee_structures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    category_id     UUID NOT NULL REFERENCES fee_categories(id),
    class_id        UUID REFERENCES classes(id),    -- NULL = applies to all classes
    term_id         UUID REFERENCES terms(id),
    amount          NUMERIC(12,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_structures_school ON fee_structures(school_id);

CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    student_id      UUID NOT NULL REFERENCES students(id),
    term_id         UUID REFERENCES terms(id),
    total_amount    NUMERIC(12,2) NOT NULL,
    amount_paid     NUMERIC(12,2) DEFAULT 0,
    balance         NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    status          invoice_status DEFAULT 'unpaid',
    due_date        DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_school ON invoices(school_id);
CREATE INDEX idx_invoices_student ON invoices(student_id);
CREATE INDEX idx_invoices_status ON invoices(school_id, student_id, status);

CREATE TABLE invoice_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES fee_categories(id),
    description     VARCHAR(255),
    amount          NUMERIC(12,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    student_id      UUID NOT NULL REFERENCES students(id),
    invoice_id      UUID REFERENCES invoices(id),
    amount          NUMERIC(12,2) NOT NULL,
    method          payment_method DEFAULT 'cash',
    reference       VARCHAR(100),
    paid_at         TIMESTAMPTZ DEFAULT NOW(),
    received_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_school ON payments(school_id);
CREATE INDEX idx_payments_student ON payments(student_id);

CREATE TABLE payment_allocations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    payment_id      UUID NOT NULL REFERENCES payments(id),
    invoice_item_id UUID REFERENCES invoice_items(id),
    amount          NUMERIC(12,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE receipts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    payment_id      UUID NOT NULL REFERENCES payments(id),
    receipt_number  VARCHAR(50) UNIQUE NOT NULL,
    issued_at       TIMESTAMPTZ DEFAULT NOW(),
    issued_by       UUID REFERENCES users(id)
);

CREATE INDEX idx_receipts_school ON receipts(school_id);

CREATE TABLE discounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    student_id      UUID NOT NULL REFERENCES students(id),
    invoice_id      UUID REFERENCES invoices(id),
    reason          TEXT,
    amount          NUMERIC(12,2) NOT NULL,
    approved_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refunds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    payment_id      UUID NOT NULL REFERENCES payments(id),
    amount          NUMERIC(12,2) NOT NULL,
    reason          TEXT,
    processed_by    UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. ATTENDANCE SCHEMA
-- ============================================================

CREATE TABLE attendance_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    class_id        UUID NOT NULL REFERENCES classes(id),
    stream_id       UUID REFERENCES streams(id),
    term_id         UUID REFERENCES terms(id),
    teacher_id      UUID REFERENCES teacher_profiles(id),
    session_date    DATE NOT NULL,
    is_submitted    BOOLEAN DEFAULT FALSE,
    submitted_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, class_id, stream_id, session_date)
);

CREATE INDEX idx_attendance_sessions_school ON attendance_sessions(school_id);
CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(school_id, session_date);

CREATE TABLE attendance_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    session_id      UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id),
    status          attendance_status NOT NULL,
    note            TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);

CREATE INDEX idx_attendance_records_student ON attendance_records(student_id);

CREATE TABLE attendance_corrections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           UUID NOT NULL REFERENCES schools(id),
    attendance_record_id UUID NOT NULL REFERENCES attendance_records(id),
    old_status          attendance_status NOT NULL,
    new_status          attendance_status NOT NULL,
    reason              TEXT,
    corrected_by        UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. ACADEMICS / REPORT CARDS SCHEMA
-- ============================================================

CREATE TABLE assessment_types (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools(id),
    name        VARCHAR(100) NOT NULL,  -- e.g. 'End of Term Exam', 'Bot Test'
    weight      NUMERIC(5,2),           -- percentage weight
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, name)
);

CREATE TABLE assessments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           UUID NOT NULL REFERENCES schools(id),
    assessment_type_id  UUID NOT NULL REFERENCES assessment_types(id),
    subject_id          UUID NOT NULL REFERENCES subjects(id),
    class_id            UUID NOT NULL REFERENCES classes(id),
    term_id             UUID NOT NULL REFERENCES terms(id),
    total_marks         NUMERIC(6,2) NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assessments_school ON assessments(school_id);

CREATE TABLE marks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    assessment_id   UUID NOT NULL REFERENCES assessments(id),
    student_id      UUID NOT NULL REFERENCES students(id),
    score           NUMERIC(6,2),
    remarks         TEXT,
    entered_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assessment_id, student_id)
);

CREATE INDEX idx_marks_student ON marks(student_id);
CREATE INDEX idx_marks_school ON marks(school_id);

CREATE TABLE grading_scales (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools(id),
    name        VARCHAR(50) NOT NULL,   -- e.g. 'UNEB Secondary'
    grade       VARCHAR(5) NOT NULL,    -- e.g. 'D1', 'D2', 'C3'
    min_score   NUMERIC(5,2) NOT NULL,
    max_score   NUMERIC(5,2) NOT NULL,
    points      INT,                    -- UNEB points (1-9)
    remark      VARCHAR(100),          -- e.g. 'Distinction', 'Credit'
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE report_cards (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           UUID NOT NULL REFERENCES schools(id),
    student_id          UUID NOT NULL REFERENCES students(id),
    term_id             UUID NOT NULL REFERENCES terms(id),
    academic_year_id    UUID NOT NULL REFERENCES academic_years(id),
    class_id            UUID NOT NULL REFERENCES classes(id),
    total_marks         NUMERIC(8,2),
    average_score       NUMERIC(5,2),
    position            INT,
    class_size          INT,
    status              report_card_status DEFAULT 'draft',
    class_teacher_remark TEXT,
    head_teacher_remark  TEXT,
    published_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, student_id, term_id)
);

CREATE INDEX idx_report_cards_school ON report_cards(school_id);
CREATE INDEX idx_report_cards_student ON report_cards(student_id);

CREATE TABLE report_card_subject_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    report_card_id  UUID NOT NULL REFERENCES report_cards(id) ON DELETE CASCADE,
    subject_id      UUID NOT NULL REFERENCES subjects(id),
    total_score     NUMERIC(6,2),
    grade           VARCHAR(5),
    points          INT,
    position        INT,
    remark          TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(report_card_id, subject_id)
);

CREATE TABLE report_card_approvals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    report_card_id  UUID NOT NULL REFERENCES report_cards(id),
    approved_by     UUID REFERENCES users(id),
    action          report_card_status NOT NULL,
    comment         TEXT,
    actioned_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. NOTIFICATIONS SCHEMA
-- ============================================================

CREATE TABLE notification_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID REFERENCES schools(id),   -- NULL = global template
    name        VARCHAR(100) NOT NULL,
    channel     VARCHAR(20) DEFAULT 'sms',     -- 'sms', 'in_app', 'email'
    body        TEXT NOT NULL,                 -- supports {{placeholders}}
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    template_id     UUID REFERENCES notification_templates(id),
    sender_id       UUID REFERENCES users(id),
    title           VARCHAR(255),
    body            TEXT NOT NULL,
    channel         VARCHAR(20) DEFAULT 'sms',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_school ON notifications(school_id);

CREATE TABLE notification_deliveries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           UUID NOT NULL REFERENCES schools(id),
    notification_id     UUID NOT NULL REFERENCES notifications(id),
    recipient_id        UUID NOT NULL REFERENCES users(id),
    status              delivery_status DEFAULT 'queued',
    delivered_at        TIMESTAMPTZ,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_deliveries_recipient ON notification_deliveries(recipient_id);

CREATE TABLE notification_preferences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel         VARCHAR(20) NOT NULL,
    is_enabled      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, channel)
);

-- ============================================================
-- 10. OFFLINE SYNC SCHEMA
-- ============================================================

CREATE TABLE sync_devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    device_id       VARCHAR(255) NOT NULL,
    device_name     VARCHAR(100),
    last_synced_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

CREATE TABLE sync_changes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    device_id       UUID REFERENCES sync_devices(id),
    table_name      VARCHAR(100) NOT NULL,
    record_id       UUID NOT NULL,
    operation       VARCHAR(10) NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
    payload         JSONB,
    synced_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_changes_school ON sync_changes(school_id);

CREATE TABLE idempotency_keys (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools(id),
    key         VARCHAR(255) NOT NULL,
    context     VARCHAR(100),               -- e.g. 'attendance_upload', 'payment'
    resolved_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, key)
);

-- ============================================================
-- 11. AUDIT SCHEMA
-- ============================================================

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID REFERENCES schools(id),
    user_id         UUID REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,  -- e.g. 'payment.created', 'role.changed'
    table_name      VARCHAR(100),
    record_id       UUID,
    old_data        JSONB,
    new_data        JSONB,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ DEFAULT NOW()
    -- No UPDATE or DELETE allowed on this table (enforce via policy)
);

CREATE INDEX idx_audit_logs_school ON audit_logs(school_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, record_id);

CREATE TABLE data_exports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id),
    requested_by    UUID REFERENCES users(id),
    export_type     VARCHAR(100),           -- e.g. 'fees_report', 'attendance'
    file_url        TEXT,
    status          VARCHAR(30) DEFAULT 'pending',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- ============================================================
-- SEED: Default Roles
-- ============================================================

INSERT INTO roles (name, description, is_global) VALUES
    ('super_admin', 'Platform-wide administrator', TRUE),
    ('school_admin', 'School-level administrator', FALSE),
    ('teacher',      'Teaches classes and submits attendance/marks', FALSE),
    ('parent',       'Guardian with access to child records', FALSE),
    ('student',      'Read-only access to own records', FALSE);

-- ============================================================
-- SEED: Default Permissions
-- ============================================================

INSERT INTO permissions (code, description) VALUES
    ('schools.manage',        'Create and manage schools'),
    ('users.manage',          'Create and manage users'),
    ('students.view',         'View student records'),
    ('students.manage',       'Create and edit student records'),
    ('fees.view',             'View fee records'),
    ('fees.manage',           'Create invoices and record payments'),
    ('attendance.submit',     'Submit attendance sessions'),
    ('attendance.correct',    'Correct submitted attendance'),
    ('marks.enter',           'Enter assessment marks'),
    ('report_cards.publish',  'Approve and publish report cards'),
    ('notifications.send',    'Send notifications to parents/students'),
    ('audit.view',            'View audit logs');

-- ============================================================
-- END OF SCHEMA
-- ============================================================
