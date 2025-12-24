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

  const uOid = toObjectIdOrNull(userId);
  const tOid = toObjectIdOrNull(targetId);
  if (!uOid || !tOid) return json({ error: "invalid ids" }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");

  await users.updateOne(
    { _id: uOid },
    { $pull: { friendRequestsOut: targetId } }
  );

  await users.updateOne(
    { _id: tOid },
    { $pull: { friendRequestsIn: userId } }
  );

  return json({ ok: true });
}
