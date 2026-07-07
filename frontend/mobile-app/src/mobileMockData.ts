export type MobileRole = "parent" | "teacher" | "student";

export const roleLabels: Record<MobileRole, string> = {
  parent: "Parent",
  teacher: "Teacher",
  student: "Student"
};

export const mobileCards: Record<MobileRole, { label: string; value: string; hint: string }[]> = {
  parent: [
    { label: "Child", value: "Ariho Grace", hint: "P5 Blue" },
    { label: "Balance", value: "UGX 320,000", hint: "Due before week 6" },
    { label: "Attendance", value: "Present", hint: "Today at 8:03 AM" },
    { label: "Report Card", value: "Published", hint: "Term 1 ready" }
  ],
  teacher: [
    { label: "Classes Today", value: "5", hint: "2 attendance sheets pending" },
    { label: "Marks Pending", value: "48", hint: "English P5" },
    { label: "Messages", value: "6", hint: "Parent replies needed" },
    { label: "Offline Sync", value: "1 Pending", hint: "Attendance queue" }
  ],
  student: [
    { label: "Attendance", value: "94%", hint: "Term average" },
    { label: "Library", value: "2 Books", hint: "1 due Friday" },
    { label: "Performance", value: "B+", hint: "Term 1 aggregate" },
    { label: "Announcements", value: "3", hint: "Unread notices" }
  ]
};

export const messages = [
  "SMS fallback enabled for button-phone parents.",
  "Push alerts cover attendance, fees, payments, and performance.",
  "Parent-teacher messaging is linked to the student profile."
];
