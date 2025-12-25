// src/lib/server/csrf.js
import crypto from "node:crypto";
import { isProduction } from "./env.js";

const CSRF_COOKIE = "gb_csrf";
const CSRF_HEADER = "x-csrf-token";

export function ensureCsrfCookie(cookies) {
  let token = cookies.get(CSRF_COOKIE);
  if (!token) {
    token = crypto.randomBytes(16).toString("hex");
    cookies.set(CSRF_COOKIE, token, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: isProduction(),
      maxAge: 60 * 60 * 24 * 30
    });
  }
  return token;
}

export function validateCsrf(event) {
  // Allow safe methods
  if (event.request.method === "GET" || event.request.method === "HEAD" || event.request.method === "OPTIONS") {
    return true;
  }

  const cookieToken = event.cookies.get(CSRF_COOKIE);
  const headerToken = event.request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return false;
  }

  return true;
}

export const csrf = {
  cookieName: CSRF_COOKIE,
  headerName: CSRF_HEADER,
  ensure: ensureCsrfCookie,
  validate: validateCsrf
};
