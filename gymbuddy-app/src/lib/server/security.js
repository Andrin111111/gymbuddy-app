// Datei: src/lib/server/security.js
import crypto from "node:crypto";

const ITERATIONS = 150000;
const KEYLEN = 32;
const DIGEST = "sha256";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString("hex");

  return {
    salt,
    hash,
    iterations: ITERATIONS,
    keylen: KEYLEN,
    digest: DIGEST
  };
}

export function verifyPassword(password, stored) {
  if (!stored?.salt || !stored?.hash) return false;

  const iterations = stored.iterations ?? ITERATIONS;
  const keylen = stored.keylen ?? KEYLEN;
  const digest = stored.digest ?? DIGEST;

  const testHash = crypto.pbkdf2Sync(password, stored.salt, iterations, keylen, digest).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(testHash, "hex"), Buffer.from(stored.hash, "hex"));
}
