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
  const fromId = String(body.fromId ?? "").trim();

  if (!userId || !fromId) return json({ error: "missing ids" }, { status: 400 });

  const uOid = toObjectIdOrNull(userId);
  const fOid = toObjectIdOrNull(fromId);
  if (!uOid || !fOid) return json({ error: "invalid ids" }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");

  await users.updateOne(
    { _id: uOid },
    { $pull: { friendRequestsIn: fromId } }
  );

  await users.updateOne(
    { _id: fOid },
    { $pull: { friendRequestsOut: userId } }
  );

  return json({ ok: true });
}
