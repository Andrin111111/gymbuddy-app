// src/routes/api/auth/register/+server.js
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo.js";

async function generateUniqueCode(db) {
  while (true) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const existing = await db.collection("users").findOne({ "profile.code": code });
    if (!existing) return code;
  }
}

export async function POST({ request }) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return json({ error: "E-Mail und Passwort sind erforderlich." }, { status: 400 });
  }

  if (password.length < 8) {
    return json({ error: "Passwort muss mindestens 8 Zeichen lang sein." }, { status: 400 });
  }

  const db = await getDb();
  const users = db.collection("users");

  const existing = await users.findOne({ email: email.toLowerCase() });
  if (existing) {
    return json(
      { error: "Für diese E-Mail existiert bereits ein Konto. Bitte melde dich an." },
      { status: 400 }
    );
  }

  const code = await generateUniqueCode(db);

  const userDoc = {
    email: email.toLowerCase(),
    password, // Prototyp: im Klartext, in echt: hashen
    profile: {
      name: "",
      gym: "",
      level: "beginner",
      goals: "",
      trainingTimes: "",
      contact: "",
      code
    },
    createdAt: new Date()
  };

  const result = await users.insertOne(userDoc);

  return json(
    {
      userId: result.insertedId.toString(),
      email: userDoc.email,
      profile: userDoc.profile
    },
    { status: 201 }
  );
}
