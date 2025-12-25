import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { getDb } from "$lib/server/mongo.js";
import { calculateLevel } from "$lib/gamification.js";

function toObjectIdOrNull(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function DELETE({ params, locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const trainingId = params.id;
  const trainingOid = toObjectIdOrNull(trainingId);
  if (!trainingOid) return json({ error: "invalid id" }, { status: 400 });

  const userId = String(locals.userId);
  const db = await getDb();
  const trainingsCol = db.collection("trainings");
  const usersCol = db.collection("users");

  const training = await trainingsCol.findOne({ _id: trainingOid, userId });
  if (!training) return json({ error: "not found" }, { status: 404 });

  await trainingsCol.deleteOne({ _id: trainingOid, userId });

  const xpGain = Number(training?.xpGain ?? 0);
  const update = {
    $inc: { trainingsCount: -1 },
    $set: { updatedAt: new Date() }
  };

  if (!Number.isNaN(xpGain) && xpGain > 0) {
    update.$inc.xp = -xpGain;
  }

  await usersCol.updateOne({ _id: toObjectIdOrNull(userId) ?? userId }, update);

  const user = await usersCol.findOne({ _id: toObjectIdOrNull(userId) ?? userId });
  const xp = Number(user?.xp ?? 0);
  const trainingsCount = Number(user?.trainingsCount ?? 0);

  return json({
    ok: true,
    xp,
    trainingsCount,
    level: calculateLevel(xp)
  });
}
