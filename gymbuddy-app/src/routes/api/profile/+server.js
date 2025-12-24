import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { getDb } from "$lib/server/mongo.js";
import { isProfileComplete, XP_PROFILE_BONUS, calculateLevel } from "$lib/gamification.js";

function toObjectIdOrNull(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

function pickProfileFromUser(u) {
  const p = u?.profile ?? {};
  return {
    name: String(p.name ?? u?.name ?? "").trim(),
    gym: String(p.gym ?? u?.gym ?? "").trim(),
    trainingLevel: String(p.trainingLevel ?? u?.trainingLevel ?? p.level ?? u?.level ?? "").trim(),
    goals: String(p.goals ?? u?.goals ?? "").trim(),
    preferredTimes: String(p.preferredTimes ?? u?.preferredTimes ?? p.trainingTimes ?? u?.trainingTimes ?? "").trim(),
    contact: String(p.contact ?? u?.contact ?? "").trim()
  };
}

function getBuddyCode(u) {
  return String(
    u?.buddyCode ??
      u?.gymBuddyId ??
      u?.gymBuddyCode ??
      u?.buddyId ??
      u?.code ??
      ""
  );
}

export async function GET({ url }) {
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return json({ error: "missing userId" }, { status: 400 });
  }

  const db = await getDb();
  const users = db.collection("users");

  const oid = toObjectIdOrNull(userId);

  let user = null;
  if (oid) user = await users.findOne({ _id: oid });
  if (!user) user = await users.findOne({ _id: userId });

  if (!user) {
    return json({ error: "user not found" }, { status: 404 });
  }

  const profile = pickProfileFromUser(user);
  const xp = Number(user.xp ?? 0);

  return json({
    userId: String(user._id),
    email: user.email ?? "",
    buddyCode: getBuddyCode(user),
    profile,
    xp,
    trainingsCount: Number(user.trainingsCount ?? 0),
    profileBonusApplied: Boolean(user.profileBonusApplied ?? user.profileBonusGranted ?? false),
    level: calculateLevel(xp)
  });
}

export async function PUT({ request }) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid json" }, { status: 400 });

  const userId = body.userId;
  const updates = body.profileUpdates ?? body.profile ?? body;

  if (!userId) return json({ error: "missing userId" }, { status: 400 });

  const oid = toObjectIdOrNull(userId);
  if (!oid) return json({ error: "invalid userId" }, { status: 400 });

  const profileDoc = {
    name: String(updates?.name ?? "").trim(),
    gym: String(updates?.gym ?? "").trim(),
    trainingLevel: String(updates?.trainingLevel ?? updates?.level ?? "").trim(),
    goals: String(updates?.goals ?? "").trim(),
    preferredTimes: String(updates?.preferredTimes ?? updates?.trainingTimes ?? "").trim(),
    contact: String(updates?.contact ?? "").trim()
  };

  const db = await getDb();
  const users = db.collection("users");

  const now = new Date();

  const updateRes = await users.updateOne(
    { _id: oid },
    {
      $set: {
        name: profileDoc.name,
        gym: profileDoc.gym,
        trainingLevel: profileDoc.trainingLevel,
        goals: profileDoc.goals,
        preferredTimes: profileDoc.preferredTimes,
        contact: profileDoc.contact,
        profile: profileDoc,
        updatedAt: now
      }
    }
  );

  if (updateRes.matchedCount === 0) {
    return json({ error: "user not found" }, { status: 404 });
  }

  const complete = isProfileComplete(profileDoc);

  if (complete) {
    await users.updateOne(
      { _id: oid, profileBonusApplied: { $ne: true } },
      {
        $inc: { xp: XP_PROFILE_BONUS },
        $set: { profileBonusApplied: true, profileBonusGranted: true, updatedAt: now }
      }
    );
  }

  const user = await users.findOne({ _id: oid });
  const profile = pickProfileFromUser(user);
  const xp = Number(user?.xp ?? 0);

  return json({
    ok: true,
    userId: String(user?._id ?? userId),
    buddyCode: getBuddyCode(user),
    profile,
    xp,
    trainingsCount: Number(user?.trainingsCount ?? 0),
    profileBonusApplied: Boolean(user?.profileBonusApplied ?? user?.profileBonusGranted ?? false),
    level: calculateLevel(xp)
  });
}
