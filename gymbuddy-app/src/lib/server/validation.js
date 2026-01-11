// Datei: src/lib/server/validation.js

export function hasDangerousKeyChars(str) {
  if (typeof str !== "string") return false;
  // $ in Feldwerten kann zu Mongo-Schlüssel-Injektion führen; Punkte in Werten erlauben wir (z.B. E-Mails).
  return str.includes("$");
}

export function assertSafeStrings(fields = []) {
  for (const val of fields) {
    if (hasDangerousKeyChars(val)) {
      throw new Error("invalid characters");
    }
  }
}
