// src/lib/server/ids.js

/**
 * Generiert einen 6-stelligen Buddy-Code als String.
 * Beispiel: "734821"
 */
export function randomBuddyCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
