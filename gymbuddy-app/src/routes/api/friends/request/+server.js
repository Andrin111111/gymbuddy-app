import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { getDb } from "$lib/server/mongo.js";

function toObjectIdOrNull(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function POST({ request }) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid json" }, { status: 400 });

  const userId = String(body.userId ?? "").trim();
  const targetId = String(body.targetId ?? "").trim();

  if (!userId || !targetId) return json({ error: "missing ids" }, { status: 400 });
  if (userId === targetId) return json({ error: "cannot request yourself" }, { status: 400 });

  const uOid = toObjectIdOrNull(userId);
  const tOid = toObjectIdOrNull(targetId);
  if (!uOid || !tOid) return json({ error: "invalid ids" }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");

  const me = await users.findOne({ _id: uOid }, { projection: { friends: 1 } });
  const other = await users.findOne({ _id: tOid }, { projection: { friends: 1 } });

  if (!me || !other) return json({ error: "user not found" }, { status: 404 });

  const meFriends = Array.isArray(me.friends) ? me.friends : [];
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
