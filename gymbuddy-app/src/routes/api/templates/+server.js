import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo.js";
import {
  templateInputSchema,
  ensureWorkoutIndexes,
  loadExerciseCatalog,
  normalizeExercises,
  normalizeLocation
} from "$lib/server/workouts.js";
import { assertSafeStrings } from "$lib/server/validation.js";
import { toObjectIdOrNull } from "$lib/server/objectId.js";

function mapTemplate(doc) {
  return {
    _id: String(doc._id),
    userId: doc.userId,
    name: doc.name,
    durationMinutes: doc.durationMinutes,
    notes: doc.notes || "",
    location: doc.location || "gym",
    exercises: Array.isArray(doc.exercises) ? doc.exercises : [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

export async function GET({ locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const db = await getDb();
  await ensureWorkoutIndexes(db);

  const templatesCol = db.collection("templates");
  const templates = await templatesCol
    .find({ userId: String(locals.userId) })
    .sort({ updatedAt: -1 })
    .toArray();

  return json({ templates: templates.map(mapTemplate) });
}

export async function POST({ locals, request }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid json" }, { status: 400 });

  const parsed = templateInputSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid template data" }, { status: 400 });

  const userId = String(locals.userId);
  const db = await getDb();
  await ensureWorkoutIndexes(db);

  const templatesCol = db.collection("templates");

  const count = await templatesCol.countDocuments({ userId });
  if (count >= 30) return json({ error: "template limit reached" }, { status: 400 });

  const name = String(parsed.data.name).trim();
  const notes = String(parsed.data.notes ?? "").trim();
  const location = normalizeLocation(parsed.data.location);

  try {
    assertSafeStrings([name, notes, location].filter(Boolean));
  } catch {
    return json({ error: "invalid characters" }, { status: 400 });
  }

  const { map } = await loadExerciseCatalog(userId);

  let normalizedExercises;
  try {
    normalizedExercises = normalizeExercises(parsed.data.exercises, map);
  } catch (e) {
    return json({ error: e?.message || "invalid exercises" }, { status: 400 });
  }

  const now = new Date();
  const doc = {
    userId,
    name,
    durationMinutes: parsed.data.durationMinutes ?? 45,
    notes,
    location,
    exercises: normalizedExercises,
    createdAt: now,
    updatedAt: now
  };

  const res = await templatesCol.insertOne(doc);

  return json({ ok: true, template: { ...doc, _id: String(res.insertedId) } });
}
