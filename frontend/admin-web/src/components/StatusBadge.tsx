import type { StatusTone } from "../types";

const inferTone = (value: string): StatusTone => {
  const normalized = value.toLowerCase();
  if (["approved", "confirmed", "available", "active", "receipt generated", "validated", "published"].some((word) => normalized.includes(word))) {
    return "success";
  }
  if (["pending", "draft", "review", "matched", "queued", "low stock", "changes"].some((word) => normalized.includes(word))) {
    return "warning";
  }
  if (["rejected", "failed", "unmatched", "unavailable", "danger", "overdue"].some((word) => normalized.includes(word))) {
    return "danger";
  }
  return "info";
};

interface StatusBadgeProps {
  value: string;
  tone?: StatusTone;
}

export function StatusBadge({ value, tone }: StatusBadgeProps) {
  const badgeTone = tone ?? inferTone(value);
  return <span className={`status-badge status-${badgeTone}`}>{value}</span>;
}
