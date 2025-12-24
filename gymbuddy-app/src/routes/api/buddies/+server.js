import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { getDb } from "$lib/server/mongo.js";

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

function pseudoDistanceKm(idStr) {
  let sum = 0;
  for (let i = 0; i < idStr.length; i++) sum += idStr.charCodeAt(i);
  return (sum % 18) + 1;
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

export async function GET({ url }) {
  const userId = url.searchParams.get("userId");
  if (!userId) return json({ error: "missing userId" }, { status: 400 });

  const meOid = toObjectIdOrNull(userId);
  if (!meOid) return json({ error: "invalid userId" }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");

  const me = await users.findOne({ _id: meOid }, { projection: { friends: 1, friendRequestsIn: 1, friendRequestsOut: 1 } });
  if (!me) return json({ error: "user not found" }, { status: 404 });

  const friends = Array.isArray(me.friends) ? me.friends : [];
  const inReq = Array.isArray(me.friendRequestsIn) ? me.friendRequestsIn : [];
  const outReq = Array.isArray(me.friendRequestsOut) ? me.friendRequestsOut : [];

  const all = await users
    .find({}, { projection: { email: 1, buddyCode: 1, code: 1, gymBuddyId: 1, xp: 1, trainingsCount: 1, profile: 1, name: 1, gym: 1, trainingLevel: 1, goals: 1, preferredTimes: 1, contact: 1, level: 1, trainingTimes: 1 } })
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
      trainingsCount: Number(u.trainingsCount ?? 0),
      distanceKm: pseudoDistanceKm(id)
    };
  });

  mapped.sort((a, b) => Number(b.isSelf) - Number(a.isSelf));

  return json(mapped);
}
