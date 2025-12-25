import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "$lib/server/mongo.js";
import { rateLimit } from "$lib/server/rateLimit.js";

const schema = z.object({
  targetUserId: z.string().trim().min(1)
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
  if (!parsed.success) return json({ error: "invalid targetUserId" }, { status: 400 });

  const userId = String(locals.userId).trim();
  const targetId = String(parsed.data.targetUserId).trim();

  if (userId === targetId) return json({ error: "cannot request yourself" }, { status: 400 });

  const rlKey = `friendreq:user:${userId}`;
  if (!rateLimit(rlKey, 20, 24 * 60 * 60 * 1000)) {
    return json({ error: "Zu viele Anfragen heute." }, { status: 429 });
  }

  const uOid = toObjectIdOrNull(userId);
  const tOid = toObjectIdOrNull(targetId);
  if (!uOid || !tOid) return json({ error: "invalid ids" }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");

  const me = await users.findOne({ _id: uOid }, { projection: { friends: 1 } });
  const other = await users.findOne({ _id: tOid }, { projection: { friends: 1 } });

  if (!me || !other) return json({ error: "user not found" }, { status: 404 });

  const meFriends = Array.isArray(me.friends) ? me.friends.map(String) : [];
  if (meFriends.includes(targetId)) {
    return json({ ok: true, alreadyFriends: true });
  }

  await users.updateOne(
    { _id: uOid },
    { $addToSet: { friendRequestsOut: targetId } }
  );

  await users.updateOne(
    { _id: tOid },
    { $addToSet: { friendRequestsIn: userId } }
  );

  return json({ ok: true });
}
