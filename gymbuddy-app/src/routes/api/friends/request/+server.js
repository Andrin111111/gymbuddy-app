import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo";

export async function POST({ request }) {
  const { userId, targetId } = await request.json();

  if (!userId || !targetId || userId === targetId) {
    return json({ error: "invalid ids" }, { status: 400 });
  }

  const db = await getDb();
  const users = db.collection("users");

  const [me, target] = await Promise.all([
    users.findOne({ _id: userId }),
    users.findOne({ _id: targetId }),
  ]);

  if (!me || !target) return json({ error: "user not found" }, { status: 404 });

  const alreadyFriends = (me.friends ?? []).includes(targetId);
  const alreadyOut = (me.friendRequestsOut ?? []).includes(targetId);
  const alreadyIn = (me.friendRequestsIn ?? []).includes(targetId);

  if (alreadyFriends || alreadyOut || alreadyIn) {
  
    return json({ ok: true, status: "unchanged" });
  }

  await Promise.all([
    users.updateOne(
      { _id: userId },
      { $addToSet: { friendRequestsOut: targetId } }
    ),
    users.updateOne(
      { _id: targetId },
      { $addToSet: { friendRequestsIn: userId } }
    ),
  ]);

  return json({ ok: true });
}
