// src/routes/api/friends/accept/+server.js
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

  const currentUserId = body?.currentUserId ?? body?.userId ?? "";
  const otherUserId = body?.otherUserId ?? body?.fromId ?? "";

  if (!currentUserId || !otherUserId) {
    return json({ error: "invalid ids" }, { status: 400 });
  }

  const curObj = toObjectId(currentUserId);
  const otherObj = toObjectId(otherUserId);
  if (!curObj || !otherObj) return json({ error: "invalid ids" }, { status: 400 });

  const curStr = curObj.toString();
  const otherStr = otherObj.toString();

  const db = await getDb();
  const users = db.collection("users");

  await Promise.all([
    users.updateOne(
      { _id: curObj },
      {
        $pull: { friendRequestsIn: otherStr, friendRequestsOut: otherStr },
        $addToSet: { friends: otherStr }
      }
    ),
    users.updateOne(
      { _id: otherObj },
      {
        $pull: { friendRequestsOut: curStr, friendRequestsIn: curStr },
        $addToSet: { friends: curStr }
      }
    )
  ]);

  return json({ ok: true });
}

