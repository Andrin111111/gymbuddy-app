// src/hooks.server.js
import { readSessionFromCookies, clearSessionCookie } from "$lib/server/sessions.js";
import { ensureCsrfCookie, validateCsrf } from "$lib/server/csrf.js";

export async function handle({ event, resolve }) {
  // Ensure CSRF cookie is set
  ensureCsrfCookie(event.cookies);

  // Load session
  const session = await readSessionFromCookies(event.cookies);
  if (session?.userId) {
    event.locals.userId = session.userId;
    event.locals.sessionToken = session.token;
  }

  // CSRF validation for state-changing methods
  if (!validateCsrf(event)) {
    clearSessionCookie(event.cookies);
    return new Response(JSON.stringify({ error: "CSRF validation failed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  return resolve(event);
}
