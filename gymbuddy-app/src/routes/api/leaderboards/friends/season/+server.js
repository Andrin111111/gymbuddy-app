import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo.js";
import { getRankFromXp, currentSeasonId, recomputeSeasonXp } from "$lib/server/ranks.js";
import { RANK_ICONS } from "$lib/ranks.config.js";
import { ObjectId } from "mongodb";
import { unlockSeasonRanksForUsers } from "$lib/server/achievements.js";

function toIds(list = []) {
  return Array.from(new Set(list.map((id) => String(id))));
}

function toObjectIdOrNull(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function GET({ locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const db = await getDb();
  const usersCol = db.collection("users");

  const meIdStr = String(locals.userId);
  const meId = toObjectIdOrNull(meIdStr) ?? meIdStr;
  const me = await usersCol.findOne(
    { _id: meId },
    { projection: { friends: 1, name: 1, profile: 1, email: 1, buddyCode: 1, lifetimeXp: 1, xp: 1, seasonXp: 1 } }
  );
  if (!me) {
    return json({
      seasonId: currentSeasonId(),
      users: [],
      warning: "user not found"
    });
  }

  await recomputeSeasonXp(meIdStr);

  const ids = [meIdStr, ...toIds(me.friends || [])];
  const seasonId = currentSeasonId();

  const queryIds = [
    ...ids,
    ...ids
      .map((i) => toObjectIdOrNull(i))
      .filter(Boolean)
      .map((v) => v)
  ];

  const users = await usersCol
    .find(
      { _id: { $in: queryIds } },
      { projection: { name: 1, profile: 1, email: 1, buddyCode: 1, lifetimeXp: 1, xp: 1, seasonXp: 1 } }
    )
    .toArray();

  const leaderboard = users.map((u) => {
    const lifetimeXp = Number(u?.lifetimeXp ?? u?.xp ?? 0);
    const seasonXp = Number(u?.seasonXp ?? 0);
    const rank = getRankFromXp(lifetimeXp);
    const displayName =
      String(u?.profile?.name ?? u?.name ?? u?.email ?? u?.buddyCode ?? "Buddy").trim();

    return {
      userId: String(u._id),
      name: displayName,
      buddyCode: u?.buddyCode ?? "",
      seasonXp,
      lifetimeXp,
      rankKey: rank.key,
      rankName: rank.name,
      rankStars: rank.stars,
      rankIcon: RANK_ICONS[rank.key] ?? RANK_ICONS.apex,
      rankStarIcon: RANK_ICONS.apex_star
    };
  });

  leaderboard.sort((a, b) => Number(b.seasonXp) - Number(a.seasonXp));

  await unlockSeasonRanksForUsers(leaderboard);

  return json({
    seasonId,
    users: leaderboard
  });
}
