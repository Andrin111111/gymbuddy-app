import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "$lib/server/mongo.js";
import { isProfileComplete, XP_PROFILE_BONUS, calculateLevel } from "$lib/gamification.js";
import { assertSafeStrings } from "$lib/server/validation.js";
import {
  checkGeocodeRateLimit,
  ensureGeoIndex,
  geocodeAddress,
  normalizeGeoFromGeocode
} from "$lib/server/geo.js";

const profileSchema = z.object({
  name: z.string().max(120).trim().optional(),
  gym: z.string().max(120).trim().optional(),
  trainingLevel: z.string().trim().max(40).optional(),
  goals: z.string().max(300).trim().optional(),
  preferredTimes: z.string().max(200).trim().optional(),
  contact: z.string().max(200).trim().optional(),
  visibility: z.enum(["public", "friends", "private"]).optional(),
  feedOptIn: z.boolean().optional(),
  allowCodeLookup: z.boolean().optional(),
  addressLine1: z.string().max(80).trim().optional(),
  addressLine2: z.string().max(80).trim().optional(),
  postalCode: z.string().max(12).trim().optional(),
  city: z.string().max(50).trim().optional(),
  country: z.string().max(50).trim().optional()
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
    contact: String(p.contact ?? u?.contact ?? "").trim(),
    visibility: p.visibility || u?.visibility || "friends",
    feedOptIn: p.feedOptIn === true || u?.feedOptIn === true,
    allowCodeLookup: p.allowCodeLookup !== false && u?.allowCodeLookup !== false,
    addressLine1: String(p.addressLine1 ?? "").trim(),
    addressLine2: String(p.addressLine2 ?? "").trim(),
    postalCode: String(p.postalCode ?? "").trim(),
    city: String(p.city ?? "").trim(),
    country: String(p.country ?? "").trim() || "CH"
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
  const xp = Number(user?.lifetimeXp ?? user?.xp ?? 0);
  const trainingsCount = Number(user?.trainingsCount ?? 0);
  const level = calculateLevel(xp);

  return {
    userId: String(user?._id ?? ""),
    email: user?.email ?? "",
    buddyCode: getBuddyCode(user),
    ...profile,
    profile,
    xp,
    lifetimeXp: xp,
    seasonXp: Number(user?.seasonXp ?? xp),
    trainingsCount,
    profileBonusApplied: Boolean(user?.profileBonusApplied ?? user?.profileBonusGranted ?? false),
    level,
    geoUpdatedAt: user?.geoUpdatedAt ?? null,
    geoPrecision: user?.geoPrecision ?? null
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
    contact: String(updates?.contact ?? "").trim(),
    visibility: updates?.visibility || "friends",
    feedOptIn: updates?.feedOptIn === true,
    allowCodeLookup: updates?.allowCodeLookup !== false,
    addressLine1: String(updates?.addressLine1 ?? "").trim(),
    addressLine2: String(updates?.addressLine2 ?? "").trim(),
    postalCode: String(updates?.postalCode ?? "").trim(),
    city: String(updates?.city ?? "").trim(),
    country: String(updates?.country ?? "").trim() || "CH"
  };
  try {
    assertSafeStrings([
      profileDoc.name,
      profileDoc.gym,
      profileDoc.trainingLevel,
      profileDoc.goals,
      profileDoc.preferredTimes,
      profileDoc.contact,
      profileDoc.addressLine1,
      profileDoc.addressLine2,
      profileDoc.postalCode,
      profileDoc.city,
      profileDoc.country
    ]);
  } catch {
    return json({ error: "invalid characters" }, { status: 400 });
  }

  const oid = toObjectIdOrNull(locals.userId);
  if (!oid) return json({ error: "invalid userId" }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");

  const existingUser = await users.findOne({ _id: oid });
  if (!existingUser) {
    return json({ error: "user not found" }, { status: 404 });
  }

  const now = new Date();
  const previousProfile = pickProfileFromUser(existingUser);

  const addressKeys = ["addressLine1", "addressLine2", "postalCode", "city", "country"];
  const addressChanged = addressKeys.some((key) => (profileDoc[key] || "") !== (previousProfile[key] || ""));

  let geoOps = {};
  let geoMessage = null;

  if (addressChanged) {
    const anyAddressFilled = addressKeys.some((key) => profileDoc[key]);
    if (anyAddressFilled) {
      const allowed = checkGeocodeRateLimit(locals.userId);
      if (!allowed) {
        return json({ error: "geocoding rate limit exceeded" }, { status: 429 });
      }
      const result = await geocodeAddress(profileDoc);
      const geoPoint = result.ok ? normalizeGeoFromGeocode(result, result.precision || "approx") : null;
      if (result.ok && geoPoint) {
        await ensureGeoIndex(db);
        geoOps.$set = {
          geo: geoPoint,
          geoUpdatedAt: now,
          geoSource: "geocoded",
          geoPrecision: result.precision || "approx"
        };
        geoMessage = "Location updated";
      } else {
        geoOps.$unset = { geo: "", geoSource: "", geoPrecision: "" };
        geoOps.$set = { ...(geoOps.$set || {}), geoUpdatedAt: null };
        geoMessage = "Address saved, location not found";
      }
    } else {
      geoOps.$unset = { geo: "", geoUpdatedAt: "", geoSource: "", geoPrecision: "" };
      geoMessage = "Address cleared";
    }
  }

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
        visibility: profileDoc.visibility,
        feedOptIn: profileDoc.feedOptIn,
        allowCodeLookup: profileDoc.allowCodeLookup,
        updatedAt: now,
        ...(geoOps.$set || {})
      },
      ...(geoOps.$unset ? { $unset: geoOps.$unset } : {})
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
        $inc: { xp: XP_PROFILE_BONUS, lifetimeXp: XP_PROFILE_BONUS, seasonXp: XP_PROFILE_BONUS },
        $set: { profileBonusApplied: true, profileBonusGranted: true, updatedAt: now }
      }
    );
  }

  const user = await users.findOne({ _id: oid });
  const response = serializeProfile(user);
  if (geoMessage) response.geoMessage = geoMessage;
  return json(response);
}
