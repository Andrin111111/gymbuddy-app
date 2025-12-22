// src/routes/api/auth/login/+server.js
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo";
import { verifyPassword } from "$lib/server/security";

export async function POST({ request }) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return json({ error: "E-Mail und Passwort sind erforderlich." }, { status: 400 });
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
