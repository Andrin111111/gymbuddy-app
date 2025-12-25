import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo.js";
import { RANKS } from "$lib/ranks.config.js";
import { getRankFromXp } from "$lib/server/ranks.js";
import { ObjectId } from "mongodb";

function toObjectIdOrNull(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

function parseGoals(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((g) => String(g || "").trim().toLowerCase()).filter(Boolean);
  return String(input)
    .split(/[,;]+/)
    .map((g) => g.trim().toLowerCase())
    .filter(Boolean);
}

function rankIndexFromXp(xp) {
  const r = getRankFromXp(xp || 0);
  const idx = RANKS.findIndex((rr) => rr.key === r.key);
  return idx >= 0 ? idx : 0;
}

function parseAvailability(profile) {
  const arr = Array.isArray(profile?.availability) ? profile.availability : [];
  return arr
    .map((slot) => ({
      day: String(slot?.day || "").toLowerCase(),
      from: String(slot?.from || ""),
      to: String(slot?.to || "")
    }))
    .filter((s) => s.day && s.from && s.to);
}

function minutesOverlap(slotA, slotB) {
  if (!slotA?.day || !slotB?.day) return 0;
  if (slotA.day !== slotB.day) return 0;
  const [ah, am] = slotA.from.split(":").map(Number);
  const [bh, bm] = slotA.to.split(":").map(Number);
  const [ch, cm] = slotB.from.split(":").map(Number);
  const [dh, dm] = slotB.to.split(":").map(Number);
  if ([ah, am, bh, bm, ch, cm, dh, dm].some((n) => Number.isNaN(n))) return 0;
  const start = Math.max(ah * 60 + am, ch * 60 + cm);
  const end = Math.min(bh * 60 + bm, dh * 60 + dm);
  return Math.max(0, end - start);
}

function availabilityScore(myAvail, otherAvail) {
  if (!myAvail.length || !otherAvail.length) return { score: 0, used: false };
  let maxOverlap = 0;
  for (const a of myAvail) {
    for (const b of otherAvail) {
      maxOverlap = Math.max(maxOverlap, minutesOverlap(a, b));
    }
  }
  if (maxOverlap >= 60) return { score: 30, used: true, tag: "Overlap 60min+" };
  if (maxOverlap > 0) return { score: 15, used: true, tag: "Overlap <60min" };
  return { score: 0, used: true };
}

function goalsScore(myGoals, otherGoals) {
  if (!myGoals.length || !otherGoals.length) return { score: 0, tag: null };
  const shared = myGoals.find((g) => otherGoals.includes(g));
  const primaryMatch = otherGoals[0] && myGoals[0] && otherGoals[0] === myGoals[0];
  if (primaryMatch) return { score: 25, tag: "Gleiches Hauptziel" };
  if (shared) return { score: 15, tag: "Gemeinsames Ziel" };
  return { score: 0, tag: null };
}

function rankDistanceScore(myIdx, otherIdx) {
  const diff = Math.abs(myIdx - otherIdx);
  if (diff === 0) return { score: 20, tag: "Gleicher Rank" };
  if (diff === 1) return { score: 15, tag: "Aehnlicher Rank" };
  if (diff === 2) return { score: 8, tag: "Nahe Rank" };
  return { score: 0, tag: null };
}

function regionScore(myRegion, otherRegion) {
  const a = (myRegion || "").trim().toLowerCase();
  const b = (otherRegion || "").trim().toLowerCase();
  if (!a || !b) return { score: 0, tag: null };
  if (a === b) return { score: 15, tag: "Gleiche Region" };
  const aPrefix = a.split(/[ ,]/)[0];
  const bPrefix = b.split(/[ ,]/)[0];
  if (aPrefix && bPrefix && aPrefix === bPrefix) return { score: 8, tag: "Region nah" };
  return { score: 0, tag: null };
}

export async function GET({ locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const db = await getDb();
  const users = db.collection("users");
  const friendReq = db.collection("friendRequests");
  const blocks = db.collection("blocks");
  const workouts = db.collection("workouts");

  const meIdStr = String(locals.userId);
  const meId = toObjectIdOrNull(meIdStr) ?? meIdStr;

  const me = await users.findOne(
    { _id: meId },
    {
      projection: {
        profile: 1,
        name: 1,
        email: 1,
        buddyCode: 1,
        friends: 1,
        lifetimeXp: 1,
        xp: 1
      }
    }
  );
  if (!me) return json({ error: "user not found" }, { status: 404 });

  const meGoals = parseGoals(me.profile?.goals);
  const meAvail = parseAvailability(me.profile);
  const meRegion = me.profile?.region || me.profile?.gym || "";
  const meRankIdx = rankIndexFromXp(me.lifetimeXp ?? me.xp ?? 0);
  const friends = Array.isArray(me.friends) ? me.friends.map(String) : [];

  const blocksOut = await blocks.find({ userId: meIdStr }).toArray();
  const blocksIn = await blocks.find({ targetUserId: meIdStr }).toArray();
  const blockedSet = new Set([
    ...blocksOut.map((b) => String(b.targetUserId)),
    ...blocksIn.map((b) => String(b.userId))
  ]);

  const pending = await friendReq
    .find({ status: "pending", $or: [{ fromUserId: meIdStr }, { toUserId: meIdStr }] })
    .toArray();
  const pendingIds = new Set([
    ...pending.map((p) => p.fromUserId),
    ...pending.map((p) => p.toUserId)
  ]);

  const activityCursor = workouts.find({
    $or: [{ userId: meIdStr, buddyUserId: { $exists: true } }, { buddyUserId: meIdStr }]
  });
  const jointSet = new Set();
  for await (const w of activityCursor) {
    if (w.userId === meIdStr && w.buddyUserId) jointSet.add(String(w.buddyUserId));
    if (w.buddyUserId === meIdStr && w.userId) jointSet.add(String(w.userId));
  }

  const candidates = await users
    .find(
      { _id: { $ne: meId } },
      {
        projection: {
          profile: 1,
          name: 1,
          email: 1,
          buddyCode: 1,
          friends: 1,
          lifetimeXp: 1,
          xp: 1
        }
      }
    )
    .limit(200)
    .toArray();

  const suggestions = [];

  for (const u of candidates) {
    const id = String(u._id);
    if (blockedSet.has(id)) continue;
    const prof = u.profile ?? {};
    const visibility = prof.visibility || "friends";
    if (visibility === "private") continue;
    if (visibility === "friends" && !friends.includes(id)) continue;
    if (friends.includes(id)) continue;
    if (pendingIds.has(id)) continue;

    const goals = parseGoals(prof.goals);
    const avail = parseAvailability(prof);
    const region = prof.region || prof.gym || "";
    const rankIdx = rankIndexFromXp(u.lifetimeXp ?? u.xp ?? 0);

    let weights = { availability: 30, goals: 25, rank: 20, region: 15, activity: 10 };
    const availRes = availabilityScore(meAvail, avail);
    if (!availRes.used) weights.availability = 0;

    const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
    const scale = weightSum > 0 ? 100 / weightSum : 1;

    const goalRes = goalsScore(meGoals, goals);
    const rankRes = rankDistanceScore(meRankIdx, rankIdx);
    const regionRes = regionScore(meRegion, region);
    const activityRes = jointSet.has(id) ? { score: 10, tag: "Gemeinsames Training" } : { score: 0, tag: null };

    const rawScore =
      (availRes.score || 0) +
      (goalRes.score || 0) +
      (rankRes.score || 0) +
      (regionRes.score || 0) +
      (activityRes.score || 0);
    const score = Math.round(rawScore * scale);

    const tags = [
      ...(availRes.tag ? [availRes.tag] : []),
      ...(goalRes.tag ? [goalRes.tag] : []),
      ...(rankRes.tag ? [rankRes.tag] : []),
      ...(regionRes.tag ? [regionRes.tag] : []),
      ...(activityRes.tag ? [activityRes.tag] : [])
    ];

    suggestions.push({
      userId: id,
      name: String(prof.name ?? u.name ?? u.email ?? "").trim() || "Buddy",
      buddyCode: u.buddyCode || "",
      score,
      tags,
      rank: getRankFromXp(u.lifetimeXp ?? u.xp ?? 0)
    });
  }

  suggestions.sort((a, b) => b.score - a.score);

  return json({ suggestions: suggestions.slice(0, 5) });
}
