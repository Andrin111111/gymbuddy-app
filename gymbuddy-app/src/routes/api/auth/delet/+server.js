// src/routes/api/auth/delete/+server.js
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo.js";
import { ObjectId } from "mongodb";

export async function POST({ request }) {
  const { userId } = await request.json();
  if (!userId) {
    return json({ error: "userId fehlt." }, { status: 400 });
  }

  const db = await getDb();
  const users = db.collection("users");
  const friendships = db.collection("friendships");

  const _id = new ObjectId(userId);

  await users.deleteOne({ _id });

  await friendships.deleteMany({
    $or: [{ userId1: _id }, { userId2: _id }]
  });

  return json({ success: true });
}
