import { browser } from "$app/environment";

export const SESSION_KEY = "GYMBUDDY-ATH";

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function readSession() {
  if (!browser) return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  const parsed = safeParse(raw);
  if (!parsed || typeof parsed !== "object") return null;
  if (!parsed.userId) return null;
  return parsed;
}

export function writeSession(session) {
  if (!browser) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("gymbuddy-session-changed"));
}

export function clearSession() {
  if (!browser) return;
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("gymbuddy-session-changed"));
}

export function onSessionChange(callback) {
  if (!browser) return () => {};

  const handler = (e) => {
    if (e?.type === "storage") {
      if (e.key && e.key !== SESSION_KEY) return;
    }
    callback(readSession());
  };

  window.addEventListener("storage", handler);
  window.addEventListener("gymbuddy-session-changed", handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("gymbuddy-session-changed", handler);
  };
}
