// src/routes/api/profile/+server.js
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo.js";
import { ObjectId } from "mongodb";

async function generateUniqueCode(db) {
  while (true) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const existing = await db.collection("users").findOne({ "profile.code": code });
    if (!existing) return code;
  }
}

export async function GET({ url }) {
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return json({ error: "userId fehlt." }, { status: 400 });
  }

  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });

  if (!user) {
    return json({ error: "Benutzer nicht gefunden." }, { status: 404 });
  }

  return json({
    userId: user._id.toString(),
    email: user.email,
    profile: user.profile
  });
}

export async function PUT({ request }) {
  const { userId, profileUpdates } = await request.json();

  if (!userId || !profileUpdates) {
    return json({ error: "userId oder profileUpdates fehlt." }, { status: 400 });
  }

  const db = await getDb();
  const users = db.collection("users");
  const _id = new ObjectId(userId);

  const user = await users.findOne({ _id });
  if (!user) {
    return json({ error: "Benutzer nicht gefunden." }, { status: 404 });
  }

  let profile = user.profile || {};
  if (!profile.code) {
    profile.code = await generateUniqueCode(db);
  }

  // GymBuddy-ID NICHT änderbar
  const updatedProfile = {
    ...profile,
    name: profileUpdates.name ?? profile.name ?? "",
    gym: profileUpdates.gym ?? profile.gym ?? "",
    level: profileUpdates.level ?? profile.level ?? "beginner",
    goals: profileUpdates.goals ?? profile.goals ?? "",
    trainingTimes: profileUpdates.trainingTimes ?? profile.trainingTimes ?? "",
    contact: profileUpdates.contact ?? profile.contact ?? "",
    code: profile.code
  };

  await users.updateOne(
    { _id },
    { $set: { profile: updatedProfile } }
  );

  return json({
    userId,
    email: user.email,
    profile: updatedProfile
  });
}
