import { apiRequest } from "./client";
import type {
  Session,
  School,
  SubscriptionPlan,
  ApiKey,
  HealthCheck,
  AuditEntry,
  Payment,
  Incident,
  DashboardStats,
} from "./types";

// ===== Auth =====
export function loginAdmin(email: string, password: string): Promise<Session> {
  return apiRequest("/novara/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ===== Dashboard =====
export function getDashboardStats(): Promise<DashboardStats> {
  return apiRequest("/novara/dashboard/stats");
}

// ===== Schools =====
export function getSchools(): Promise<School[]> {
  return apiRequest("/novara/schools");
}

export function getSchool(id: number): Promise<School> {
  return apiRequest(`/novara/schools/${id}`);
}

export function createSchool(data: Partial<School> & { admin_email: string; admin_name: string; plan_id: number }): Promise<School> {
  return apiRequest("/novara/schools", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateSchool(id: number, data: Partial<School>): Promise<School> {
  return apiRequest(`/novara/schools/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function suspendSchool(id: number): Promise<{ detail: string }> {
  return apiRequest(`/novara/schools/${id}/suspend`, { method: "POST" });
}

export function activateSchool(id: number): Promise<{ detail: string }> {
  return apiRequest(`/novara/schools/${id}/activate`, { method: "POST" });
}

// ===== Subscription Plans =====
export function getPlans(): Promise<SubscriptionPlan[]> {
  return apiRequest("/novara/plans");
}

export function createPlan(data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
  return apiRequest("/novara/plans", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updatePlan(id: number, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
  return apiRequest(`/novara/plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ===== API Keys =====
export function getSchoolApiKeys(schoolId: number): Promise<ApiKey[]> {
  return apiRequest(`/novara/schools/${schoolId}/api-keys`);
}

export function generateApiKey(schoolId: number): Promise<{ key: string; key_display: string }> {
  return apiRequest(`/novara/schools/${schoolId}/api-keys`, {
    method: "POST",
  });
}

export function revokeApiKey(keyId: number): Promise<{ detail: string }> {
  return apiRequest(`/novara/api-keys/${keyId}/revoke`, { method: "POST" });
}

// ===== Health =====
export function getHealth(): Promise<HealthCheck[]> {
  return apiRequest("/novara/health").catch(() => []);
}

// ===== Audit =====
export function getAuditLogs(params?: { school_id?: number; limit?: number }): Promise<AuditEntry[]> {
  const q = new URLSearchParams();
  if (params?.school_id) q.set("school_id", String(params.school_id));
  if (params?.limit) q.set("limit", String(params.limit));
  return apiRequest(`/novara/audit?${q}`);
}

// ===== Payments =====
export function getPayments(): Promise<Payment[]> {
  return apiRequest("/novara/payments").catch(() => []);
}

// ===== Incidents =====
export function getIncidents(): Promise<Incident[]> {
  return apiRequest("/novara/incidents").catch(() => []);
}

// ===== Maintenance =====
export function getMaintenanceStatus(): Promise<{ enabled: boolean }> {
  return apiRequest("/novara/maintenance");
}

export function toggleMaintenance(enabled: boolean): Promise<{ enabled: boolean; message: string }> {
  return apiRequest("/novara/maintenance/toggle", {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
}

// ===== Notifications =====
export function getNotifications(): Promise<any[]> {
  return apiRequest("/novara/audit?limit=20").catch(() => []);
}

// ===== Registrations =====
export function getRegistrations(status?: string): Promise<any[]> {
  const q = status ? `?status=${status}` : "";
  return apiRequest(`/novara/registrations${q}`);
}

export function approveRegistration(requestId: number): Promise<{ school_id: number; temp_password: string; api_key: string; message: string; email_sent: boolean }> {
  return apiRequest(`/novara/registrations/${requestId}/approve`, { method: "POST" });
}

export function rejectRegistration(requestId: number): Promise<{ detail: string }> {
  return apiRequest(`/novara/registrations/${requestId}/reject`, { method: "POST" });
}

export function resendKey(requestId: number): Promise<{ message: string; email_sent: boolean }> {
  return apiRequest(`/novara/registrations/${requestId}/resend-key`, { method: "POST" });
}
