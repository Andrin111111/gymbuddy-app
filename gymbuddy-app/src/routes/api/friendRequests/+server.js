import { json } from "@sveltejs/kit";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { getDb } from "$lib/server/mongo.js";
import { assertSafeStrings } from "$lib/server/validation.js";

const sendSchema = z.object({
  toUserId: z.string().trim().min(1)
});

function toObjectIdOrNull(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

async function ensureIndexes(db) {
  const col = db.collection("friendRequests");
  await col.createIndex({ fromUserId: 1, toUserId: 1, status: 1 });
}

export async function GET({ locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const userId = String(locals.userId);
  const db = await getDb();
  const col = db.collection("friendRequests");
  const users = db.collection("users");
  await ensureIndexes(db);

  const incoming = await col
    .find({ toUserId: userId, status: "pending" })
    .sort({ createdAt: -1 })
    .toArray();
  const outgoing = await col
    .find({ fromUserId: userId, status: "pending" })
    .sort({ createdAt: -1 })
    .toArray();

  const userIds = [
    ...incoming.map((r) => r.fromUserId),
    ...outgoing.map((r) => r.toUserId)
  ].map((id) => toObjectIdOrNull(id) ?? id);

  const usersMap = new Map(
    (
      await users
        .find(
          { _id: { $in: userIds } },
          { projection: { profile: 1, name: 1, email: 1, buddyCode: 1 } }
        )
        .toArray()
    ).map((u) => [String(u._id), u])
  );

  const mapUser = (id) => {
    const u = usersMap.get(String(id));
    if (!u) return { _id: String(id) };
    const p = u?.profile ?? {};
    return {
      _id: String(u._id),
      name: String(p.name ?? u.name ?? u.email ?? "").trim(),
      buddyCode: u.buddyCode ?? "",
      visibility: p.visibility || "friends"
    };
  };

  return json({
    incoming: incoming.map((r) => ({
      _id: String(r._id),
      fromUserId: r.fromUserId,
      toUserId: r.toUserId,
      createdAt: r.createdAt,
      user: mapUser(r.fromUserId)
    })),
    outgoing: outgoing.map((r) => ({
      _id: String(r._id),
      fromUserId: r.fromUserId,
      toUserId: r.toUserId,
      createdAt: r.createdAt,
      user: mapUser(r.toUserId)
    }))
  });
}

export async function POST({ locals, request }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid json" }, { status: 400 });
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid toUserId" }, { status: 400 });

  const userId = String(locals.userId);
  const toUserId = String(parsed.data.toUserId).trim();
  if (userId === toUserId) return json({ error: "cannot add yourself" }, { status: 400 });
  try {
    assertSafeStrings([toUserId]);
  } catch {
    return json({ error: "invalid id" }, { status: 400 });
  }

  const db = await getDb();
  const col = db.collection("friendRequests");
  const users = db.collection("users");
  const blocks = db.collection("blocks");
  await ensureIndexes(db);

  const toUser = await users.findOne(
    { _id: toObjectIdOrNull(toUserId) ?? toUserId },
    { projection: { friends: 1, profile: 1 } }
  );
  if (!toUser) return json({ error: "target not found" }, { status: 404 });

  const alreadyBlocked =
    (await blocks.findOne({ userId, targetUserId: toUserId })) ||
    (await blocks.findOne({ userId: toUserId, targetUserId: userId }));
  if (alreadyBlocked) return json({ error: "interaction not allowed" }, { status: 400 });

  const friendList = Array.isArray(toUser.friends) ? toUser.friends.map(String) : [];
  if (friendList.includes(userId)) return json({ error: "already friends" }, { status: 400 });

  const pendingOut = await col.countDocuments({ fromUserId: userId, status: "pending" });
  const pendingIn = await col.countDocuments({ toUserId: toUserId, status: "pending" });
  if (pendingOut >= 30) return json({ error: "pending limit reached" }, { status: 429 });
  if (pendingIn >= 50) return json({ error: "target pending limit reached" }, { status: 429 });

  const existing = await col.findOne({
    fromUserId: userId,
    toUserId,
    status: { $in: ["pending", "accepted"] }
  });
  if (existing && existing.status === "pending") {
    return json({ error: "already pending" }, { status: 400 });
  }
  const incomingExisting = await col.findOne({
    fromUserId: toUserId,
    toUserId: userId,
    status: "pending"
  });
  if (incomingExisting) {
    return json({ error: "incoming request exists" }, { status: 400 });
  }
  const recentDecline = await col.findOne({
    fromUserId: userId,
    toUserId,
    status: "declined",
    updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  });
  if (recentDecline) return json({ error: "cooldown active" }, { status: 429 });

  const now = new Date();
  const doc = {
    fromUserId: userId,
    toUserId,
    status: "pending",
    createdAt: now,
    updatedAt: now
  };
  const res = await col.insertOne(doc);

  // maintain legacy arrays
  await users.updateOne({ _id: toObjectIdOrNull(toUserId) ?? toUserId }, { $addToSet: { friendRequestsIn: userId } });
  await users.updateOne({ _id: toObjectIdOrNull(userId) ?? userId }, { $addToSet: { friendRequestsOut: toUserId } });

  // notification to target
  try {
    const { createNotification } = await import("$lib/server/notifications.js");
    await createNotification(toUserId, "friend_request_received", { fromUserId: userId });
  } catch {
    // ignore notification errors
  }

  return json({ ok: true, requestId: String(res.insertedId) });
}
