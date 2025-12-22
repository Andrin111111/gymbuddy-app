// src/routes/api/friends/cancel/+server.js
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

  if (!fromUserId || !toUserId) {
    return json({ error: "invalid ids" }, { status: 400 });
  }

  const fromObj = toObjectId(fromUserId);
  const toObj = toObjectId(toUserId);
  if (!fromObj || !toObj) return json({ error: "invalid ids" }, { status: 400 });

  const fromStr = fromObj.toString();
  const toStr = toObj.toString();

  const db = await getDb();
  const users = db.collection("users");

  await Promise.all([
    users.updateOne({ _id: fromObj }, { $pull: { friendRequestsOut: toStr } }),
    users.updateOne({ _id: toObj }, { $pull: { friendRequestsIn: fromStr } })
  ]);

  return json({ ok: true });
}
