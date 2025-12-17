
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo";
import {
  XP_PER_TRAINING_ALONE,
  XP_PER_TRAINING_WITH_BUDDY,
} from "$lib/gamification.js";


export async function GET({ url }) {
  const userId = url.searchParams.get("userId");
  if (!userId) return json({ error: "userId missing" }, { status: 400 });

  const db = await getDb();
  const trainings = db.collection("trainings");
  const users = db.collection("users");

  const list = await trainings
    .find({ userId })
    .sort({ date: -1 })
    .toArray();

  const user = await users.findOne({ _id: userId });

  return json({
    trainings: list,
    xp: user?.xp ?? 0,
    trainingsCount: user?.trainingsCount ?? list.length,
  });
}


export async function POST({ request }) {
  const data = await request.json();
  const { userId, date, notes, withBuddy } = data;

  if (!userId || !date) {
    return json({ error: "userId and date required" }, { status: 400 });
  }

  const db = await getDb();
  const trainings = db.collection("trainings");
  const users = db.collection("users");

  const xpGain = withBuddy
    ? XP_PER_TRAINING_WITH_BUDDY
    : XP_PER_TRAINING_ALONE;

  const trainingDoc = {
    userId,
    date,
    notes: notes ?? "",
    withBuddy: !!withBuddy,
    xpGain,
    createdAt: new Date(),
  };

  await trainings.insertOne(trainingDoc);

  const { value: updatedUser } = await users.findOneAndUpdate(
    { _id: userId },
    {
      $inc: { xp: xpGain, trainingsCount: 1 },
      $setOnInsert: { xp: 0, trainingsCount: 0 },
    },
    { upsert: true, returnDocument: "after" }
  );

  return json({
    ok: true,
    training: trainingDoc,
    xp: updatedUser?.xp ?? xpGain,
    trainingsCount: updatedUser?.trainingsCount ?? 1,
  });
}
