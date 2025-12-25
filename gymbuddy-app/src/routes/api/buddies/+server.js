import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { getDb } from "$lib/server/mongo.js";
import { z } from "zod";
import { rateLimit } from "$lib/server/rateLimit.js";
import { assertSafeStrings } from "$lib/server/validation.js";

const querySchema = z.object({
  gym: z.string().max(120).trim().optional(),
  level: z.string().max(40).trim().optional(),
  buddyCode: z.string().max(16).trim().optional()
});

function toObjectIdOrNull(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

function safeString(v) {
  return typeof v === "string" ? v : "";
}

function pickProfile(u) {
  const p = u?.profile ?? {};
  return {
    name: safeString(p.name || u.name),
    gym: safeString(p.gym || u.gym),
    trainingLevel: safeString(p.trainingLevel || u.trainingLevel || p.level || u.level),
    goals: safeString(p.goals || u.goals),
    preferredTimes: safeString(p.preferredTimes || u.preferredTimes || p.trainingTimes || u.trainingTimes),
    contact: safeString(p.contact || u.contact)
  };
}

function getBuddyCode(u) {
  return safeString(u?.buddyCode ?? u?.code ?? u?.gymBuddyId ?? "");
}

export async function GET({ locals, url }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const rlKey = `search:user:${locals.userId}`;
  if (!rateLimit(rlKey, 30, 60 * 1000)) {
    return json({ error: "rate limit exceeded" }, { status: 429 });
  }

  const userId = String(locals.userId);
  const meOid = toObjectIdOrNull(userId);

  const parsed = querySchema.safeParse({
    gym: url.searchParams.get("gym") || undefined,
    level: url.searchParams.get("level") || undefined,
    buddyCode: url.searchParams.get("buddyCode") || undefined
  });
  const filters = parsed.success ? parsed.data : {};
  try {
    assertSafeStrings([filters.gym, filters.level, filters.buddyCode].filter(Boolean));
  } catch {
    return json({ error: "invalid filter" }, { status: 400 });
  }

  const db = await getDb();
  const users = db.collection("users");

  const me = meOid
    ? await users.findOne({ _id: meOid }, { projection: { friends: 1, friendRequestsIn: 1, friendRequestsOut: 1, profile: 1, name: 1, gym: 1, trainingLevel: 1, goals: 1, preferredTimes: 1, contact: 1, email: 1, buddyCode: 1, xp: 1, trainingsCount: 1 } })
    : await users.findOne({ _id: userId }, { projection: { friends: 1, friendRequestsIn: 1, friendRequestsOut: 1, profile: 1, name: 1, gym: 1, trainingLevel: 1, goals: 1, preferredTimes: 1, contact: 1, email: 1, buddyCode: 1, xp: 1, trainingsCount: 1 } });

  if (!me) return json({ error: "user not found" }, { status: 404 });

  const friends = Array.isArray(me.friends) ? me.friends.map(String) : [];
  const inReq = Array.isArray(me.friendRequestsIn) ? me.friendRequestsIn.map(String) : [];
  const outReq = Array.isArray(me.friendRequestsOut) ? me.friendRequestsOut.map(String) : [];

  const query = {};
  if (filters.gym) query["profile.gym"] = { $regex: filters.gym, $options: "i" };
  if (filters.level) query["profile.trainingLevel"] = { $regex: `^${filters.level}$`, $options: "i" };
  if (filters.buddyCode) query["buddyCode"] = { $regex: filters.buddyCode };

  const all = await users
    .find(query, { projection: { email: 1, buddyCode: 1, code: 1, gymBuddyId: 1, xp: 1, trainingsCount: 1, profile: 1, name: 1, gym: 1, trainingLevel: 1, goals: 1, preferredTimes: 1, contact: 1, level: 1, trainingTimes: 1 } })
    .toArray();

  const mapped = all.map((u) => {
    const id = String(u._id);
    const isSelf = id === userId;

    let relationship = "none";
    if (isSelf) relationship = "self";
    else if (friends.includes(id)) relationship = "friend";
    else if (inReq.includes(id)) relationship = "incoming";
    else if (outReq.includes(id)) relationship = "outgoing";

    const p = pickProfile(u);

    return {
      id,
      _id: id,
      isSelf,
      relationship,
      email: safeString(u.email),
      buddyCode: getBuddyCode(u),
      code: getBuddyCode(u),
      name: p.name || safeString(u.email),
      gym: p.gym,
      trainingLevel: p.trainingLevel,
      level: p.trainingLevel,
      goals: p.goals,
      preferredTimes: p.preferredTimes,
      trainingTimes: p.preferredTimes,
      contact: p.contact,
      xp: Number(u.xp ?? 0),
      trainingsCount: Number(u.trainingsCount ?? 0)
    };
  });

  mapped.sort((a, b) => Number(b.isSelf) - Number(a.isSelf));

  return json({
    me: {
      id: userId,
      _id: userId,
      ...pickProfile(me),
      buddyCode: getBuddyCode(me),
      email: safeString(me.email),
      friends,
      friendRequestsIn: inReq,
      friendRequestsOut: outReq,
      xp: Number(me.xp ?? 0),
      trainingsCount: Number(me.trainingsCount ?? 0)
    },
    users: mapped
  });
}
