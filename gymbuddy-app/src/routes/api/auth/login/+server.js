// src/routes/api/auth/login/+server.js
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo.js";

export async function POST({ request }) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return json({ error: "E-Mail und Passwort sind erforderlich." }, { status: 400 });
  }

  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ email: email.toLowerCase() });

  if (!user || user.password !== password) {
    return json({ error: "E-Mail oder Passwort ist falsch." }, { status: 401 });
  }

  return json({
    userId: user._id.toString(),
    email: user.email,
    profile: user.profile
  });
}
