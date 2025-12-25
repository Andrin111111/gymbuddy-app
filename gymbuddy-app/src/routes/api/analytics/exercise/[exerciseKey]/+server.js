import { json } from "@sveltejs/kit";
import { getExerciseStats, recomputeUserStats } from "$lib/server/workouts.js";
import { assertSafeStrings } from "$lib/server/validation.js";

export async function GET({ locals, params }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const exerciseKey = String(params.exerciseKey ?? "").trim();
  if (!exerciseKey) return json({ error: "invalid exerciseKey" }, { status: 400 });
  try {
    assertSafeStrings([exerciseKey]);
  } catch {
    return json({ error: "invalid exerciseKey" }, { status: 400 });
  }

  await recomputeUserStats(locals.userId);
  const stats = await getExerciseStats(locals.userId, exerciseKey);

  return json({
    exerciseKey,
    bestWeight: stats.bestWeight,
    recentSets: stats.recentSets
  });
}
