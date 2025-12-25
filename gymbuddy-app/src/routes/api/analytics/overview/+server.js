import { json } from "@sveltejs/kit";
import { getWeeklyStats, recomputeUserStats } from "$lib/server/workouts.js";

export async function GET({ locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const userId = String(locals.userId);

  const stats = await recomputeUserStats(userId);
  const weekly = await getWeeklyStats(userId);

  const bestLifts = Object.entries(stats.bestWeightByExerciseKey || {})
    .map(([exerciseKey, weight]) => ({ exerciseKey, weight }))
    .sort((a, b) => Number(b.weight) - Number(a.weight))
    .slice(0, 5);

  return json({
    workoutsThisWeek: weekly.workoutsThisWeek,
    totalVolumeThisWeek: weekly.totalVolumeThisWeek,
    bestLifts
  });
}
