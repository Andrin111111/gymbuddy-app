import { json } from "@sveltejs/kit";
import { getAchievementsCatalog, seedAchievementsCatalog } from "$lib/server/achievements.js";

export async function GET({ locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  await seedAchievementsCatalog();
  const catalog = await getAchievementsCatalog();

  return json({ catalog });
}
