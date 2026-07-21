import { useEffect, useState } from "react";
import { X, User, BookOpen, Calendar, MapPin, Phone, Shield, Droplets, AlertCircle } from "lucide-react";
import { apiRequest } from "../api";

interface StudentProfileModalProps {
  studentId: number;
  studentName: string;
  onClose: () => void;
}

interface StudentProfile {
  id: number;
  name: string;
  admission_number: string | null;
  class_name: string | null;
  stream_name: string | null;
  gender: string;
  date_of_birth: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  address: string | null;
  blood_group: string | null;
  medical_conditions: string | null;
  status: string;
  phone: string | null;
}

interface AssessmentRow {
  subject: string;
  score: number;
  type: string;
  term: string;
}

interface AttendanceRow {
  date: string;
  status: string;
  remarks: string | null;
}

interface FeeRow {
  description: string;
  amount: string;
  paid_amount: string;
  status: string;
  due_date: string;
}

const DEMO_PROFILE: StudentProfile = {
  id: 1,
  name: "Nakamya Sarah",
  admission_number: "NVD/2026/001",
  class_name: "S1",
  stream_name: "A",
  gender: "Female",
  date_of_birth: "2012-03-15",
  guardian_name: "Mr. Ssempijja David",
  guardian_phone: "0700123456",
  address: "Kampala Road, Ntinda",
  blood_group: "O+",
  medical_conditions: "None",
  status: "Active",
  phone: null,
};

const DEMO_ASSESSMENTS: AssessmentRow[] = [
  { subject: "Mathematics", score: 78, type: "EOT", term: "Term 2" },
  { subject: "English", score: 82, type: "EOT", term: "Term 2" },
  { subject: "Science", score: 71, type: "EOT", term: "Term 2" },
  { subject: "Social Studies", score: 65, type: "EOT", term: "Term 2" },
  { subject: "Kiswahili", score: 74, type: "EOT", term: "Term 2" },
];

const DEMO_ATTENDANCE: AttendanceRow[] = [
  { date: "2026-07-14", status: "Present", remarks: null },
  { date: "2026-07-13", status: "Present", remarks: null },
  { date: "2026-07-12", status: "Late", remarks: "Traffic" },
  { date: "2026-07-11", status: "Present", remarks: null },
  { date: "2026-07-10", status: "Present", remarks: null },
  { date: "2026-07-09", status: "Absent", remarks: "Sick" },
  { date: "2026-07-08", status: "Present", remarks: null },
];

const DEMO_FEES: FeeRow[] = [
  { description: "Tuition — Term 2", amount: "UGX 350,000", paid_amount: "UGX 200,000", status: "Partial", due_date: "2026-07-15" },
  { description: "Science Lab Fee", amount: "UGX 50,000", paid_amount: "UGX 50,000", status: "Cleared", due_date: "2026-07-15" },
  { description: "Sports Fee", amount: "UGX 30,000", paid_amount: "UGX 0", status: "Unpaid", due_date: "2026-07-15" },
];

function statusTone(status: string): string {
  switch (status.toLowerCase()) {
    case "present":
    case "cleared":
    case "active":
      return "#10b981";
    case "late":
    case "partial":
      return "#f59e0b";
    case "absent":
    case "unpaid":
    case "inactive":
      return "#ef4444";
    default:
      return "#94a3b8";
  }
}

export function StudentProfileModal({ studentId, studentName, onClose }: StudentProfileModalProps) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token === "demo-token") {
      setProfile(DEMO_PROFILE);
      setAssessments(DEMO_ASSESSMENTS);
      setAttendance(DEMO_ATTENDANCE);
      setFees(DEMO_FEES);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiRequest<StudentProfile>(`/api/v1/students/${studentId}`);
        if (cancelled) return;
        setProfile(data);

        try {
          const [assessData, attendData, feeData] = await Promise.allSettled([
            apiRequest<AssessmentRow[]>(`/api/v1/assessments/student/${studentId}`).catch(() => []),
            apiRequest<AttendanceRow[]>(`/api/v1/attendance/student/${studentId}`).catch(() => []),
            apiRequest<FeeRow[]>(`/api/v1/fees/student/${studentId}`).catch(() => []),
          ]);
          if (cancelled) return;
          if (assessData.status === "fulfilled") setAssessments(assessData.value);
          if (attendData.status === "fulfilled") setAttendance(attendData.value);
          if (feeData.status === "fulfilled") setFees(feeData.value);
        } catch {
          // sub-fetches are optional
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Failed to load student profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [studentId]);

  const presentCount = attendance.filter((a) => a.status === "Present").length;
  const absentCount = attendance.filter((a) => a.status === "Absent").length;
  const lateCount = attendance.filter((a) => a.status === "Late").length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel glass-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(600px, 100%)", maxHeight: "85vh", borderTop: "4px solid #0891b2" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              className="user-avatar"
              style={{
                width: 48,
                height: 48,
                fontSize: "1.2rem",
                background: "linear-gradient(135deg, #0891b2, #764ba2)",
              }}
            >
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <strong style={{ fontSize: "1.1rem" }}>{studentName}</strong>
              <br />
              <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                Student Profile · {profile?.admission_number ?? "—"}
              </span>
            </div>
          </div>
          <button className="tool-button" style={{ minHeight: 32, minWidth: 32, padding: 0 }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {loading && (
          <div className="loading-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} />)}
          </div>
        )}

        {error && (
          <div style={{ color: "#fca5a5", padding: 16, textAlign: "center" }}>
            <AlertCircle size={20} style={{ marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: "0.88rem" }}>{error}</p>
          </div>
        )}

        {!loading && !error && profile && (
          <>
            <div className="profile-grid-detail" style={{ padding: 0, marginBottom: 16 }}>
              <div className="detail-cell" style={{ borderLeft: "3px solid #0891b2" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <User size={12} /> Name
                </span>
                <strong>{profile.name}</strong>
              </div>
              <div className="detail-cell" style={{ borderLeft: "3px solid #0891b2" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <BookOpen size={12} /> Admission No
                </span>
                <strong>{profile.admission_number ?? "—"}</strong>
              </div>
              <div className="detail-cell" style={{ borderLeft: "3px solid #0891b2" }}>
                <span>Class / Stream</span>
                <strong>{profile.class_name ? `${profile.class_name}${profile.stream_name ? ` ${profile.stream_name}` : ""}` : "—"}</strong>
              </div>
              <div className="detail-cell" style={{ borderLeft: "3px solid #0891b2" }}>
                <span>Gender</span>
                <strong>{profile.gender ?? "—"}</strong>
              </div>
              <div className="detail-cell" style={{ borderLeft: "3px solid #0891b2" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Calendar size={12} /> Date of Birth
                </span>
                <strong>{profile.date_of_birth ?? "—"}</strong>
              </div>
              <div className="detail-cell" style={{ borderLeft: "3px solid #0891b2" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Shield size={12} /> Guardian
                </span>
                <strong>{profile.guardian_name ?? "—"}</strong>
              </div>
              <div className="detail-cell" style={{ borderLeft: "3px solid #0891b2" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Phone size={12} /> Contact
                </span>
                <strong>{profile.guardian_phone ?? profile.phone ?? "—"}</strong>
              </div>
              <div className="detail-cell" style={{ borderLeft: "3px solid #0891b2" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={12} /> Address
                </span>
                <strong>{profile.address ?? "—"}</strong>
              </div>
              <div className="detail-cell" style={{ borderLeft: "3px solid #0891b2" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Droplets size={12} /> Blood Group
                </span>
                <strong>{profile.blood_group ?? "—"}</strong>
              </div>
              <div className="detail-cell" style={{ borderLeft: "3px solid #0891b2" }}>
                <span>Medical Conditions</span>
                <strong>{profile.medical_conditions ?? "None"}</strong>
              </div>
              <div className="detail-cell" style={{ borderLeft: `3px solid ${statusTone(profile.status)}` }}>
                <span>Status</span>
                <strong style={{ color: statusTone(profile.status) }}>{profile.status ?? "—"}</strong>
              </div>
            </div>

            {attendance.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <strong style={{ fontSize: "0.88rem" }}>Attendance Summary</strong>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span className="badge success" style={{ fontSize: 11 }}>{presentCount} Present</span>
                    <span className="badge error" style={{ fontSize: 11 }}>{absentCount} Absent</span>
                    <span className="badge warning" style={{ fontSize: 11 }}>{lateCount} Late</span>
                  </div>
                </div>
                <div className="table-panel" style={{ overflow: "auto", maxHeight: 160 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontWeight: 700 }}>Date</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontWeight: 700 }}>Status</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontWeight: 700 }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((a, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "7px 12px", color: "#e2e8f0" }}>{a.date}</td>
                          <td style={{ padding: "7px 12px" }}>
                            <span
                              className="badge"
                              style={{
                                color: statusTone(a.status),
                                background: `${statusTone(a.status)}18`,
                                border: `1px solid ${statusTone(a.status)}40`,
                                fontSize: 11,
                              }}
                            >
                              {a.status}
                            </span>
                          </td>
                          <td style={{ padding: "7px 12px", color: "#94a3b8" }}>{a.remarks ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {assessments.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <strong style={{ fontSize: "0.88rem", display: "block", marginBottom: 8 }}>Assessment History</strong>
                <div className="table-panel" style={{ overflow: "auto", maxHeight: 180 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontWeight: 700 }}>Subject</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontWeight: 700 }}>Score</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontWeight: 700 }}>Type</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontWeight: 700 }}>Term</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.map((a, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "7px 12px", color: "#e2e8f0" }}>{a.subject}</td>
                          <td style={{ padding: "7px 12px", color: "#e2e8f0", fontWeight: 700 }}>{a.score}%</td>
                          <td style={{ padding: "7px 12px", color: "#94a3b8" }}>{a.type}</td>
                          <td style={{ padding: "7px 12px", color: "#94a3b8" }}>{a.term}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {fees.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: "0.88rem", display: "block", marginBottom: 8 }}>Fee Balance</strong>
                <div className="table-panel" style={{ overflow: "auto", maxHeight: 160 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontWeight: 700 }}>Description</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontWeight: 700 }}>Amount</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontWeight: 700 }}>Paid</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontWeight: 700 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fees.map((f, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "7px 12px", color: "#e2e8f0" }}>{f.description}</td>
                          <td style={{ padding: "7px 12px", color: "#e2e8f0" }}>{f.amount}</td>
                          <td style={{ padding: "7px 12px", color: "#94a3b8" }}>{f.paid_amount}</td>
                          <td style={{ padding: "7px 12px" }}>
                            <span
                              className="badge"
                              style={{
                                color: statusTone(f.status),
                                background: `${statusTone(f.status)}18`,
                                border: `1px solid ${statusTone(f.status)}40`,
                                fontSize: 11,
                              }}
                            >
                              {f.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
