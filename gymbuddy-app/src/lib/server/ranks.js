// src/lib/server/ranks.js
import { RANKS } from "$lib/ranks.config.js";
import { getDb } from "./mongo.js";

const APEX_XP = 126000;
const APEX_STAR_STEP = 5000;
const SEASON_WEEKS = 8;

export function getRankFromXp(lifetimeXp) {
  const xp = Math.max(0, Number(lifetimeXp) || 0);
  let current = RANKS[0];
  let next = null;

  for (let i = 0; i < RANKS.length; i++) {
    const rank = RANKS[i];
    if (xp >= rank.xp) {
      current = rank;
      next = RANKS[i + 1] ?? null;
    } else {
      break;
    }
  }

  let stars = 0;
  if (xp >= APEX_XP) {
    stars = Math.max(0, Math.floor((xp - APEX_XP) / APEX_STAR_STEP));
    next = null;
  }

  const progress = next
    ? Math.max(0, Math.min(1, (xp - current.xp) / Math.max(1, next.xp - current.xp)))
    : 1;

  return {
    key: current.key,
    name: current.name,
    threshold: current.xp,
    nextThreshold: next?.xp ?? null,
    nextName: next?.name ?? null,
    progress,
    lifetimeXp: xp,
    stars
  };
}

function isoWeekNumber(date) {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return { year: tmp.getUTCFullYear(), week: weekNo };
}

export function seasonIdForDate(dateInput) {
  const date =
    typeof dateInput === "string" ? new Date(`${dateInput}T00:00:00.000Z`) : new Date(dateInput);
  const { year, week } = isoWeekNumber(date);
  const seasonIndex = Math.floor((week - 1) / SEASON_WEEKS) + 1;
  return `${year}_S${seasonIndex}`;
}

export function currentSeasonId() {
  return seasonIdForDate(new Date());
}

export async function recomputeSeasonXp(userId) {
  const db = await getDb();
  const workoutsCol = db.collection("workouts");
  const usersCol = db.collection("users");
  const seasonId = currentSeasonId();

  const agg = await workoutsCol
    .aggregate([
      { $match: { userId: String(userId), seasonId } },
      {
        $group: {
          _id: null,
          totalXp: { $sum: { $ifNull: ["$xpAwarded", { $ifNull: ["$xpGain", 0] }] } }
        }
      }
    ])
    .toArray();

  const seasonXp = agg[0]?.totalXp ? Number(agg[0].totalXp) : 0;

  const user = await usersCol.findOne({ _id: String(userId) });
  const lifetimeXp = Number(user?.lifetimeXp ?? user?.xp ?? 0);

  await usersCol.updateOne(
    { _id: String(userId) },
    {
      $set: {
        seasonId,
        seasonXp,
        xp: lifetimeXp
      }
    }
  );

  return { seasonId, seasonXp, lifetimeXp };
}
