// src/routes/api/profile/+server.js
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo";
import { isProfileComplete, XP_PROFILE_BONUS } from "$lib/gamification.js";

/**
 * GET /api/profile?userId=...
 * Liefert Profil + XP + Trainingsanzahl.
 */
export async function GET({ url }) {
  const userId = url.searchParams.get("userId");
  if (!userId) return json({ error: "userId missing" }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");

  const user = await users.findOne(
    { _id: userId },
    { projection: { passwordHash: 0 } }
  );

  if (!user) return json({ error: "User not found" }, { status: 404 });

  return json({
    profile: {
      name: user.name ?? "",
      gym: user.gym ?? "",
      level: user.level ?? "",
      goals: user.goals ?? "",
      preferredTimes: user.preferredTimes ?? "",
      contact: user.contact ?? "",
      gymBuddyId: user.gymBuddyId,
    },
    xp: user.xp ?? 0,
    trainingsCount: user.trainingsCount ?? 0,
    profileBonusApplied: user.profileBonusApplied === true,
  });
}

/**
 * POST /api/profile
 * Body: { userId, profile }
 * Speichert das Profil. Wenn das Profil zum ersten Mal vollständig ist:
 * +30 XP und Flag "profileBonusApplied = true".
 */
export async function POST({ request }) {
  const data = await request.json();
  const { userId, profile } = data;

  if (!userId) return json({ error: "userId missing" }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");

  // Bisherigen User laden
  const existingUser = await users.findOne({ _id: userId });
  if (!existingUser) return json({ error: "User not found" }, { status: 404 });

  // Neues Profil simulieren (altes Userobjekt + neue Felder)
  const mergedProfile = {
    ...existingUser,
    name: profile.name ?? "",
    gym: profile.gym ?? "",
    level: profile.level ?? "",
    goals: profile.goals ?? "",
    preferredTimes: profile.preferredTimes ?? "",
    contact: profile.contact ?? "",
  };

  const nowComplete = isProfileComplete(mergedProfile);

  const update = {
    $set: {
      name: mergedProfile.name,
      gym: mergedProfile.gym,
      level: mergedProfile.level,
      goals: mergedProfile.goals,
      preferredTimes: mergedProfile.preferredTimes,
      contact: mergedProfile.contact,
    },
  };

  // Bonus, wenn:
  // - Profil jetzt vollständig
  // - und bisher noch keine Bonus-XP gewährt
  if (nowComplete && existingUser.profileBonusApplied !== true) {
    update.$inc = { xp: XP_PROFILE_BONUS };
    update.$set.profileBonusApplied = true;
  }

  const { value: updatedUser } = await users.findOneAndUpdate(
    { _id: userId },
    update,
    { returnDocument: "after" }
  );

  return json({
    ok: true,
    xp: updatedUser?.xp ?? 0,
    trainingsCount: updatedUser?.trainingsCount ?? 0,
    profileBonusApplied: updatedUser?.profileBonusApplied === true,
  });
}
