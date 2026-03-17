const SESSION_KEY = "alraqi_session_id";
const ADMIN_TOKEN_KEY = "alraqi_admin_token";
const CUSTOMER_TOKEN_KEY = "alraqi_customer_token";

export function getSessionId(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, sid);
  }

  return sid;
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function getCustomerToken() {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY) || sessionStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export function setCustomerToken(token: string | null, remember: boolean = true) {
  if (token === null) {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    sessionStorage.removeItem(CUSTOMER_TOKEN_KEY);
  } else {
    if (remember) {
      localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
      sessionStorage.removeItem(CUSTOMER_TOKEN_KEY);
    } else {
      sessionStorage.setItem(CUSTOMER_TOKEN_KEY, token);
      localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    }
  }
}

export function clearCustomerToken() {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  sessionStorage.removeItem(CUSTOMER_TOKEN_KEY);
}

export async function apiRequest(url: string, options?: RequestInit) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-session-id": getSessionId(),
    ...((options?.headers as Record<string, string>) || {}),
  };

  const adminToken = getAdminToken();
  if (adminToken) {
    headers["x-admin-token"] = adminToken;
  }

  const customerToken = getCustomerToken();
  if (customerToken) {
    headers["x-customer-token"] = customerToken;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.message || "حدث خطأ غير متوقع") as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  return res.json();
}

export async function seedDatabase() {
  return apiRequest("/api/seed", { method: "POST" });
}
