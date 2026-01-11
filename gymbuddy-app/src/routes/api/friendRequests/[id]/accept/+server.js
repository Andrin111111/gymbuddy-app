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

export async function POST({ locals, params }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const reqId = params.id;
  const oid = toObjectIdOrNull(reqId);
  if (!oid) return json({ error: "invalid id" }, { status: 400 });

  const db = await getDb();
  const col = db.collection("friendRequests");
  const users = db.collection("users");

  const request = await col.findOne({ _id: oid });
  const toId = String(request?.toUserId ?? "");
  const fromId = String(request?.fromUserId ?? "");
  if (!request || toId !== String(locals.userId) || request.status !== "pending") {
    return json({ error: "not found" }, { status: 404 });
  }

  const now = new Date();
  await col.updateOne({ _id: oid }, { $set: { status: "accepted", updatedAt: now } });

  await Promise.all([
    users.updateOne({ _id: toObjectIdOrNull(fromId) ?? fromId }, { $addToSet: { friends: toId }, $pull: { friendRequestsOut: toId } }),
    users.updateOne({ _id: toObjectIdOrNull(toId) ?? toId }, { $addToSet: { friends: fromId }, $pull: { friendRequestsIn: fromId } })
  ]);

  try {
    const { createNotification } = await import("$lib/server/notifications.js");
    await createNotification(fromId, "friend_request_accepted", { byUserId: toId });
  } catch {
    // ignore notification errors
  }

  return json({ ok: true });
}
