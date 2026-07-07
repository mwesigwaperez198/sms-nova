-- Reference seed data. Password hashes should be created by the backend, not this file.

INSERT INTO roles (name, description) VALUES
  ('Super Admin', 'Platform maintainer and tenant manager'),
  ('Admin', 'School admin or headteacher with approval authority'),
  ('Secretary', 'Front desk and admissions officer'),
  ('Bursar', 'Finance operations and bursar/accountant workspace'),
  ('Librarian', 'Library stock, borrowing, and requested books manager'),
  ('Teacher', 'Attendance, marks, report remarks, and parent messaging'),
  ('Parent', 'Parent mobile user'),
  ('Student', 'Student read-only mobile user')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (code, description) VALUES
  ('schools.manage', 'Manage school tenants and settings'),
  ('students.create', 'Create student admission drafts'),
  ('students.import', 'Import student records from Excel or database files'),
  ('admissions.approve', 'Approve or reject student admissions'),
  ('staff.manage', 'Manage teaching and non-teaching staff'),
  ('payments.reconcile', 'Match and reconcile cashless payments'),
  ('receipts.generate', 'Generate receipts from confirmed payments'),
  ('finance.documents.prepare', 'Prepare finance documents'),
  ('finance.documents.share_to_admin', 'Share finance documents to admin review'),
  ('finance.documents.approve', 'Approve finance documents'),
  ('library.manage', 'Manage books, shelves, copies, and borrowing'),
  ('library.requests.share_to_admin', 'Share requested books to admin'),
  ('communications.send', 'Send SMS, email, push, and in-app notices'),
  ('reports.export', 'Create PDF, Excel, and CSV exports'),
  ('audit.view', 'View audit logs and red flags')
ON CONFLICT (code) DO NOTHING;
