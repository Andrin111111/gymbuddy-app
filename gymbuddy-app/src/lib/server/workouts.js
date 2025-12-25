// src/lib/server/workouts.js
import { z } from "zod";
import { getDb } from "./mongo.js";
import { BUILT_IN_EXERCISES } from "$lib/data/exercises.js";
import { assertSafeStrings } from "./validation.js";
import { toObjectIdOrNull } from "./objectId.js";

const locationOptions = ["gym", "home", "outdoor", "other"];

function numberFromInput(min, max, opts = {}) {
  return z.preprocess((v) => {
    if (typeof v === "string" && v.trim() === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }, opts.int ? z.number().int().min(min).max(max) : z.number().min(min).max(max));
}

export const setSchema = z.object({
  reps: numberFromInput(1, 50, { int: true }),
  weight: numberFromInput(0, 500),
  rpe: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(1).max(10)
  ).optional(),
  isWarmup: z.boolean().optional()
});

export const exerciseSchema = z.object({
  exerciseKey: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(80),
  sets: z.array(setSchema).min(1).max(30)
});

export const workoutInputSchema = z.object({
  date: z.string().trim().min(1).max(32),
  durationMinutes: numberFromInput(5, 240, { int: true }),
  notes: z.string().trim().max(300).optional().default(""),
  location: z.string().trim().optional(),
  buddyUserId: z.string().trim().max(64).optional(),
  exercises: z.array(exerciseSchema).min(1).max(30)
});

export const templateInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  durationMinutes: numberFromInput(5, 240, { int: true }).optional(),
  notes: z.string().trim().max(300).optional().default(""),
  location: z.string().trim().optional(),
  exercises: z.array(exerciseSchema).min(1).max(30)
});

export function normalizeDate(value) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let isoDate;
  let dateLocal;

  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (Number.isNaN(dt.getTime())) throw new Error("invalid date");
    isoDate = dt.toISOString();
    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    dateLocal = `${y}-${mm}-${dd}`;
  } else {
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) throw new Error("invalid date");
    isoDate = dt.toISOString();
    dateLocal = isoDate.slice(0, 10);
  }

  return { isoDate, dateLocal };
}

export function normalizeLocation(value) {
  const loc = String(value ?? "").trim().toLowerCase();
  if (locationOptions.includes(loc)) return loc;
  return "gym";
}

export async function ensureWorkoutIndexes(db) {
  const workouts = db.collection("workouts");
  const templates = db.collection("templates");
  const userExercises = db.collection("userExercises");
  const userStats = db.collection("userStats");

  await Promise.all([
    workouts.createIndex({ userId: 1, date: -1 }),
    workouts.createIndex({ userId: 1, dateLocal: -1 }),
    workouts.createIndex({ userId: 1, createdAt: -1 }),
    templates.createIndex({ userId: 1, updatedAt: -1 }),
    userExercises.createIndex({ userId: 1, key: 1 }, { unique: true }),
    userStats.createIndex({ userId: 1 }, { unique: true })
  ]);
}

function sanitizeExerciseName(name) {
  const n = String(name ?? "").trim();
  assertSafeStrings([n]);
  return n;
}

export async function loadExerciseCatalog(userId) {
  const db = await getDb();
  const col = db.collection("userExercises");
  await col.createIndex({ userId: 1, key: 1 }, { unique: true });

  const customDocs = await col.find({ userId: String(userId) }).sort({ name: 1 }).toArray();
  const custom = customDocs.map((doc) => ({
    _id: String(doc._id),
    key: doc.key,
    name: doc.name,
    muscleGroup: doc.muscleGroup || "",
    equipment: doc.equipment || "",
    isBodyweight: Boolean(doc.isBodyweight)
  }));

  const map = new Map();
  for (const ex of BUILT_IN_EXERCISES) {
    map.set(ex.key, { ...ex, source: "builtIn" });
  }
  for (const ex of custom) {
    map.set(ex.key, { ...ex, source: "custom" });
  }

  return {
    builtIn: BUILT_IN_EXERCISES,
    custom,
    all: [...BUILT_IN_EXERCISES, ...custom],
    map
  };
}

export function normalizeExercises(exercises, exerciseMap) {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new Error("at least one exercise required");
  }
  if (exercises.length > 30) throw new Error("too many exercises");

  return exercises.map((ex) => {
    const key = String(ex?.exerciseKey ?? ex?.key ?? "").trim();
    if (!key) throw new Error("exercise key required");

    const ref = exerciseMap.get(key);
    if (!ref) throw new Error("unknown exercise");

    const setsInput = Array.isArray(ex?.sets) ? ex.sets : [];
    if (setsInput.length === 0) throw new Error("at least one set required");
    if (setsInput.length > 30) throw new Error("too many sets");

    const sets = setsInput.map((s) => {
      const reps = Number(s?.reps);
      const weight = Number(s?.weight ?? 0);
      const rpeRaw = s?.rpe === "" || s?.rpe === null || s?.rpe === undefined ? null : Number(s?.rpe);
      const isWarmup = Boolean(s?.isWarmup);

      if (!Number.isFinite(reps) || reps < 1 || reps > 50) throw new Error("invalid reps");
      if (!Number.isFinite(weight) || weight < 0 || weight > 500) throw new Error("invalid weight");
      if (rpeRaw !== null && (!Number.isFinite(rpeRaw) || rpeRaw < 1 || rpeRaw > 10)) {
        throw new Error("invalid rpe");
      }

      return {
        reps: Math.round(reps),
        weight: Math.round(weight * 100) / 100,
        rpe: rpeRaw === null ? null : Math.round(rpeRaw * 10) / 10,
        isWarmup
      };
    });

    return {
      exerciseKey: key,
      name: sanitizeExerciseName(ref.name || ex?.name),
      sets
    };
  });
}

export async function resolveBuddy(userId, buddyUserId, usersCol, meDoc) {
  if (!buddyUserId) return { buddyUserId: null, buddyName: "" };

  const me = meDoc ?? (await usersCol.findOne({ _id: toObjectIdOrNull(userId) ?? userId }, { projection: { friends: 1 } }));
  if (!me) throw new Error("user not found");

  const friends = Array.isArray(me.friends) ? me.friends.map(String) : [];
  const buddyIdStr = String(buddyUserId).trim();
  if (!friends.includes(buddyIdStr)) throw new Error("buddy must be a friend");

  const buddy = await usersCol.findOne(
    { _id: toObjectIdOrNull(buddyIdStr) ?? buddyIdStr },
    { projection: { profile: 1, name: 1, email: 1 } }
  );
  if (!buddy) throw new Error("buddy not found");

  const buddyName =
    String(buddy?.profile?.name ?? buddy?.name ?? buddy?.email ?? "").trim();
  if (buddyName) {
    assertSafeStrings([buddyName]);
  }

  return { buddyUserId: String(buddy._id), buddyName };
}

export function mapWorkoutDoc(doc) {
  if (!doc) return null;
  return {
    _id: String(doc._id),
    userId: doc.userId,
    date: doc.date,
    dateLocal: doc.dateLocal || (doc.date ? String(doc.date).slice(0, 10) : ""),
    seasonId: doc.seasonId || "",
    durationMinutes: doc.durationMinutes,
    notes: doc.notes || "",
    location: doc.location || "gym",
    buddyUserId: doc.buddyUserId ?? null,
    buddyName: doc.buddyName || "",
    withBuddy: Boolean(doc.buddyUserId),
    exercises: Array.isArray(doc.exercises) ? doc.exercises : [],
    prEvents: Array.isArray(doc.prEvents) ? doc.prEvents : [],
    totalVolume: Number(doc.totalVolume ?? 0),
    xpAwarded: Number(doc.xpAwarded ?? doc.xpGain ?? 0),
    xpBreakdown: doc.xpBreakdown || null,
    xpGain: Number(doc.xpAwarded ?? doc.xpGain ?? 0),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

function toUtcDateFromLocal(local) {
  const match = String(local ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function daysDiff(a, b) {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function isPreviousDay(prevDayLocal, currentDayLocal) {
  const prev = toUtcDateFromLocal(prevDayLocal);
  const cur = toUtcDateFromLocal(currentDayLocal);
  if (!prev || !cur) return false;
  return daysDiff(prev, cur) === 1;
}

function computeSetCount(exercises) {
  return (exercises || []).reduce((sum, ex) => sum + (Array.isArray(ex.sets) ? ex.sets.length : 0), 0);
}

function computeWorkoutMetrics(workout, bestSoFar) {
  let totalVolume = 0;
  const prEvents = [];
  const bestMap = new Map(Object.entries(bestSoFar || {}));

  for (const ex of workout.exercises || []) {
    const exKey = String(ex.exerciseKey || ex.key || "").trim();
    const exName = ex.name || ex.exerciseKey || "Exercise";
    if (!exKey) continue;
    for (const set of ex.sets || []) {
      const weight = Number(set?.weight ?? 0);
      const reps = Number(set?.reps ?? 0);
      if (Number.isFinite(weight) && Number.isFinite(reps)) {
        totalVolume += Math.max(0, weight) * Math.max(0, reps);
      }
      const prev = bestMap.get(exKey) ?? 0;
      if (weight > prev && prEvents.length < 2) {
        prEvents.push({ exerciseKey: exKey, name: exName, weight });
      }
      if (weight > (bestMap.get(exKey) ?? 0)) {
        bestMap.set(exKey, weight);
      }
    }
  }

  const merged = { ...bestSoFar };
  for (const [k, v] of bestMap.entries()) {
    merged[k] = Math.max(v, bestSoFar?.[k] ?? 0);
  }

  return { totalVolume, prEvents, bestWeightByExerciseKey: merged };
}

export async function countAwardingWorkouts(userId, dateLocal, excludeId) {
  const db = await getDb();
  const workoutsCol = db.collection("workouts");
  const query = { userId: String(userId), dateLocal: String(dateLocal) };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const awardingFilter = {
    $or: [
      { xpAwarded: { $gt: 0 } },
      { xpAwarded: { $exists: false }, xpGain: { $gt: 0 } }
    ]
  };
  const count = await workoutsCol.countDocuments({ ...query, ...awardingFilter });
  return count;
}

export async function computeStreakInfo(userId, excludeId) {
  const db = await getDb();
  const workoutsCol = db.collection("workouts");
  const query = { userId: String(userId) };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const cursor = workoutsCol
    .find(query, { projection: { dateLocal: 1, date: 1 } })
    .sort({ dateLocal: -1, date: -1, createdAt: -1 })
    .limit(60);

  let streakDays = 0;
  let lastWorkoutDateLocal = "";
  let prevDay = "";

  for await (const doc of cursor) {
    const day = doc.dateLocal || (doc.date ? String(doc.date).slice(0, 10) : "");
    if (!day) continue;
    if (!lastWorkoutDateLocal) {
      lastWorkoutDateLocal = day;
      prevDay = day;
      streakDays = 1;
      continue;
    }
    if (day === prevDay) continue;
    if (isPreviousDay(day, prevDay)) {
      streakDays += 1;
      prevDay = day;
    } else {
      break;
    }
  }

  return { streakDays, lastWorkoutDateLocal };
}

function computeXpBreakdown({ exercises, durationMinutes, withBuddy, prEvents, dailyAwardedCount, streakDaysBefore, lastWorkoutDateLocal, dateLocal }) {
  const setBonus = computeSetCount(exercises) * 5;
  const durationBonus = Math.min(Math.max(Number(durationMinutes) || 0, 0), 60);
  const buddyBonus = withBuddy ? 30 : 0;

  let streakDays = 1;
  if (lastWorkoutDateLocal) {
    if (dateLocal === lastWorkoutDateLocal) {
      streakDays = streakDaysBefore || 1;
    } else if (isPreviousDay(lastWorkoutDateLocal, dateLocal)) {
      streakDays = (streakDaysBefore || 0) + 1;
    } else {
      streakDays = 1;
    }
  }
  const streakBonus = streakDays >= 8 ? 20 : streakDays >= 2 ? 10 : 0;

  const prBonus = 50 * Math.min(Array.isArray(prEvents) ? prEvents.length : 0, 2);
  const base = 100;

  const xpRaw = base + setBonus + durationBonus + buddyBonus + streakBonus + prBonus;
  const xpCapped = Math.min(xpRaw, 300);
  const dailyCapApplied = dailyAwardedCount >= 2;
  const xpAwarded = dailyCapApplied ? 0 : xpCapped;

  return {
    xpAwarded,
    streakDaysAfter: streakDays,
    breakdown: {
      base,
      setBonus,
      durationBonus,
      buddyBonus,
      streakBonus,
      prBonus,
      xpRaw,
      xpCapped,
      xpAwarded,
      dailyCapApplied
    }
  };
}

export async function recomputeUserStats(userId) {
  const db = await getDb();
  await ensureWorkoutIndexes(db);
  const workoutsCol = db.collection("workouts");
  const statsCol = db.collection("userStats");

  const cursor = workoutsCol.find({ userId: String(userId) }).sort({ date: 1, dateLocal: 1, createdAt: 1 });
  let bestWeightByExerciseKey = {};
  const bulk = [];
  let totalVolumeLifetime = 0;
  let totalWorkouts = 0;
  let prTotal = 0;
  let buddyWorkouts = 0;
  const activeWeeks = new Set();
  const weekId = (dateLocal) => {
    const dt = toUtcDateFromLocal(dateLocal);
    if (!dt) return "";
    const tmp = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
    return `${tmp.getUTCFullYear()}-W${weekNo}`;
  };

  for await (const workout of cursor) {
    totalWorkouts += 1;
    const { totalVolume, prEvents, bestWeightByExerciseKey: bestUpdated } = computeWorkoutMetrics(workout, bestWeightByExerciseKey);
    totalVolumeLifetime += totalVolume;
    bestWeightByExerciseKey = bestUpdated;
    prTotal += Array.isArray(prEvents) ? prEvents.length : 0;
    if (workout?.buddyUserId) buddyWorkouts += 1;
    const wk = weekId(workout.dateLocal || (workout.date ? String(workout.date).slice(0, 10) : ""));
    if (wk) activeWeeks.add(wk);

    bulk.push({
      updateOne: {
        filter: { _id: workout._id },
        update: { $set: { prEvents, totalVolume } }
      }
    });
  }

  if (bulk.length) {
    await workoutsCol.bulkWrite(bulk, { ordered: false });
  }

  const streakInfo = await computeStreakInfo(userId);

  await statsCol.updateOne(
    { userId: String(userId) },
    {
      $set: {
        userId: String(userId),
        totalWorkouts,
        totalVolumeLifetime,
        bestWeightByExerciseKey,
        prTotal,
        buddyWorkouts,
        weeksActiveCount: activeWeeks.size,
        streakDays: streakInfo.streakDays || 0,
        lastWorkoutDateLocal: streakInfo.lastWorkoutDateLocal || "",
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );

  return {
    totalWorkouts,
    totalVolumeLifetime,
    bestWeightByExerciseKey,
    prTotal,
    buddyWorkouts,
    weeksActiveCount: activeWeeks.size,
    streakDays: streakInfo.streakDays || 0,
    lastWorkoutDateLocal: streakInfo.lastWorkoutDateLocal || ""
  };
}

export async function getWeeklyStats(userId) {
  const db = await getDb();
  const workoutsCol = db.collection("workouts");
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6));
  const startIso = start.toISOString();

  const cursor = workoutsCol.find({ userId: String(userId), date: { $gte: startIso } });
  let workoutsThisWeek = 0;
  let totalVolumeThisWeek = 0;

  for await (const workout of cursor) {
    workoutsThisWeek += 1;
    totalVolumeThisWeek += Number(workout.totalVolume ?? 0);
  }

  return { workoutsThisWeek, totalVolumeThisWeek };
}

export async function getExerciseStats(userId, exerciseKey) {
  const db = await getDb();
  const workoutsCol = db.collection("workouts");
  const statsCol = db.collection("userStats");

  const stats = await statsCol.findOne({ userId: String(userId) });
  const bestWeight = stats?.bestWeightByExerciseKey?.[exerciseKey] ?? 0;

  const cursor = workoutsCol
    .find({ userId: String(userId), "exercises.exerciseKey": exerciseKey })
    .sort({ date: -1, createdAt: -1 })
    .limit(10);

  const recentSets = [];
  for await (const workout of cursor) {
    for (const ex of workout.exercises || []) {
      if ((ex.exerciseKey || ex.key) !== exerciseKey) continue;
      for (const set of ex.sets || []) {
        recentSets.push({
          date: workout.dateLocal || (workout.date ? String(workout.date).slice(0, 10) : ""),
          reps: Number(set?.reps ?? 0),
          weight: Number(set?.weight ?? 0),
          rpe: set?.rpe ?? null,
          isWarmup: Boolean(set?.isWarmup)
        });
      }
    }
    if (recentSets.length >= 20) break;
  }

  return { bestWeight, recentSets };
}

export { computeWorkoutMetrics, computeXpBreakdown };
