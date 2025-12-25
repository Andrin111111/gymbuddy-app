// src/routes/api/auth/register/+server.js
import { json } from "@sveltejs/kit";
import { z } from "zod";
import { getDb } from "$lib/server/mongo";
import { hashPassword } from "$lib/server/security";
import { randomBuddyCode } from "$lib/server/ids";
import { createSession, setSessionCookie } from "$lib/server/sessions.js";
import { rateLimit } from "$lib/server/rateLimit.js";

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6)
});

export async function POST({ request, cookies }) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "E-Mail und Passwort sind erforderlich." }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const ip = request.headers.get("x-forwarded-for") || "ip-unknown";
    if (!rateLimit(`register:ip:${ip}`, 5, 60 * 60 * 1000)) {
      return json({ error: "Zu viele Registrierungen. Bitte spaeter versuchen." }, { status: 429 });
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
      profile: {
        name: "",
        gym: "",
        trainingLevel: "",
        goals: "",
        preferredTimes: "",
        contact: "",
        visibility: "friends",
        feedOptIn: false,
        allowCodeLookup: true
      },
      visibility: "friends",
      feedOptIn: false,
      allowCodeLookup: true,

      // Gamification
      profileBonusGranted: false,

      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await users.insertOne(doc);

    const userId = result.insertedId.toString();

    const session = await createSession(userId);
    setSessionCookie(cookies, session.token, session.expiresAt);

    return json({ userId, email, buddyCode });
  } catch (err) {
    console.error(err);
    return json({ error: "Registrierung fehlgeschlagen." }, { status: 500 });
  }
}
