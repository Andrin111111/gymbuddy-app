import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo.js";
import { getRankFromXp, currentSeasonId, recomputeSeasonXp } from "$lib/server/ranks.js";
import { RANK_ICONS } from "$lib/ranks.config.js";
import { toObjectIdOrNull } from "$lib/server/objectId.js";

export async function GET({ locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const db = await getDb();
  const usersCol = db.collection("users");

  const id = toObjectIdOrNull(locals.userId) ?? String(locals.userId);

  const user = await usersCol.findOne(
    { _id: id },
    { projection: { xp: 1, lifetimeXp: 1, seasonXp: 1, name: 1, profile: 1, buddyCode: 1 } }
  );
  if (!user) return json({ error: "user not found" }, { status: 404 });

  const lifetimeXp = Number(user?.lifetimeXp ?? user?.xp ?? 0);
  const seasonXp = Number(user?.seasonXp ?? 0);
  const seasonId = currentSeasonId();

  await recomputeSeasonXp(locals.userId);

  const rank = getRankFromXp(lifetimeXp);

  return json({
    userId: String(locals.userId),
    lifetimeXp,
    seasonXp,
    seasonId,
    rank: {
      ...rank,
      icon: RANK_ICONS[rank.key] ?? RANK_ICONS.apex,
      starsIcon: RANK_ICONS.apex_star
    }
  });
}
