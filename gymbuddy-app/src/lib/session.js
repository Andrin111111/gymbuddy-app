// src/lib/session.js

// We no longer trust localStorage for auth state. Source of truth is the server
// session (httpOnly cookie). These helpers only provide a client snapshot after
// confirming with /api/auth/me.

export function readSession() {
  return null;
}

export function writeSession() {
  // no-op: session is derived from server cookie only
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("GYMBUDDY-ATH");
  } catch {}
  try {
    window.localStorage.removeItem("gymbuddy-session");
    window.localStorage.removeItem("gymbuddy-auth");
    window.localStorage.removeItem("gymbuddy-session-key");
    window.localStorage.removeItem("gymbuddy-session-v1");
  } catch {}
  notifySessionChanged();
}

function notifySessionChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("gymbuddy-session-changed"));
}

async function fetchServerSession() {
  if (typeof window === "undefined") return null;

  try {
    const res = await fetch("/api/auth/me", { method: "GET" });
    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    if (data?.userId) {
      return {
        userId: String(data.userId),
        email: data.email ?? "",
        buddyCode: data.buddyCode ?? ""
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function refreshSession() {
  return fetchServerSession();
}

/**
 * Fuer Pages: callback sofort + bei Login/Logout updaten, holt echten Status vom Server.
 */
export function subscribeSession(callback) {
  if (typeof window === "undefined") return () => {};

  let latest = null;
  let ready = false;
  const emit = () => callback(latest, ready);

  const onCustom = () => emit();
  const onStorage = () => emit();

  window.addEventListener("gymbuddy-session-changed", onCustom);
  window.addEventListener("storage", onStorage);

  // start as loading; emit once ready to avoid false "not logged in" flicker
  emit();
  fetchServerSession().then((s) => {
    latest = s;
    ready = true;
    emit();
  });

  return () => {
    window.removeEventListener("gymbuddy-session-changed", onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

// Alias fuer bestehende Importe (altes Naming)
export const onSessionChange = subscribeSession;

function parseCookie(name) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift() || null;
  return null;
}

export function getCsrfToken() {
  return parseCookie("gb_csrf");
}

export function csrfHeader() {
  const token = getCsrfToken();
  return token ? { "x-csrf-token": token } : {};
}
