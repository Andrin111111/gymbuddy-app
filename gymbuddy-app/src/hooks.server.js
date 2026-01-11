// Datei: src/hooks.server.js
import { readSessionFromCookies, clearSessionCookie } from "$lib/server/sessions.js";
import { ensureCsrfCookie, validateCsrf } from "$lib/server/csrf.js";

export async function handle({ event, resolve }) {
  // CSRF-Cookie sicherstellen
  ensureCsrfCookie(event.cookies);

  // Session laden
  const session = await readSessionFromCookies(event.cookies);
  if (session?.userId) {
    event.locals.userId = session.userId;
    event.locals.sessionToken = session.token;
  }

  // CSRF-Pruefung fuer zustandsaendernde Methoden
  if (!validateCsrf(event)) {
    clearSessionCookie(event.cookies);
    return new Response(JSON.stringify({ error: "CSRF validation failed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  return resolve(event);
}
