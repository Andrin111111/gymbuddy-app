// src/routes/api/trainings/[id]/+server.js
import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { getDb } from "$lib/server/mongo.js";

export async function DELETE({ params }) {
  const { id } = params;

  try {
    const db = await getDb();
    await db.collection("trainings").deleteOne({ _id: new ObjectId(id) });
    return json({ success: true });
  } catch (err) {
    console.error("Fehler beim Löschen eines Trainings:", err);
    return json({ error: "Löschen fehlgeschlagen." }, { status: 500 });
  }
}
