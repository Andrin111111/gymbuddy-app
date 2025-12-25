import { json } from "@sveltejs/kit";
import { z } from "zod";
import { getDb } from "$lib/server/mongo.js";
import { assertSafeStrings } from "$lib/server/validation.js";
import { ObjectId } from "mongodb";
import { computeDistanceKm } from "$lib/server/geo.js";

const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  buddyCode: z.string().trim().max(16).optional(),
  gym: z.string().trim().max(120).optional(),
  level: z.string().trim().max(40).optional(),
  maxDistanceKm: z
    .preprocess(
      (v) => {
        if (v === null || v === undefined || v === "") return undefined;
        const num = Number(v);
        return Number.isFinite(num) ? num : undefined;
      },
      z.number().positive().max(500).optional()
    )
});

function toObjectIdOrNull(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

function sanitizeProfile(u) {
  const p = u?.profile ?? {};
  return {
    name: String(p.name ?? u?.name ?? "").trim(),
    gym: String(p.gym ?? u?.gym ?? "").trim(),
    trainingLevel: String(p.trainingLevel ?? u?.trainingLevel ?? p.level ?? u?.level ?? "").trim(),
    goals: String(p.goals ?? u?.goals ?? "").trim(),
    preferredTimes: String(p.preferredTimes ?? u?.preferredTimes ?? p.trainingTimes ?? u?.trainingTimes ?? "").trim(),
    contact: String(p.contact ?? u?.contact ?? "").trim(),
    visibility: p.visibility || "friends",
    allowCodeLookup: p.allowCodeLookup !== false,
    feedOptIn: p.feedOptIn === true,
    city: String(p.city ?? "").trim(),
    postalCode: String(p.postalCode ?? "").trim()
  };
}

export async function GET({ locals, url }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q") || undefined,
    buddyCode: url.searchParams.get("buddyCode") || undefined,
    gym: url.searchParams.get("gym") || undefined,
    level: url.searchParams.get("level") || undefined,
    maxDistanceKm: url.searchParams.get("maxDistanceKm") || undefined
  });
  if (!parsed.success) return json({ error: "invalid query" }, { status: 400 });

  const { q, buddyCode, gym, level, maxDistanceKm } = parsed.data;
  try {
    assertSafeStrings([q, buddyCode, gym, level].filter(Boolean));
  } catch {
    return json({ error: "invalid query" }, { status: 400 });
  }

  const db = await getDb();
  const usersCol = db.collection("users");
  const friendReqCol = db.collection("friendRequests");
  const blocksCol = db.collection("blocks");

  const meIdStr = String(locals.userId);
  const meId = toObjectIdOrNull(meIdStr) ?? meIdStr;

  const me = await usersCol.findOne(
    { _id: meId },
    { projection: { friends: 1, profile: 1, name: 1, email: 1, buddyCode: 1, geo: 1 } }
  );
  if (!me) return json({ error: "user not found" }, { status: 404 });

  const myFriends = Array.isArray(me.friends) ? me.friends.map(String) : [];

  const myBlocks = await blocksCol.find({ userId: meIdStr }).toArray();
  const blockedBy = await blocksCol.find({ targetUserId: meIdStr }).toArray();
  const blockedIds = new Set([
    ...myBlocks.map((b) => String(b.targetUserId)),
    ...blockedBy.map((b) => String(b.userId))
  ]);

  const query = { _id: { $ne: meId } };
  if (gym) {
    query["profile.gym"] = { $regex: gym, $options: "i" };
  }
  if (level) {
    query["profile.trainingLevel"] = { $regex: `^${level}$`, $options: "i" };
  }
  if (q) {
    query.$or = [
      { "profile.name": { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } }
    ];
  }
  if (buddyCode) {
    query.buddyCode = { $regex: buddyCode };
  }

  const raw = await usersCol
    .find(query, {
      projection: {
        profile: 1,
        name: 1,
        email: 1,
        buddyCode: 1,
        friends: 1,
        geo: 1
      }
    })
    .limit(50)
    .toArray();

  const pending = await friendReqCol
    .find({
      status: "pending",
      $or: [{ fromUserId: meIdStr }, { toUserId: meIdStr }]
    })
    .toArray();
  const outgoing = new Set(pending.filter((p) => p.fromUserId === meIdStr).map((p) => p.toUserId));
  const incoming = new Set(pending.filter((p) => p.toUserId === meIdStr).map((p) => p.fromUserId));

  const applyDistance = Boolean(maxDistanceKm && me.geo?.coordinates);
  const results = raw
    .filter((u) => {
      const prof = sanitizeProfile(u);
      const isBlocked = blockedIds.has(String(u._id));
      if (isBlocked) return false;
      if (prof.visibility === "private") {
        if (!buddyCode) return false;
        if (!prof.allowCodeLookup) return false;
        return String(u.buddyCode || "").includes(buddyCode);
      }
      if (prof.visibility === "friends") {
        return myFriends.includes(String(u._id)) || Boolean(buddyCode);
      }
      return true;
    })
    .map((u) => {
      const prof = sanitizeProfile(u);
      const id = String(u._id);
      const relationship = myFriends.includes(id)
        ? "friend"
        : incoming.has(id)
        ? "incoming"
        : outgoing.has(id)
        ? "outgoing"
        : "none";
      const distanceKm =
        me?.geo && u?.geo ? computeDistanceKm(me.geo, u.geo) : null;
      if (applyDistance) {
        if (!u?.geo || distanceKm === null) return null;
        if (distanceKm > maxDistanceKm) return null;
      }
      return {
        _id: id,
        name: prof.name || u.email || "Buddy",
        gym: prof.gym,
        trainingLevel: prof.trainingLevel,
        goals: prof.goals,
        preferredTimes: prof.preferredTimes,
        buddyCode: u.buddyCode || "",
        visibility: prof.visibility,
        allowCodeLookup: prof.allowCodeLookup,
        relationship,
        city: prof.city || null,
        postalCode: prof.postalCode || null,
        computedDistanceKm: distanceKm !== null && Number.isFinite(distanceKm) ? Math.round(distanceKm) : null
      };
    })
    .filter(Boolean);

  return json({
    me: {
      _id: meIdStr,
      buddyCode: me?.buddyCode || "",
      friends: myFriends,
      profile: sanitizeProfile(me),
      geo: me?.geo ? { updatedAt: me.geoUpdatedAt ?? null } : null
    },
    distanceInfo: {
      applied: applyDistance,
      maxDistanceKm: maxDistanceKm || null,
      hasGeo: Boolean(me?.geo),
      ignoredReason: !me?.geo && maxDistanceKm ? "missing-geo" : null
    },
    results
  });
}
