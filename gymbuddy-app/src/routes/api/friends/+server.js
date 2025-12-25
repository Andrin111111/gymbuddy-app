import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo.js";
import { ObjectId } from "mongodb";

function toObjectIdOrNull(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function GET({ locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const db = await getDb();
  const users = db.collection("users");
  const meIdStr = String(locals.userId);
  const meId = toObjectIdOrNull(meIdStr) ?? meIdStr;

  const me = await users.findOne(
    { _id: meId },
    { projection: { friends: 1 } }
  );
  const friendIds = Array.isArray(me?.friends) ? me.friends.map(String) : [];
  if (friendIds.length === 0) return json({ friends: [] });

  const friends = await users
    .find(
      { _id: { $in: friendIds.map((id) => toObjectIdOrNull(id) ?? id) } },
      { projection: { profile: 1, name: 1, email: 1, buddyCode: 1 } }
    )
    .toArray();

  const mapped = friends.map((u) => {
    const p = u?.profile ?? {};
    return {
      _id: String(u._id),
      name: String(p.name ?? u.name ?? u.email ?? "").trim(),
      buddyCode: u?.buddyCode ?? "",
      gym: p.gym ?? "",
      trainingLevel: p.trainingLevel ?? "",
      visibility: p.visibility || "friends"
    };
  });

  return json({ friends: mapped });
}
