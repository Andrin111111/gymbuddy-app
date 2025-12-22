// src/routes/api/auth/delete/+server.js
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
  try {
    const body = await request.json();
    const userId = String(body?.userId ?? "").trim();
    if (!userId) return json({ error: "userId fehlt." }, { status: 400 });

    const _id = toObjectId(userId);
    if (!_id) return json({ error: "invalid userId" }, { status: 400 });

    const db = await getDb();
    const users = db.collection("users");
    const trainings = db.collection("trainings");

    const userIdStr = _id.toString();

    await Promise.all([
      users.deleteOne({ _id }),
      trainings.deleteMany({ userId: userIdStr }),
      users.updateMany(
        {},
        {
          $pull: {
            friends: userIdStr,
            friendRequestsIn: userIdStr,
            friendRequestsOut: userIdStr
          }
        }
      )
    ]);

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Account löschen fehlgeschlagen." }, { status: 500 });
  }
}
