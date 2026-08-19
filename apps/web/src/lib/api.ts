const TOKEN_KEY = "infraasset.token";

export type Session = {
  access_token: string;
  role: string;
  email: string;
  full_name: string;
  tenant: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("infraasset.session");
  return raw ? (JSON.parse(raw) as Session) : null;
}

export function setSession(session: Session) {
  localStorage.setItem(TOKEN_KEY, session.access_token);
  localStorage.setItem("infraasset.session", JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("infraasset.session");
}

function apiErrorMessage(text: string, fallback: string) {
  try {
    const parsed = JSON.parse(text) as { detail?: unknown };
    if (typeof parsed.detail === "string") return parsed.detail;
    if (Array.isArray(parsed.detail)) {
      return (
        parsed.detail
          .map((item) => (typeof item === "object" && item && "msg" in item ? String(item.msg) : ""))
          .filter(Boolean)
          .join(" ") || fallback
      );
    }
  } catch {
    /* raw body */
  }
  return text || fallback;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers });
  if (res.status === 401 && typeof window !== "undefined") {
    clearSession();
    const route = window.location.pathname;
    if (route !== "/login" && route !== "/signup") {
      window.location.href = "/login";
    }
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(apiErrorMessage(text, res.statusText));
  }
  return res.json() as Promise<T>;
}
