// src/routes/api/trainings/+server.js
import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { getDb } from "$lib/server/mongo.js";
import { XP_PER_TRAINING_ALONE, XP_PER_TRAINING_WITH_BUDDY, calculateLevel } from "$lib/gamification.js";

function toObjectId(id) {
  try {
    return new ObjectId(String(id));
  } catch {
    return null;
  }
}

export async function GET({ url }) {
  const userId = url.searchParams.get("userId");
  if (!userId) return json({ error: "userId missing" }, { status: 400 });

  const userObj = toObjectId(userId);
  if (!userObj) return json({ error: "invalid userId" }, { status: 400 });

  const userIdStr = userObj.toString();

  const db = await getDb();
  const trainingsCol = db.collection("trainings");
  const users = db.collection("users");

  const list = await trainingsCol
    .find({ userId: userIdStr })
    .sort({ date: -1, createdAt: -1 })
    .toArray();

  const trainings = list.map((t) => ({
    id: t._id.toString(),
    date: t.date,
    withBuddy: !!t.withBuddy,
    buddyName: t.buddyName ?? "",
    notes: t.notes ?? "",
    xpGain: Number(t.xpGain ?? 0),
    createdAt: t.createdAt ?? null
  }));

  const user = await users.findOne({ _id: userObj }, { projection: { xp: 1, trainingsCount: 1 } });

  const xp = Number(user?.xp ?? 0);
  const trainingsCount = Number(user?.trainingsCount ?? trainings.length);

  return json({
    trainings,
    xp,
    trainingsCount,
    level: calculateLevel(xp)
  });
}

export async function POST({ request }) {
  const data = await request.json();

  const userId = data?.userId;
  const date = data?.date;
  const withBuddy = !!data?.withBuddy;
  const buddyName = withBuddy ? String(data?.buddyName ?? "").trim() : "";
  const notes = String(data?.notes ?? "");

  if (!userId || !date) {
    return json({ error: "userId and date required" }, { status: 400 });
  }

  const userObj = toObjectId(userId);
  if (!userObj) return json({ error: "invalid userId" }, { status: 400 });

  const userIdStr = userObj.toString();

  const db = await getDb();
  const trainingsCol = db.collection("trainings");
  const users = db.collection("users");

  const xpGain = withBuddy ? XP_PER_TRAINING_WITH_BUDDY : XP_PER_TRAINING_ALONE;

  const trainingDoc = {
    userId: userIdStr,
    date,
    withBuddy,
    buddyName,
    notes,
    xpGain,
    createdAt: new Date()
  };

  const insert = await trainingsCol.insertOne(trainingDoc);

  const { value: updatedUser } = await users.findOneAndUpdate(
    { _id: userObj },
    { $inc: { xp: xpGain, trainingsCount: 1 }, $set: { updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!updatedUser) {
    await trainingsCol.deleteOne({ _id: insert.insertedId });
    return json({ error: "User not found" }, { status: 404 });
  }

  const xp = Number(updatedUser.xp ?? 0);
  const trainingsCount = Number(updatedUser.trainingsCount ?? 0);

  return json({
    ok: true,
    training: {
      id: insert.insertedId.toString(),
      date,
      withBuddy,
      buddyName,
      notes,
      xpGain,
      createdAt: trainingDoc.createdAt
    },
    xp,
    trainingsCount,
    level: calculateLevel(xp)
  });
}
