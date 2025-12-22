// src/routes/api/trainings/[id]/+server.js
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo.js";
import { ObjectId } from "mongodb";
import { calculateLevel } from "$lib/gamification.js";

function toObjectId(id) {
  try {
    return new ObjectId(String(id));
  } catch {
    return null;
  }
}

export async function DELETE({ params, url }) {
  const id = params.id;
  const userId = url.searchParams.get("userId");

  if (!id || !userId) {
    return json({ error: "id and userId required" }, { status: 400 });
  }

  const trainingObj = toObjectId(id);
  const userObj = toObjectId(userId);

  if (!trainingObj || !userObj) {
    return json({ error: "invalid ids" }, { status: 400 });
  }

  const userIdStr = userObj.toString();

  const db = await getDb();
  const trainings = db.collection("trainings");
  const users = db.collection("users");

  const training = await trainings.findOne({ _id: trainingObj, userId: userIdStr });
  if (!training) return json({ error: "Training not found" }, { status: 404 });

  await trainings.deleteOne({ _id: trainingObj });

  const xpToSubtract = Number(training.xpGain ?? 0);

  const { value: updatedUser } = await users.findOneAndUpdate(
    { _id: userObj },
    { $inc: { xp: -xpToSubtract, trainingsCount: -1 }, $set: { updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  const xp = Math.max(0, Number(updatedUser?.xp ?? 0));
  const trainingsCount = Math.max(0, Number(updatedUser?.trainingsCount ?? 0));

  return json({
    ok: true,
    xp,
    trainingsCount,
    level: calculateLevel(xp)
  });
}
