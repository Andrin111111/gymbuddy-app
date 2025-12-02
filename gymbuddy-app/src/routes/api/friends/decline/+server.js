// src/routes/api/friends/decline/+server.js
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo.js";
import { ObjectId } from "mongodb";

export async function POST({ request }) {
  const { currentUserId, otherUserId } = await request.json();

  if (!currentUserId || !otherUserId) {
    return json({ error: "currentUserId oder otherUserId fehlt." }, { status: 400 });
  }

  const current = new ObjectId(currentUserId);
  const other = new ObjectId(otherUserId);

  const db = await getDb();
  const friendships = db.collection("friendships");

  const [userId1, userId2] = [current, other].sort((a, b) =>
    a.toString().localeCompare(b.toString())
  );

  await friendships.deleteOne({ userId1, userId2, status: "pending" });

  return json({ success: true });
}
