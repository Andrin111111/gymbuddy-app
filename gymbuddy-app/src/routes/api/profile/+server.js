import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "$lib/server/mongo.js";
import { isProfileComplete, XP_PROFILE_BONUS, calculateLevel } from "$lib/gamification.js";

const profileSchema = z.object({
  name: z.string().max(120).trim().optional(),
  gym: z.string().max(120).trim().optional(),
  trainingLevel: z.string().trim().max(40).optional(),
  goals: z.string().max(300).trim().optional(),
  preferredTimes: z.string().max(200).trim().optional(),
  contact: z.string().max(200).trim().optional()
});

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

function serializeProfile(user) {
  const profile = pickProfileFromUser(user);
  const xp = Number(user?.xp ?? 0);
  const trainingsCount = Number(user?.trainingsCount ?? 0);
  const level = calculateLevel(xp);

  return {
    userId: String(user?._id ?? ""),
    email: user?.email ?? "",
    buddyCode: getBuddyCode(user),
    ...profile,
    profile,
    xp,
    trainingsCount,
    profileBonusApplied: Boolean(user?.profileBonusApplied ?? user?.profileBonusGranted ?? false),
    level
  };
}

export async function GET({ locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const oid = toObjectIdOrNull(locals.userId);
  const db = await getDb();
  const users = db.collection("users");

  const user = oid
    ? await users.findOne({ _id: oid })
    : await users.findOne({ _id: locals.userId });

  if (!user) {
    return json({ error: "user not found" }, { status: 404 });
  }

  return json(serializeProfile(user));
}

export async function PUT({ locals, request }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid json" }, { status: 400 });

  const updatesRaw = body.profileUpdates ?? body.profile ?? body;
  const parsed = profileSchema.safeParse(updatesRaw);
  if (!parsed.success) {
    return json({ error: "invalid profile data" }, { status: 400 });
  }
  const updates = parsed.data;

  const profileDoc = {
    name: String(updates?.name ?? "").trim(),
    gym: String(updates?.gym ?? "").trim(),
    trainingLevel: String(updates?.trainingLevel ?? updates?.level ?? "").trim(),
    goals: String(updates?.goals ?? "").trim(),
    preferredTimes: String(updates?.preferredTimes ?? updates?.trainingTimes ?? "").trim(),
    contact: String(updates?.contact ?? "").trim()
  };

  const oid = toObjectIdOrNull(locals.userId);
  if (!oid) return json({ error: "invalid userId" }, { status: 400 });

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
  return json(serializeProfile(user));
}
