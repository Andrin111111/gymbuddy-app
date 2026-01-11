// Datei: src/lib/server/sessions.js
import crypto from "node:crypto";
import { getDb } from "./mongo.js";
import { isProduction } from "./env.js";

const SESSION_COLLECTION = "sessions";
export const SESSION_COOKIE = "gb_session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 Tage
const SESSION_ABSOLUTE_MS = 1000 * 60 * 60 * 24 * 30; // 30 Tage

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function getSessionCollection() {
  const db = await getDb();
  const col = db.collection(SESSION_COLLECTION);
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return col;
}

export async function createSession(userId) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const absoluteExpiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_MS);

  const col = await getSessionCollection();
  await col.insertOne({
    _id: tokenHash,
    userId: String(userId),
    createdAt: now,
    lastUsed: now,
    expiresAt,
    absoluteExpiresAt
  });

  return { token, expiresAt };
}

export async function deleteSessionByToken(token) {
  if (!token) return;
  const col = await getSessionCollection();
  await col.deleteOne({ _id: hashToken(token) });
}

export async function readSessionFromToken(token) {
  if (!token) return null;
  const col = await getSessionCollection();
  const hashed = hashToken(token);
  const session = await col.findOne({ _id: hashed });
  if (!session) return null;

  const now = new Date();
  if (session.absoluteExpiresAt && session.absoluteExpiresAt < now) {
    await col.deleteOne({ _id: hashed });
    return null;
  }

  const newExpiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await col.updateOne(
    { _id: hashed },
    { $set: { lastUsed: now, expiresAt: newExpiresAt } }
  );

  return { userId: session.userId, token, expiresAt: newExpiresAt };
}

export function setSessionCookie(cookies, token, expiresAt) {
  const maxAgeSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  cookies.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    maxAge: maxAgeSeconds
  });
}

export function clearSessionCookie(cookies) {
  cookies.delete(SESSION_COOKIE, { path: "/" });
}

export async function readSessionFromCookies(cookies) {
  const token = cookies.get(SESSION_COOKIE);
  if (!token) return null;

  const session = await readSessionFromToken(token);
  if (!session) {
    clearSessionCookie(cookies);
    return null;
  }

  setSessionCookie(cookies, token, session.expiresAt);
  return session;
}
