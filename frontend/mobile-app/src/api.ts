import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const TOKEN_KEY = "novara_token";
const REFRESH_KEY = "novara_refresh_token";

let refreshPromise: Promise<string | null> | null = null;

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function setToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {}
}

async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}

async function setTokens(token: string, refresh: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  } catch {}
}

export async function clearTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {}
}

async function attemptRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      await setToken(data.access_token);
      return data.access_token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (response.status === 401 && token) {
    const newToken = await attemptRefresh();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(`${API_URL}${path}`, { ...init, headers });
    }
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(detail.detail ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export interface MobileSession {
  token: string;
  user: { id: number; name: string; email: string; role: string };
}

export async function login(email: string, password: string): Promise<MobileSession> {
  const result = await apiRequest<{
    access_token: string;
    refresh_token: string;
    user: { id: number; name: string; email: string; role_id: number };
  }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  await setTokens(result.access_token, result.refresh_token);

  return {
    token: result.access_token,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: String(result.user.role_id),
    },
  };
}

export async function fetchDashboard(role: string): Promise<{
  student_count: number;
  message_count: number;
  notices: string[];
}> {
  try {
    const overview = await apiRequest<any>("/api/v1/admin/overview");
    return {
      student_count: overview.students_count ?? 0,
      message_count: overview.notifications_count ?? 0,
      notices: ["Welcome to the mobile app"],
    };
  } catch {
    return { student_count: 0, message_count: 0, notices: ["Offline mode"] };
  }
}

export { apiRequest, getToken };
