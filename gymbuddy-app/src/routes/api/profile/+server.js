// src/routes/api/profile/+server.js
import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { getDb } from "$lib/server/mongo.js";
import { isProfileComplete, XP_PROFILE_BONUS } from "$lib/gamification.js";

function toObjectId(id) {
  try {
    return new ObjectId(String(id));
  } catch {
    return null;
  }
}

function buildProfileFromUser(user) {
  const p = user?.profile ?? {};

  const code =
    String(p.code ?? user?.buddyCode ?? user?.gymBuddyId ?? user?.gymBuddyId ?? "").trim();

  return {
    name: String(p.name ?? user?.name ?? "").trim(),
    gym: String(p.gym ?? user?.gym ?? "").trim(),
    level: String(p.level ?? user?.level ?? user?.trainingLevel ?? "beginner").trim(),
    goals: String(p.goals ?? user?.goals ?? "").trim(),
    trainingTimes: String(p.trainingTimes ?? user?.trainingTimes ?? user?.preferredTimes ?? "").trim(),
    contact: String(p.contact ?? user?.contact ?? "").trim(),
    code
  };
}

export async function GET({ url }) {
  const userId = url.searchParams.get("userId");
  if (!userId) return json({ error: "userId missing" }, { status: 400 });

  const _id = toObjectId(userId);
  if (!_id) return json({ error: "invalid userId" }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");

  const user = await users.findOne({ _id }, { projection: { password: 0 } });
  if (!user) return json({ error: "User not found" }, { status: 404 });

  const profile = buildProfileFromUser(user);

  return json({
    profile,
    xp: Number(user.xp ?? 0),
    trainingsCount: Number(user.trainingsCount ?? 0),
    profileBonusApplied: user.profileBonusApplied === true || user.profileBonusGranted === true
  });
}

export async function PUT({ request }) {
  const body = await request.json();

  const userId = body?.userId;
  const updates = body?.profileUpdates ?? body?.profile ?? {};

  if (!userId) return json({ error: "userId missing" }, { status: 400 });

  const _id = toObjectId(userId);
  if (!_id) return json({ error: "invalid userId" }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");

  const user = await users.findOne({ _id });
  if (!user) return json({ error: "User not found" }, { status: 404 });

  const existingProfile = buildProfileFromUser(user);

  const mergedProfile = {
    ...existingProfile,
    name: String(updates.name ?? existingProfile.name).trim(),
    gym: String(updates.gym ?? existingProfile.gym).trim(),
    level: String(updates.level ?? existingProfile.level).trim(),
    goals: String(updates.goals ?? existingProfile.goals).trim(),
    trainingTimes: String(updates.trainingTimes ?? updates.preferredTimes ?? existingProfile.trainingTimes).trim(),
    contact: String(updates.contact ?? existingProfile.contact).trim(),
    code: existingProfile.code
  };

  const completeNow = isProfileComplete(mergedProfile);
  const bonusAlready =
    user.profileBonusApplied === true || user.profileBonusGranted === true;

  const update = {
    $set: {
      profile: mergedProfile,
      name: mergedProfile.name,
      gym: mergedProfile.gym,
      level: mergedProfile.level,
      goals: mergedProfile.goals,
      trainingTimes: mergedProfile.trainingTimes,
      preferredTimes: mergedProfile.trainingTimes,
      contact: mergedProfile.contact,
      updatedAt: new Date()
    }
  };

  if (completeNow && !bonusAlready) {
    update.$inc = { xp: XP_PROFILE_BONUS };
    update.$set.profileBonusApplied = true;
    update.$set.profileBonusGranted = true;
  }

  const { value: updated } = await users.findOneAndUpdate(
    { _id },
    update,
    { returnDocument: "after" }
  );

  return json({
    ok: true,
    profile: buildProfileFromUser(updated),
    xp: Number(updated?.xp ?? 0),
    trainingsCount: Number(updated?.trainingsCount ?? 0),
    profileBonusApplied: updated?.profileBonusApplied === true || updated?.profileBonusGranted === true
  });
}

export async function POST(event) {
  return PUT(event);
}
