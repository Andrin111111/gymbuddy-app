// src/routes/api/trainings/+server.js
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo.js";

export async function GET() {
  const db = await getDb();

  const trainings = await db
    .collection("trainings")
    .find({})
    .sort({ date: -1, createdAt: -1 })
    .toArray();

  // _id in String umwandeln
  const mapped = trainings.map((t) => ({
    id: t._id.toString(),
    date: t.date,
    withBuddy: !!t.withBuddy,
    buddyName: t.buddyName || "",
    notes: t.notes || ""
  }));

  return json(mapped);
}

export async function POST({ request }) {
  const body = await request.json();
  const { date, withBuddy, buddyName, notes } = body;

  if (!date) {
    return json({ error: "Datum fehlt." }, { status: 400 });
  }

  const doc = {
    date,
    withBuddy: !!withBuddy,
    buddyName: withBuddy ? (buddyName || "") : "",
    notes: notes || "",
    createdAt: new Date()
  };

  const db = await getDb();
  const result = await db.collection("trainings").insertOne(doc);

  return json(
    {
      id: result.insertedId.toString(),
      ...doc
    },
    { status: 201 }
  );
}
