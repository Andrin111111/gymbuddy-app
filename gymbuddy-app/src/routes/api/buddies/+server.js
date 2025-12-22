// src/routes/api/buddies/+server.js
// Liefert alle GymBuddies aus MongoDB inkl. Beziehungsstatus

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

function normalizeProfile(profile) {
  const p = profile || {};
  return {
    name: safeString(p.name),
    gym: safeString(p.gym),
    level: p.level ?? "",
    goals: safeString(p.goals),
    trainingTimes: safeString(p.trainingTimes ?? p.preferredTimes),
    contact: safeString(p.contact),
    code: safeString(p.code)
  };
}

export async function GET({ url }) {
  const userId = url.searchParams.get("userId") ?? "";
  if (!userId) return json({ error: "userId fehlt" }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");

  const meObjectId = toObjectIdOrNull(userId);

  let me = meObjectId ? await users.findOne({ _id: meObjectId }) : null;
  if (!me) me = await users.findOne({ _id: userId });

  if (!me) return json({ error: "User nicht gefunden" }, { status: 404 });

  const myIdStr = me._id?.toString?.() ?? String(me._id);
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
          xp: 1,
          trainingsCount: 1
        }
      }
    )
    .toArray();

  const buddies = allUsers.map((u) => {
    const id = u._id?.toString?.() ?? String(u._id);
    const p = normalizeProfile(u.profile);

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
