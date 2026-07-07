import { useState } from "react";
import type { ConnectedData } from "../api";
import { DataTable } from "./DataTable";

interface LibraryWorkspaceProps {
  view: string;
  data: ConnectedData;
  onShareRequestedBooks: () => void;
  roleKey: string;
}

const catalogColumns = [
  { key: "code", label: "Code" },
  { key: "title", label: "Book" },
  { key: "shelf", label: "Shelf" },
  { key: "available", label: "Available" },
  { key: "borrowed", label: "Borrowed" },
  { key: "status", label: "Status" },
] as const;

const requestColumns = [
  { key: "title", label: "Requested Book" },
  { key: "subject", label: "Subject" },
  { key: "requests", label: "Requests" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
] as const;

const UGANDAN_TIERS = ["Nursery", "Primary", "O-Level (S1–S4)", "A-Level (S5–S6)", "Tertiary", "University"];
const NCDC_SUBJECTS_OLEVEL = [
  "Mathematics", "English Language", "Biology", "Chemistry", "Physics",
  "Geography", "History", "Commerce", "Computer Studies", "Agriculture",
];
const NCDC_SUBJECTS_ALEVEL = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Economics",
  "Geography", "History", "Literature in English", "Computer Science",
];

export function LibraryWorkspace({ view, data, onShareRequestedBooks, roleKey }: LibraryWorkspaceProps) {
  const [selectedTier, setSelectedTier] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const isLibrarian = roleKey === "librarian" || roleKey === "admin";
  const isALevel = selectedTier.includes("A-Level");

  const subjectOptions = isALevel ? NCDC_SUBJECTS_ALEVEL : NCDC_SUBJECTS_OLEVEL;

  const filteredBooks = data.libraryBooks.filter((book) => {
    const matchSearch = searchQuery
      ? book.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchSearch;
  });

  if (view === "Upload Books" && isLibrarian) {
    return (
      <section className="workspace-grid">
        <section className="panel subpanel">
          <div className="panel-header">
            <div>
              <p>Librarian Control Center</p>
              <h3>Upload Books to Student Library</h3>
            </div>
          </div>
          <div className="library-upload-form">
            <div className="form-row-2">
              <label className="form-label">
                Book Title
                <input placeholder="e.g. New MK Primary Mathematics Book 5" />
              </label>
              <label className="form-label">
                Author
                <input placeholder="e.g. MK Publishers" />
              </label>
            </div>
            <div className="form-row-3">
              <label className="form-label">
                Education Tier
                <select defaultValue="">
                  <option value="">Select tier...</option>
                  {UGANDAN_TIERS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="form-label">
                Curriculum Level
                <input placeholder="e.g. P5, S3, S6..." />
              </label>
              <label className="form-label">
                Subject Area
                <input placeholder="e.g. Mathematics" />
              </label>
            </div>
            <div className="form-row-2">
              <label className="form-label">
                ISBN
                <input placeholder="Optional — leave blank if unavailable" />
              </label>
              <label className="form-label">
                Shelf Location
                <input placeholder="e.g. A-3, Shelf 2" />
              </label>
            </div>
            <div className="form-row-2">
              <label className="form-label">
                Total Copies
                <input type="number" defaultValue={1} min={1} />
              </label>
              <label className="form-label">
                Digital Copy URL (optional)
                <input placeholder="https://..." />
              </label>
            </div>
            <label className="form-label">
              Description
              <textarea placeholder="Brief description of the book content and use..." />
            </label>
            <div className="form-actions">
              <button className="primary-button">Add to Library</button>
            </div>
          </div>
        </section>
        <section className="panel subpanel">
          <div className="panel-header">
            <div>
              <p>Current Catalog</p>
              <h3>Books in Library</h3>
            </div>
          </div>
          <DataTable columns={catalogColumns} rows={data.libraryBooks} />
        </section>
      </section>
    );
  }

  if (view === "Book Requests" || view === "Requested Books") {
    return (
      <section className="workspace-grid">
        <section className="panel subpanel">
          <div className="panel-header">
            <div>
              <p>Student & Teacher Requests</p>
              <h3>Books Requested for Procurement</h3>
            </div>
            {isLibrarian && (
              <button className="primary-button" onClick={onShareRequestedBooks}>
                Share to Admin
              </button>
            )}
          </div>
          <DataTable columns={requestColumns} rows={data.requestedBooks} />
        </section>
      </section>
    );
  }

  if (view === "Student Library" || view === "Library") {
    return (
      <section className="panel">
        <div className="panel-header">
          <div>
            <p>NCDC-Aligned Digital Library</p>
            <h3>Browse School Library</h3>
          </div>
        </div>

        <div className="library-filters">
          <input
            className="library-search"
            placeholder="Search by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="library-select"
            value={selectedTier}
            onChange={(e) => { setSelectedTier(e.target.value); setSelectedSubject(""); }}
          >
            <option value="">All Tiers</option>
            {UGANDAN_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {selectedTier && (
            <select
              className="library-select"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {selectedTier && (
          <div className="library-ncdc-note">
            📋 Showing NCDC-vetted materials for <strong>{selectedTier}</strong>
            {selectedSubject && <> — <strong>{selectedSubject}</strong></>}
          </div>
        )}

        <div className="library-book-grid">
          {filteredBooks.length === 0 ? (
            <p className="library-empty">No books match your current filters.</p>
          ) : (
            filteredBooks.map((book) => (
              <article key={book.code} className="library-book-card">
                <div className="library-book-cover">📖</div>
                <div className="library-book-info">
                  <strong>{book.title}</strong>
                  <span>{book.shelf}</span>
                  <div className="library-book-status">
                    <span className={`status-badge ${book.available > 0 ? "status-success" : "status-danger"}`}>
                      {book.available > 0 ? `${book.available} available` : "All borrowed"}
                    </span>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p>Library</p>
          <h3>Library Dashboard</h3>
        </div>
      </div>
      <p>Select a section from the menu to manage the library catalog, borrows, or book requests.</p>
    </section>
  );
}
