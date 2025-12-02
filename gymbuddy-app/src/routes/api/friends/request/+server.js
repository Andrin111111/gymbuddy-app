// src/routes/api/friends/request/+server.js
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo.js";
import { ObjectId } from "mongodb";

export async function POST({ request }) {
  const { fromUserId, toUserId } = await request.json();

  if (!fromUserId || !toUserId) {
    return json({ error: "fromUserId oder toUserId fehlt." }, { status: 400 });
  }

  const from = new ObjectId(fromUserId);
  const to = new ObjectId(toUserId);

  if (from.equals(to)) {
    return json({ error: "Man kann sich nicht selbst anfragen." }, { status: 400 });
  }

  const db = await getDb();
  const friendships = db.collection("friendships");

  const [userId1, userId2] = [from, to].sort((a, b) =>
    a.toString().localeCompare(b.toString())
  );

  const existing = await friendships.findOne({ userId1, userId2 });

  if (!existing) {
    await friendships.insertOne({
      userId1,
      userId2,
      status: "pending",
      requesterId: from,
      createdAt: new Date()
    });
    return json({ success: true, status: "pending" });
  }

  if (existing.status === "accepted") {
    return json({ success: true, status: "friends" });
  }

  if (existing.status === "pending") {
    if (!existing.requesterId.equals(from)) {
      await friendships.updateOne(
        { _id: existing._id },
        { $set: { status: "accepted" } }
      );
      return json({ success: true, status: "friends" });
    }
    return json({ success: true, status: "pending" });
  }

  return json({ success: true });
}
