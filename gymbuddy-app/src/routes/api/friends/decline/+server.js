import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo";

export async function POST({ request }) {
  const { userId, fromId } = await request.json();

  if (!userId || !fromId) {
    return json({ error: "invalid ids" }, { status: 400 });
  }

  const db = await getDb();
  const users = db.collection("users");

  await Promise.all([
    users.updateOne(
      { _id: userId },
      { $pull: { friendRequestsIn: fromId } }
    ),
    users.updateOne(
      { _id: fromId },
      { $pull: { friendRequestsOut: userId } }
    ),
  ]);

  return json({ ok: true });
}
