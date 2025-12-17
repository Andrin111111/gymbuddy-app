import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo";

export async function POST({ request }) {
  const { userId, targetId } = await request.json();

  if (!userId || !targetId) {
    return json({ error: "invalid ids" }, { status: 400 });
  }

  const db = await getDb();
  const users = db.collection("users");

  await Promise.all([
    users.updateOne(
      { _id: userId },
      { $pull: { friendRequestsOut: targetId } }
    ),
    users.updateOne(
      { _id: targetId },
      { $pull: { friendRequestsIn: userId } }
    ),
  ]);

  return json({ ok: true });
}
