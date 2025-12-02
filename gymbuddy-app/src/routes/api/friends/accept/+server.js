// src/routes/api/friends/accept/+server.js
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

  const existing = await friendships.findOne({ userId1, userId2 });
  if (!existing) {
    return json({ error: "Keine Anfrage gefunden." }, { status: 404 });
  }

  if (existing.status === "pending" && !existing.requesterId.equals(current)) {
    await friendships.updateOne(
      { _id: existing._id },
      { $set: { status: "accepted" } }
    );
  }

  return json({ success: true, status: "friends" });
}
