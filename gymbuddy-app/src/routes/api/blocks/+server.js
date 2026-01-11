import { json } from "@sveltejs/kit";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { getDb } from "$lib/server/mongo.js";

const blockSchema = z.object({
  targetUserId: z.string().trim().min(1),
  action: z.enum(["block", "unblock"]).optional()
});

function toObjectIdOrNull(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

async function ensureIndexes(db) {
  const col = db.collection("blocks");
  await col.createIndex({ userId: 1, targetUserId: 1 }, { unique: true });
}

export async function GET({ locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const db = await getDb();
  const col = db.collection("blocks");
  const users = db.collection("users");
  await ensureIndexes(db);

  const blocks = await col.find({ userId: String(locals.userId) }).toArray();
  const ids = blocks.map((b) => toObjectIdOrNull(b.targetUserId) ?? b.targetUserId);

  const userDocs = await users
    .find({ _id: { $in: ids } }, { projection: { profile: 1, name: 1, email: 1, buddyCode: 1 } })
    .toArray();
  const map = new Map(userDocs.map((u) => [String(u._id), u]));

  const list = blocks.map((b) => {
    const u = map.get(b.targetUserId);
    const p = u?.profile ?? {};
    return {
      _id: b.targetUserId,
      name: String(p.name ?? u?.name ?? u?.email ?? "").trim(),
      buddyCode: u?.buddyCode ?? "",
      createdAt: b.createdAt
    };
  });

  return json({ blocks: list });
}

export async function POST({ locals, request }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid json" }, { status: 400 });
  const parsed = blockSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid data" }, { status: 400 });

  const { targetUserId } = parsed.data;
  const action = parsed.data.action || "block";
  if (targetUserId === String(locals.userId)) return json({ error: "cannot block yourself" }, { status: 400 });

  const db = await getDb();
  const col = db.collection("blocks");
  const users = db.collection("users");
  const reqCol = db.collection("friendRequests");
  await ensureIndexes(db);

  const targetExists = await users.findOne({ _id: toObjectIdOrNull(targetUserId) ?? targetUserId });
  if (!targetExists) return json({ error: "target not found" }, { status: 404 });

  if (action === "unblock") {
    await col.deleteOne({ userId: String(locals.userId), targetUserId: String(targetUserId) });
    return json({ ok: true });
  }

  const count = await col.countDocuments({ userId: String(locals.userId) });
  if (count >= 500) return json({ error: "block limit reached" }, { status: 429 });

  const now = new Date();
  await col.updateOne(
    { userId: String(locals.userId), targetUserId: String(targetUserId) },
    { $set: { userId: String(locals.userId), targetUserId: String(targetUserId), createdAt: now } },
    { upsert: true }
  );

  // Freundschaften und offene Anfragen zwischen beiden entfernen
  await users.updateOne(
    { _id: toObjectIdOrNull(locals.userId) ?? locals.userId },
    {
      $pull: {
        friends: String(targetUserId),
        friendRequestsIn: String(targetUserId),
        friendRequestsOut: String(targetUserId)
      }
    }
  );
  await users.updateOne(
    { _id: toObjectIdOrNull(targetUserId) ?? targetUserId },
    {
      $pull: {
        friends: String(locals.userId),
        friendRequestsIn: String(locals.userId),
        friendRequestsOut: String(locals.userId)
      }
    }
  );
  await reqCol.updateMany(
    {
      status: "pending",
      $or: [
        { fromUserId: String(locals.userId), toUserId: String(targetUserId) },
        { fromUserId: String(targetUserId), toUserId: String(locals.userId) }
      ]
    },
    { $set: { status: "cancelled", updatedAt: now } }
  );

  return json({ ok: true });
}
