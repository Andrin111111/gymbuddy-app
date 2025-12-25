import { json } from "@sveltejs/kit";
import { clearSessionCookie, deleteSessionByToken, SESSION_COOKIE } from "$lib/server/sessions.js";

export async function POST({ cookies }) {
  const token = cookies.get(SESSION_COOKIE);

  if (token) {
    await deleteSessionByToken(token);
  }

  clearSessionCookie(cookies);

  return json({ ok: true });
}
