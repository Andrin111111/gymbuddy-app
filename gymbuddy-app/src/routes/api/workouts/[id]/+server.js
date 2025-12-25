import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo.js";
import {
  workoutInputSchema,
  ensureWorkoutIndexes,
  loadExerciseCatalog,
  normalizeExercises,
  normalizeDate,
  normalizeLocation,
  resolveBuddy,
  mapWorkoutDoc,
  recomputeUserStats,
  computeWorkoutMetrics,
  computeXpBreakdown,
  countAwardingWorkouts,
  computeStreakInfo
} from "$lib/server/workouts.js";
import { calculateLevel } from "$lib/gamification.js";
import { assertSafeStrings } from "$lib/server/validation.js";
import { toObjectIdOrNull } from "$lib/server/objectId.js";
import { seasonIdForDate, recomputeSeasonXp } from "$lib/server/ranks.js";
import { unlockFromStats } from "$lib/server/achievements.js";
import { createNotification } from "$lib/server/notifications.js";

function notFound() {
  return json({ error: "not found" }, { status: 404 });
}

export async function GET({ locals, params }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const workoutId = params.id;
  const workoutOid = toObjectIdOrNull(workoutId);
  if (!workoutOid) return json({ error: "invalid id" }, { status: 400 });

  const db = await getDb();
  const workoutsCol = db.collection("workouts");

  const workout = await workoutsCol.findOne({ _id: workoutOid, userId: String(locals.userId) });
  if (!workout) return notFound();

  return json({ workout: mapWorkoutDoc(workout) });
}

export async function PUT({ locals, params, request }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const workoutId = params.id;
  const workoutOid = toObjectIdOrNull(workoutId);
  if (!workoutOid) return json({ error: "invalid id" }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid json" }, { status: 400 });

  const parsed = workoutInputSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid workout data" }, { status: 400 });

  const { isoDate, dateLocal } = (() => {
    try {
      return normalizeDate(parsed.data.date);
    } catch {
      return {};
    }
  })();
  if (!isoDate) return json({ error: "invalid date" }, { status: 400 });

  const durationMinutes = parsed.data.durationMinutes;
  const notes = String(parsed.data.notes ?? "").trim();
  const location = normalizeLocation(parsed.data.location);

  try {
    assertSafeStrings([notes, location].filter(Boolean));
  } catch {
    return json({ error: "invalid characters" }, { status: 400 });
  }

  const db = await getDb();
  await ensureWorkoutIndexes(db);

  const workoutsCol = db.collection("workouts");
  const usersCol = db.collection("users");
  const statsCol = db.collection("userStats");

  const existing = await workoutsCol.findOne({ _id: workoutOid, userId: String(locals.userId) });
  if (!existing) return notFound();

  const { map } = await loadExerciseCatalog(locals.userId);
  let normalizedExercises;
  try {
    normalizedExercises = normalizeExercises(parsed.data.exercises, map);
  } catch (e) {
    return json({ error: e?.message || "invalid exercises" }, { status: 400 });
  }

  const me = await usersCol.findOne(
    { _id: toObjectIdOrNull(locals.userId) ?? String(locals.userId) },
    { projection: { friends: 1 } }
  );
  if (!me) return json({ error: "user not found" }, { status: 404 });

  let buddy = { buddyUserId: null, buddyName: "" };
  try {
    buddy = await resolveBuddy(String(locals.userId), parsed.data.buddyUserId, usersCol, me);
  } catch (e) {
    return json({ error: e?.message || "invalid buddy" }, { status: 400 });
  }

  const withBuddy = Boolean(buddy.buddyUserId);
  const statsDoc = await statsCol.findOne({ userId: String(locals.userId) });
  const bestWeights = statsDoc?.bestWeightByExerciseKey || {};
  const metrics = computeWorkoutMetrics({ exercises: normalizedExercises }, bestWeights);
  const dailyAwardedCount = await countAwardingWorkouts(
    String(locals.userId),
    dateLocal,
    workoutOid
  );
  const streakInfo = await computeStreakInfo(String(locals.userId), workoutOid);
  const xpData = computeXpBreakdown({
    exercises: normalizedExercises,
    durationMinutes,
    withBuddy,
    prEvents: metrics.prEvents,
    dailyAwardedCount,
    streakDaysBefore: streakInfo.streakDays || 0,
    lastWorkoutDateLocal: streakInfo.lastWorkoutDateLocal || "",
    dateLocal
  });
  const prevXp = Number(existing?.xpAwarded ?? existing?.xpGain ?? 0);
  const deltaXp = xpData.xpAwarded - prevXp;

  const now = new Date();
  await workoutsCol.updateOne(
    { _id: workoutOid, userId: String(locals.userId) },
    {
      $set: {
        date: isoDate,
        dateLocal,
        seasonId: seasonIdForDate(dateLocal),
        durationMinutes,
        notes,
        location,
        buddyUserId: buddy.buddyUserId,
        buddyName: buddy.buddyName,
        withBuddy,
        exercises: normalizedExercises,
        prEvents: metrics.prEvents,
        totalVolume: metrics.totalVolume,
        xpAwarded: xpData.xpAwarded,
        xpBreakdown: xpData.breakdown,
        xpGain: xpData.xpAwarded,
        updatedAt: now
      }
    }
  );

  if (deltaXp !== 0) {
    await usersCol.updateOne(
      { _id: toObjectIdOrNull(locals.userId) ?? String(locals.userId) },
      {
        $inc: { xp: deltaXp, lifetimeXp: deltaXp, seasonXp: deltaXp },
        $set: { updatedAt: now }
      }
    );
  } else {
    await usersCol.updateOne(
      { _id: toObjectIdOrNull(locals.userId) ?? String(locals.userId) },
      { $set: { updatedAt: now } }
    );
  }

  const updated = await workoutsCol.findOne({ _id: workoutOid, userId: String(locals.userId) });
  const user = await usersCol.findOne(
    { _id: toObjectIdOrNull(locals.userId) ?? String(locals.userId) },
    { projection: { xp: 1, lifetimeXp: 1, seasonXp: 1, trainingsCount: 1 } }
  );

  await recomputeSeasonXp(locals.userId);
  const stats = await recomputeUserStats(locals.userId);
  const friendsCount = Array.isArray(me?.friends) ? me.friends.length : 0;
  const unlocked = await unlockFromStats(String(locals.userId), stats, friendsCount);
  if (unlocked && unlocked.length) {
    for (const key of unlocked) {
      await createNotification(String(locals.userId), "achievement_unlocked", { key });
    }
  }

  const xp = Number(user?.lifetimeXp ?? user?.xp ?? 0);
  const trainingsCount = Number(user?.trainingsCount ?? 0);
  const level = calculateLevel(xp);

  return json({
    ok: true,
    workout: mapWorkoutDoc(updated),
    summary: { xp, level, trainingsCount, lifetimeXp: xp, seasonXp: Number(user?.seasonXp ?? xp) }
  });
}

export async function DELETE({ locals, params }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const workoutId = params.id;
  const workoutOid = toObjectIdOrNull(workoutId);
  if (!workoutOid) return json({ error: "invalid id" }, { status: 400 });

  const db = await getDb();
  await ensureWorkoutIndexes(db);

  const workoutsCol = db.collection("workouts");
  const usersCol = db.collection("users");

  const existing = await workoutsCol.findOne({ _id: workoutOid, userId: String(locals.userId) });
  if (!existing) return notFound();

  await workoutsCol.deleteOne({ _id: workoutOid, userId: String(locals.userId) });

  const xpGain = Number(existing?.xpAwarded ?? existing?.xpGain ?? 0);
  const now = new Date();

  await usersCol.updateOne(
    { _id: toObjectIdOrNull(locals.userId) ?? String(locals.userId) },
    {
      $inc: { trainingsCount: -1, xp: -xpGain, lifetimeXp: -xpGain, seasonXp: -xpGain },
      $set: { updatedAt: now }
    }
  );

  const user = await usersCol.findOne(
    { _id: toObjectIdOrNull(locals.userId) ?? String(locals.userId) },
    { projection: { xp: 1, lifetimeXp: 1, seasonXp: 1, trainingsCount: 1, friends: 1 } }
  );
  const xp = Number(user?.lifetimeXp ?? user?.xp ?? 0);
  const trainingsCount = Math.max(0, Number(user?.trainingsCount ?? 0));
  const level = calculateLevel(xp);

  await recomputeSeasonXp(locals.userId);
  const stats = await recomputeUserStats(locals.userId);
  const friendsCount = Array.isArray(user?.friends) ? user.friends.length : 0;
  const unlocked = await unlockFromStats(String(locals.userId), stats, friendsCount);
  if (unlocked && unlocked.length) {
    for (const key of unlocked) {
      await createNotification(String(locals.userId), "achievement_unlocked", { key });
    }
  }

  return json({
    ok: true,
    summary: { xp, level, trainingsCount, lifetimeXp: xp, seasonXp: Number(user?.seasonXp ?? xp) }
  });
}
