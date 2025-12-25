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

export async function GET({ locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const userId = String(locals.userId);
  const db = await getDb();
  await ensureWorkoutIndexes(db);

  const workoutsCol = db.collection("workouts");
  const usersCol = db.collection("users");

  const workouts = await workoutsCol
    .find({ userId })
    .sort({ date: -1, createdAt: -1 })
    .toArray();

  const user = await usersCol.findOne(
    { _id: toObjectIdOrNull(userId) ?? userId },
    { projection: { xp: 1, lifetimeXp: 1, seasonXp: 1, trainingsCount: 1 } }
  );

  await recomputeUserStats(userId);

  const xp = Number(user?.lifetimeXp ?? user?.xp ?? 0);
  const trainingsCount = Number(user?.trainingsCount ?? workouts.length);
  const level = calculateLevel(xp);

  return json({
    workouts: workouts.map(mapWorkoutDoc),
    summary: { xp, level, trainingsCount }
  });
}

export async function POST({ locals, request }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid json" }, { status: 400 });

  const parsed = workoutInputSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid workout data" }, { status: 400 });

  const userId = String(locals.userId);
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

  const me = await usersCol.findOne(
    { _id: toObjectIdOrNull(userId) ?? userId },
    { projection: { friends: 1 } }
  );
  if (!me) return json({ error: "user not found" }, { status: 404 });

  const { map } = await loadExerciseCatalog(userId);

  let normalizedExercises;
  try {
    normalizedExercises = normalizeExercises(parsed.data.exercises, map);
  } catch (e) {
    return json({ error: e?.message || "invalid exercises" }, { status: 400 });
  }

  let buddy = { buddyUserId: null, buddyName: "" };
  try {
    buddy = await resolveBuddy(userId, parsed.data.buddyUserId, usersCol, me);
  } catch (e) {
    return json({ error: e?.message || "invalid buddy" }, { status: 400 });
  }

  const withBuddy = Boolean(buddy.buddyUserId);
  const now = new Date();
  const statsDoc = await statsCol.findOne({ userId });
  const bestWeights = statsDoc?.bestWeightByExerciseKey || {};

  const metrics = computeWorkoutMetrics({ exercises: normalizedExercises }, bestWeights);
  const dailyAwardedCount = await countAwardingWorkouts(userId, dateLocal);
  const streakInfo = await computeStreakInfo(userId);
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

  const doc = {
    userId,
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
    createdAt: now,
    updatedAt: now
  };

  const insertRes = await workoutsCol.insertOne(doc);

  await usersCol.updateOne(
    { _id: toObjectIdOrNull(userId) ?? userId },
    {
      $inc: { trainingsCount: 1, xp: xpData.xpAwarded, lifetimeXp: xpData.xpAwarded, seasonXp: xpData.xpAwarded },
      $set: { updatedAt: now }
    }
  );

  const user = await usersCol.findOne(
    { _id: toObjectIdOrNull(userId) ?? userId },
    { projection: { xp: 1, lifetimeXp: 1, seasonXp: 1, trainingsCount: 1 } }
  );
  const xp = Number(user?.lifetimeXp ?? user?.xp ?? 0);
  const trainingsCount = Number(user?.trainingsCount ?? 0);
  const level = calculateLevel(xp);

  const stats = await recomputeUserStats(userId);
  await recomputeSeasonXp(userId);
  const friendsCount = Array.isArray(me?.friends) ? me.friends.length : 0;
  const unlocked = await unlockFromStats(userId, stats, friendsCount);
  if (unlocked && unlocked.length) {
    for (const key of unlocked) {
      await createNotification(userId, "achievement_unlocked", { key });
    }
  }

  return json({
    ok: true,
    workout: { ...doc, _id: String(insertRes.insertedId) },
    summary: { xp, level, trainingsCount, lifetimeXp: xp, seasonXp: Number(user?.seasonXp ?? xp) }
  });
}
