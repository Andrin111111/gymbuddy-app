// src/routes/api/auth/delet/+server.js
import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { getDb } from "$lib/server/mongo";

export async function POST({ request }) {
  try {
    const body = await request.json();
    const userId = String(body?.userId ?? "").trim();
    if (!userId) return json({ error: "userId fehlt." }, { status: 400 });

    const db = await getDb();
    const users = db.collection("users");
    const trainings = db.collection("trainings");
    const friendships = db.collection("friendships");

    const _id = new ObjectId(userId);

    await Promise.all([
      users.deleteOne({ _id }),
      trainings.deleteMany({ userId }),
      friendships.deleteMany({ $or: [{ fromUserId: userId }, { toUserId: userId }] })
    ]);

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Account löschen fehlgeschlagen." }, { status: 500 });
  }
}
