// src/routes/api/auth/register/+server.js
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo";
import { hashPassword } from "$lib/server/security";
import { randomBuddyCode } from "$lib/server/ids";

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

    const existing = await users.findOne({ email });
    if (existing) {
      return json({ error: "Diese E-Mail ist bereits registriert." }, { status: 409 });
    }

    // Buddy-Code eindeutig machen
    let buddyCode = randomBuddyCode();
    for (let i = 0; i < 10; i += 1) {
      const taken = await users.findOne({ buddyCode });
      if (!taken) break;
      buddyCode = randomBuddyCode();
    }

    const pw = hashPassword(password);

    const doc = {
      email,
      password: pw,
      buddyCode,

      // Profilfelder
      name: "",
      gym: "",
      trainingLevel: "",
      goals: "",
      preferredTimes: "",
      contact: "",

      // Gamification
      profileBonusGranted: false,

      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await users.insertOne(doc);

    return json({
      userId: result.insertedId.toString(),
      email,
      buddyCode
    });
  } catch (err) {
    console.error(err);
    return json({ error: "Registrierung fehlgeschlagen." }, { status: 500 });
  }
}
