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

export async function GET({ locals }) {
  if (!locals.userId) {
    return json({ error: "unauthorized" }, { status: 401 });
  }

  const oid = toObjectIdOrNull(locals.userId);
  const db = await getDb();
  const users = db.collection("users");

  const user = oid
    ? await users.findOne({ _id: oid }, { projection: { email: 1, buddyCode: 1 } })
    : await users.findOne({ _id: locals.userId }, { projection: { email: 1, buddyCode: 1 } });

  if (!user) {
    return json({ userId: null, email: null, buddyCode: null });
  }

  return json({
    userId: String(user._id),
    email: user.email ?? null,
    buddyCode: user.buddyCode ?? null
  });
}
