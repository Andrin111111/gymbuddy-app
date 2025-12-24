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

export async function DELETE({ params, url }) {
  const trainingId = params.id;
  const userId = url.searchParams.get("userId");

  if (!userId) return json({ error: "missing userId" }, { status: 400 });

  const trainingOid = toObjectIdOrNull(trainingId);
  if (!trainingOid) return json({ error: "invalid training id" }, { status: 400 });

  const userOid = toObjectIdOrNull(userId);
  if (!userOid) return json({ error: "invalid userId" }, { status: 400 });

  const db = await getDb();
  const trainingsCol = db.collection("trainings");
  const usersCol = db.collection("users");

  const training = await trainingsCol.findOne({ _id: trainingOid, userId });
  if (!training) return json({ error: "training not found" }, { status: 404 });

  await trainingsCol.deleteOne({ _id: trainingOid, userId });

  const xpGain = Number(training.xpGain ?? 0);

  await usersCol.updateOne(
    { _id: userOid },
    { $inc: { xp: -xpGain, trainingsCount: -1 }, $set: { updatedAt: new Date() } }
  );

  const user = await usersCol.findOne({ _id: userOid });
  let xp = Number(user?.xp ?? 0);
  let trainingsCount = Number(user?.trainingsCount ?? 0);

  if (xp < 0 || trainingsCount < 0) {
    xp = Math.max(0, xp);
    trainingsCount = Math.max(0, trainingsCount);
    await usersCol.updateOne(
      { _id: userOid },
      { $set: { xp, trainingsCount, updatedAt: new Date() } }
    );
  }

  return json({
    ok: true,
    summary: {
      xp,
      level: calculateLevel(xp),
      trainingsCount
    }
  });
}

