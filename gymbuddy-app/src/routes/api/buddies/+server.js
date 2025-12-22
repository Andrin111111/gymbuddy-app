// src/routes/api/buddies/+server.js
import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { getDb } from "$lib/server/mongo.js";

function toObjectIdOrNull(id) {
  try {
    return new ObjectId(String(id));
  } catch {
    return null;
  }
}

function safeString(v) {
  return typeof v === "string" ? v.trim() : "";
}

function pseudoDistanceKm(seed) {
  const s = String(seed);
  let n = 0;
  for (let i = 0; i < s.length; i += 1) {
    n = (n * 31 + s.charCodeAt(i)) % 25;
  }
  return n + 1;
}

function normalizeProfileFromUser(u) {
  const p = u?.profile ?? {};
  const code = safeString(p.code ?? u?.buddyCode ?? u?.gymBuddyId ?? "");

  return {
    name: safeString(p.name ?? u?.name),
    gym: safeString(p.gym ?? u?.gym),
    level: safeString(p.level ?? u?.level ?? u?.trainingLevel ?? "beginner"),
    goals: safeString(p.goals ?? u?.goals),
    trainingTimes: safeString(p.trainingTimes ?? u?.trainingTimes ?? u?.preferredTimes),
    contact: safeString(p.contact ?? u?.contact),
    code
  };
}

export async function GET({ url }) {
  const userId = url.searchParams.get("userId") ?? "";
  if (!userId) return json({ error: "userId fehlt" }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");

  const meObjectId = toObjectIdOrNull(userId);
  if (!meObjectId) return json({ error: "invalid userId" }, { status: 400 });

  const me = await users.findOne({ _id: meObjectId });
  if (!me) return json({ error: "User nicht gefunden" }, { status: 404 });

  const myIdStr = me._id.toString();
  const myFriends = Array.isArray(me.friends) ? me.friends : [];
  const myIn = Array.isArray(me.friendRequestsIn) ? me.friendRequestsIn : [];
  const myOut = Array.isArray(me.friendRequestsOut) ? me.friendRequestsOut : [];

  const allUsers = await users
    .find(
      {},
      {
        projection: {
          email: 1,
          profile: 1,
          buddyCode: 1,
          gymBuddyId: 1,
          name: 1,
          gym: 1,
          level: 1,
          trainingLevel: 1,
          goals: 1,
          trainingTimes: 1,
          preferredTimes: 1,
          contact: 1,
          xp: 1,
          trainingsCount: 1
        }
      }
    )
    .toArray();

  const buddies = allUsers.map((u) => {
    const id = u._id.toString();
    const p = normalizeProfileFromUser(u);

    const isSelf = id === myIdStr;
    let relationship = "none";
    if (isSelf) relationship = "self";
    else if (myFriends.includes(id)) relationship = "friends";
    else if (myIn.includes(id)) relationship = "incoming";
    else if (myOut.includes(id)) relationship = "outgoing";

    return {
      id,
      email: safeString(u.email),
      name: p.name || "(kein Name)",
      gym: p.gym,
      level: p.level,
      goals: p.goals,
      trainingTimes: p.trainingTimes,
      contact: p.contact,
      code: p.code,
      xp: Number(u.xp ?? 0),
      trainingsCount: Number(u.trainingsCount ?? 0),
      distanceKm: pseudoDistanceKm(id),
      relationship,
      isSelf
    };
  });

  return json(buddies);
}
