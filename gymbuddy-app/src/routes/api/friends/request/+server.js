// src/routes/api/friends/request/+server.js
import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { getDb } from "$lib/server/mongo.js";

function toObjectId(id) {
  try {
    return new ObjectId(String(id));
  } catch {
    return null;
  }
}

export async function POST({ request }) {
  const body = await request.json();

  const fromUserId = body?.fromUserId ?? body?.userId ?? body?.currentUserId ?? "";
  const toUserId = body?.toUserId ?? body?.targetId ?? body?.otherUserId ?? "";

  if (!fromUserId || !toUserId || fromUserId === toUserId) {
    return json({ error: "invalid ids" }, { status: 400 });
  }

  const fromObj = toObjectId(fromUserId);
  const toObj = toObjectId(toUserId);
  if (!fromObj || !toObj) return json({ error: "invalid ids" }, { status: 400 });

  const fromStr = fromObj.toString();
  const toStr = toObj.toString();

  const db = await getDb();
  const users = db.collection("users");

  const [me, target] = await Promise.all([
    users.findOne({ _id: fromObj }, { projection: { friends: 1, friendRequestsOut: 1, friendRequestsIn: 1 } }),
    users.findOne({ _id: toObj }, { projection: { friends: 1, friendRequestsOut: 1, friendRequestsIn: 1 } })
  ]);

  if (!me || !target) return json({ error: "user not found" }, { status: 404 });

  const friends = Array.isArray(me.friends) ? me.friends : [];
  const out = Array.isArray(me.friendRequestsOut) ? me.friendRequestsOut : [];
  const inc = Array.isArray(me.friendRequestsIn) ? me.friendRequestsIn : [];

  if (friends.includes(toStr) || out.includes(toStr) || inc.includes(toStr)) {
    return json({ ok: true, status: "unchanged" });
  }

  await Promise.all([
    users.updateOne({ _id: fromObj }, { $addToSet: { friendRequestsOut: toStr } }),
    users.updateOne({ _id: toObj }, { $addToSet: { friendRequestsIn: fromStr } })
  ]);

  return json({ ok: true });
}

