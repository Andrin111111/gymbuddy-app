import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { getDb } from "$lib/server/mongo.js";
import { clearSessionCookie, deleteSessionByToken } from "$lib/server/sessions.js";

function toObjectIdOrNull(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function POST({ locals, cookies }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const userId = String(locals.userId ?? "").trim();

  const oid = toObjectIdOrNull(userId);
  if (!oid) return json({ error: "invalid userId" }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");
  const trainings = db.collection("trainings");
  const workouts = db.collection("workouts");
  const templates = db.collection("templates");
  const userExercises = db.collection("userExercises");
  const sessions = db.collection("sessions");

  await trainings.deleteMany({ userId });
  await workouts.deleteMany({ userId });
  await templates.deleteMany({ userId });
  await userExercises.deleteMany({ userId });
  await sessions.deleteMany({ userId });

  await users.updateMany(
    {},
    {
      $pull: {
        friends: userId,
        friendRequestsIn: userId,
        friendRequestsOut: userId
      }
    }
  );

  const del = await users.deleteOne({ _id: oid });
  if (del.deletedCount === 0) {
    return json({ error: "user not found" }, { status: 404 });
  }

  const token = cookies.get("gb_session");
  if (token) {
    await deleteSessionByToken(token);
  }
  clearSessionCookie(cookies);

  return json({ ok: true });
}
