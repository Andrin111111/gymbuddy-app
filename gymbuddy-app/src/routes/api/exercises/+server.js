import { json } from "@sveltejs/kit";
import { loadExerciseCatalog } from "$lib/server/workouts.js";

export async function GET({ locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const catalog = await loadExerciseCatalog(locals.userId);

  return json({
    builtIn: catalog.builtIn,
    custom: catalog.custom,
    all: catalog.all
  });
}
