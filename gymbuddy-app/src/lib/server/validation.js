// src/lib/server/validation.js

export function hasDangerousKeyChars(str) {
  if (typeof str !== "string") return false;
  return str.includes("$") || str.includes(".");
}

export function assertSafeStrings(fields = []) {
  for (const val of fields) {
    if (hasDangerousKeyChars(val)) {
      throw new Error("invalid characters");
    }
  }
}
