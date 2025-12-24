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
  if (!userId) return json({ error: "missing userId" }, { status: 400 });

  const oid = toObjectIdOrNull(userId);
  if (!oid) return json({ error: "invalid userId" }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");
  const trainings = db.collection("trainings");

  await trainings.deleteMany({ userId });

  await users.updateMany(
    {},
    {
      $pull: {
        friends: userId,
        friendRequestsIn: userId,
        friendRequestsOut: userId
      }
    }
  );

  const del = await users.deleteOne({ _id: oid });
  if (del.deletedCount === 0) {
    return json({ error: "user not found" }, { status: 404 });
  }

  return json({ ok: true });
}
