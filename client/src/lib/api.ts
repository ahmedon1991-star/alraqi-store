import { queryClient } from "./queryClient";

const SESSION_KEY = "alraqi_session_id";

export function getSessionId(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export async function apiRequest(url: string, options?: RequestInit) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-session-id": getSessionId(),
    ...(options?.headers as Record<string, string> || {}),
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "حدث خطأ");
  }
  return res.json();
}

export async function seedDatabase() {
  return apiRequest("/api/seed", { method: "POST" });
}
