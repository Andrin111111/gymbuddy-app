// src/lib/session.js
// Client-side session helper: keeps a local snapshot of the server session (httpOnly cookie-backed).

let currentSession = null;
let readyFlag = false;

export function readSession() {
  return currentSession;
}

export function writeSession(session) {
  currentSession = session ?? null;
  readyFlag = true;
  notifySessionChanged();
}

export function clearSession() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem("GYMBUDDY-ATH");
      window.localStorage.removeItem("gymbuddy-session");
      window.localStorage.removeItem("gymbuddy-auth");
      window.localStorage.removeItem("gymbuddy-session-key");
      window.localStorage.removeItem("gymbuddy-session-v1");
    } catch {}
  }
  currentSession = null;
  readyFlag = true;
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
  const session = await fetchServerSession();
  currentSession = session;
  readyFlag = true;
  notifySessionChanged();
  return session;
}

/**
 * callback(session, ready)
 * ready == true sobald ein Server-Check erfolgt ist.
 */
export function subscribeSession(callback) {
  if (typeof window === "undefined") return () => {};

  const emit = () => callback(currentSession, readyFlag);
  const onCustom = () => emit();
  const onStorage = () => emit();

  window.addEventListener("gymbuddy-session-changed", onCustom);
  window.addEventListener("storage", onStorage);

  emit();
  fetchServerSession().then((s) => {
    currentSession = s;
    readyFlag = true;
    emit();
  });

  return () => {
    window.removeEventListener("gymbuddy-session-changed", onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

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
