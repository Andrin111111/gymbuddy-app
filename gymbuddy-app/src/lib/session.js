// src/lib/session.js

// Einheitlicher Session-Key (bitte überall verwenden)
export const SESSION_KEY = "GYMBUDDY-ATH";

// Alte Keys (falls du vorher andere Keys hattest) automatisch migrieren
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
  return !!(
    s &&
    typeof s === "object" &&
    typeof s.userId === "string" &&
    s.userId.trim().length > 0
  );
}

function notifySessionChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("gymbuddy-session-changed"));
}

function migrateLegacySession() {
  if (typeof window === "undefined") return null;

  const current = safeParse(window.localStorage.getItem(SESSION_KEY));
  if (isValidSession(current)) return current;

  for (const key of LEGACY_KEYS) {
    const legacyParsed = safeParse(window.localStorage.getItem(key));
    if (isValidSession(legacyParsed)) {
      try {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(legacyParsed));
      } catch {}

      for (const k of LEGACY_KEYS) {
        try {
          window.localStorage.removeItem(k);
        } catch {}
      }

      notifySessionChanged();
      return legacyParsed;
    }
  }

  return null;
}

export function readSession() {
  if (typeof window === "undefined") return null;

  const migrated = migrateLegacySession();
  if (isValidSession(migrated)) return migrated;

  const raw = window.localStorage.getItem(SESSION_KEY);
  const parsed = safeParse(raw);
  return isValidSession(parsed) ? parsed : null;
}

export function writeSession(session) {
  if (typeof window === "undefined") return;

  if (!isValidSession(session)) {
    clearSession();
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  notifySessionChanged();
}

export function clearSession() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {}

  notifySessionChanged();
}

/**
 * Für Pages: callback sofort + bei Login/Logout updaten
 */
export function subscribeSession(callback) {
  if (typeof window === "undefined") return () => {};

  const emit = () => callback(readSession());

  const onCustom = () => emit();
  const onStorage = (e) => {
    if (!e || e.key === null || e.key === SESSION_KEY || LEGACY_KEYS.includes(e.key)) {
      emit();
    }
  };

  window.addEventListener("gymbuddy-session-changed", onCustom);
  window.addEventListener("storage", onStorage);

  emit();

  return () => {
    window.removeEventListener("gymbuddy-session-changed", onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
