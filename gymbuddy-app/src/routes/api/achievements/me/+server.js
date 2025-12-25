import { json } from "@sveltejs/kit";
import { getAchievementsForUser } from "$lib/server/achievements.js";

export async function GET({ locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const data = await getAchievementsForUser(String(locals.userId));
  return json(data);
}
