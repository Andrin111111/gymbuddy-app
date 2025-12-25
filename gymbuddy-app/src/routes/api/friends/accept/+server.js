import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "$lib/server/mongo.js";
import { recomputeUserStats } from "$lib/server/workouts.js";
import { unlockFromStats } from "$lib/server/achievements.js";
import { createNotification } from "$lib/server/notifications.js";

const schema = z.object({
  fromUserId: z.string().trim().min(1)
});

function toObjectIdOrNull(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function POST({ request, locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid json" }, { status: 400 });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid fromUserId" }, { status: 400 });

  const userId = String(locals.userId ?? "").trim();
  const fromId = String(parsed.data.fromUserId).trim();

  if (!userId || !fromId) return json({ error: "missing ids" }, { status: 400 });

  const uOid = toObjectIdOrNull(userId);
  const fOid = toObjectIdOrNull(fromId);
  if (!uOid || !fOid) return json({ error: "invalid ids" }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");

  await users.updateOne(
    { _id: uOid },
    {
      $pull: { friendRequestsIn: fromId },
      $addToSet: { friends: fromId }
    }
  );

  await users.updateOne(
    { _id: fOid },
    {
      $pull: { friendRequestsOut: userId },
      $addToSet: { friends: userId }
    }
  );

  const [meAfter, fromAfter] = await Promise.all([
    users.findOne({ _id: uOid }, { projection: { friends: 1 } }),
    users.findOne({ _id: fOid }, { projection: { friends: 1 } })
  ]);

  const [statsMe, statsFrom] = await Promise.all([
    recomputeUserStats(userId),
    recomputeUserStats(fromId)
  ]);

  const unlockedMe = await unlockFromStats(userId, statsMe, Array.isArray(meAfter?.friends) ? meAfter.friends.length : 0);
  const unlockedFrom = await unlockFromStats(fromId, statsFrom, Array.isArray(fromAfter?.friends) ? fromAfter.friends.length : 0);

  if (unlockedMe && unlockedMe.length) {
    for (const key of unlockedMe) {
      await createNotification(userId, "achievement_unlocked", { key });
    }
  }
  if (unlockedFrom && unlockedFrom.length) {
    for (const key of unlockedFrom) {
      await createNotification(fromId, "achievement_unlocked", { key });
    }
  }

  return json({ ok: true });
}
