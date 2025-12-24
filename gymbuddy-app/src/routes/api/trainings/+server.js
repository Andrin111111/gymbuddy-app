import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { getDb } from "$lib/server/mongo.js";
import { calculateTrainingXp, calculateLevel } from "$lib/gamification.js";

function toObjectIdOrNull(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function GET({ url }) {
  const userId = url.searchParams.get("userId");
  if (!userId) return json({ error: "missing userId" }, { status: 400 });

  const db = await getDb();
  const trainingsCol = db.collection("trainings");
  const usersCol = db.collection("users");

  const trainings = await trainingsCol
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  const oid = toObjectIdOrNull(userId);
  const user = oid ? await usersCol.findOne({ _id: oid }) : null;

  const xp = Number(user?.xp ?? 0);
  const trainingsCount = Number(user?.trainingsCount ?? trainings.length);

  return json({
    trainings: trainings.map((t) => ({
      ...t,
      _id: String(t._id)
    })),
    summary: {
      xp,
      level: calculateLevel(xp),
      trainingsCount
    }
  });
}

export async function POST({ request }) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid json" }, { status: 400 });

  const userId = String(body.userId ?? "").trim();
  if (!userId) return json({ error: "missing userId" }, { status: 400 });

  const oid = toObjectIdOrNull(userId);
  if (!oid) return json({ error: "invalid userId" }, { status: 400 });

  const date = String(body.date ?? "").trim();
  const withBuddy = Boolean(body.withBuddy);
  const buddyName = String(body.buddyName ?? "").trim();
  const notes = String(body.notes ?? "").trim();

  const xpGain = Number.isFinite(Number(body.xpGain))
    ? Number(body.xpGain)
    : calculateTrainingXp(withBuddy);

  const db = await getDb();
  const trainingsCol = db.collection("trainings");
  const usersCol = db.collection("users");

  const now = new Date();

  const userExists = await usersCol.findOne({ _id: oid }, { projection: { _id: 1 } });
  if (!userExists) return json({ error: "user not found" }, { status: 404 });

  const insertRes = await trainingsCol.insertOne({
    userId,
    date,
    withBuddy,
    buddyName: withBuddy ? buddyName : "",
    notes,
    xpGain,
    createdAt: now
  });

  await usersCol.updateOne(
    { _id: oid },
    {
      $inc: { xp: xpGain, trainingsCount: 1 },
      $set: { updatedAt: now }
    }
  );

  const user = await usersCol.findOne({ _id: oid });
  const xp = Number(user?.xp ?? 0);

  return json({
    ok: true,
    training: {
      _id: String(insertRes.insertedId),
      userId,
      date,
      withBuddy,
      buddyName: withBuddy ? buddyName : "",
      notes,
      xpGain,
      createdAt: now
    },
    summary: {
      xp,
      level: calculateLevel(xp),
      trainingsCount: Number(user?.trainingsCount ?? 0)
    }
  });
}
