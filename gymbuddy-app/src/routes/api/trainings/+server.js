import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "$lib/server/mongo.js";
import { calculateTrainingXp, calculateLevel } from "$lib/gamification.js";

const trainingSchema = z.object({
  date: z.string().max(32),
  withBuddy: z.boolean().optional(),
  buddyName: z.string().max(120).optional(),
  notes: z.string().max(300).optional()
});

function toObjectIdOrNull(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function GET({ locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const userId = String(locals.userId);

  const db = await getDb();
  const trainingsCol = db.collection("trainings");
  const usersCol = db.collection("users");

  const trainings = await trainingsCol
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  const oid = toObjectIdOrNull(userId);
  const user = oid ? await usersCol.findOne({ _id: oid }) : await usersCol.findOne({ _id: userId });

  const xp = Number(user?.xp ?? 0);
  const trainingsCount = Number(user?.trainingsCount ?? trainings.length);
  const level = calculateLevel(xp);

  return json({
    trainings: trainings.map((t) => ({
      ...t,
      _id: String(t._id)
    })),
    xp,
    level,
    trainingsCount,
    summary: {
      xp,
      level,
      trainingsCount
    }
  });
}

export async function POST({ locals, request }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid json" }, { status: 400 });

  const parsed = trainingSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid training data" }, { status: 400 });

  const userId = String(locals.userId);
  const date = String(parsed.data.date ?? "").trim();
  const withBuddy = Boolean(parsed.data.withBuddy);
  const buddyName = String(parsed.data.buddyName ?? "").trim();
  const notes = String(parsed.data.notes ?? "").trim();

  const xpGain = calculateTrainingXp(withBuddy);

  const db = await getDb();
  const trainingsCol = db.collection("trainings");
  const usersCol = db.collection("users");

  const oid = toObjectIdOrNull(userId);
  const userExists = oid
    ? await usersCol.findOne({ _id: oid }, { projection: { _id: 1 } })
    : await usersCol.findOne({ _id: userId }, { projection: { _id: 1 } });

  if (!userExists) return json({ error: "user not found" }, { status: 404 });

  const now = new Date();

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
    oid ? { _id: oid } : { _id: userId },
    {
      $inc: { xp: xpGain, trainingsCount: 1 },
      $set: { updatedAt: now }
    }
  );

  const user = oid ? await usersCol.findOne({ _id: oid }) : await usersCol.findOne({ _id: userId });
  const xp = Number(user?.xp ?? 0);
  const trainingsCount = Number(user?.trainingsCount ?? 0);
  const level = calculateLevel(xp);

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
    xp,
    level,
    trainingsCount,
    summary: {
      xp,
      level,
      trainingsCount
    }
  });
}
