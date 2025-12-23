// src/lib/session.js

const SESSION_KEY = "GYMBUDDY-ATH";

// Falls du vorher andere Keys hattest, migrieren wir automatisch.
const LEGACY_KEYS = [
  "gymbuddy-session",
  "gymbuddy-auth",
  "gymbuddy-session-key",
  "gymbuddy-session-v1"
];

function safeParse(jsonStr) {
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function isValidSession(s) {
  return !!(s && typeof s === "object" && typeof s.userId === "string" && s.userId.trim().length > 0);
}

export function readSession() {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(SESSION_KEY);
  const parsed = safeParse(raw);
  if (isValidSession(parsed)) return parsed;

  for (const key of LEGACY_KEYS) {
    const legacyRaw = window.localStorage.getItem(key);
    const legacyParsed = safeParse(legacyRaw);
    if (isValidSession(legacyParsed)) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(legacyParsed));
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
      return legacyParsed;
    }
  }

  return null;
}

export function writeSession(session) {
  if (typeof window === "undefined") return;

  const clean = {
    userId: String(session?.userId ?? "").trim(),
    email: String(session?.email ?? "").trim()
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(clean));
  window.dispatchEvent(new CustomEvent("gymbuddy-session-changed"));
}

export function clearSession() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }

  for (const key of LEGACY_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  window.dispatchEvent(new CustomEvent("gymbuddy-session-changed"));
}

