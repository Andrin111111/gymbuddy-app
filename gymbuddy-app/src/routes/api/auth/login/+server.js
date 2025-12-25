// src/routes/api/auth/login/+server.js
import { json } from "@sveltejs/kit";
import { z } from "zod";
import { getDb } from "$lib/server/mongo";
import { verifyPassword } from "$lib/server/security";
import { createSession, setSessionCookie } from "$lib/server/sessions.js";
import { rateLimit } from "$lib/server/rateLimit.js";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1)
});

export async function POST({ request, cookies }) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "E-Mail und Passwort sind erforderlich." }, { status: 400 });
    }
    const { email, password } = parsed.data;

    // Rate limit: per IP and per email
    const ip = request.headers.get("x-forwarded-for") || "ip-unknown";
    if (!rateLimit(`login:ip:${ip}`, 10, 10 * 60 * 1000)) {
      return json({ error: "Zu viele Login-Versuche. Bitte warten." }, { status: 429 });
    }
    if (!rateLimit(`login:email:${email}`, 5, 10 * 60 * 1000)) {
      return json({ error: "Zu viele Login-Versuche. Bitte warten." }, { status: 429 });
    }


    const db = await getDb();
    const users = db.collection("users");

    const user = await users.findOne({ email });
    if (!user) {
      return json({ error: "Login fehlgeschlagen." }, { status: 401 });
    }

    const ok = verifyPassword(password, user.password);
    if (!ok) {
      return json({ error: "Login fehlgeschlagen." }, { status: 401 });
    }

    const session = await createSession(user._id.toString());
    setSessionCookie(cookies, session.token, session.expiresAt);

    return json({
      userId: user._id.toString(),
      email: user.email,
      buddyCode: user.buddyCode
    });
  } catch (err) {
    console.error(err);
    return json({ error: "Login fehlgeschlagen." }, { status: 500 });
  }
}
