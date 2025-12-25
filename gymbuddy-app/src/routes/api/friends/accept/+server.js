import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "$lib/server/mongo.js";

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

  return json({ ok: true });
}
