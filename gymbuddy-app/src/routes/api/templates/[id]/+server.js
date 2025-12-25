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

function notFound() {
  return json({ error: "not found" }, { status: 404 });
}

export async function GET({ locals, params }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const templateOid = toObjectIdOrNull(params.id);
  if (!templateOid) return json({ error: "invalid id" }, { status: 400 });

  const db = await getDb();
  const templatesCol = db.collection("templates");
  const template = await templatesCol.findOne({ _id: templateOid, userId: String(locals.userId) });
  if (!template) return notFound();

  return json({ template: mapTemplate(template) });
}

export async function PUT({ locals, params, request }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const templateOid = toObjectIdOrNull(params.id);
  if (!templateOid) return json({ error: "invalid id" }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid json" }, { status: 400 });

  const parsed = templateInputSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid template data" }, { status: 400 });

  const userId = String(locals.userId);
  const db = await getDb();
  await ensureWorkoutIndexes(db);

  const templatesCol = db.collection("templates");
  const existing = await templatesCol.findOne({ _id: templateOid, userId });
  if (!existing) return notFound();

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
  await templatesCol.updateOne(
    { _id: templateOid, userId },
    {
      $set: {
        name,
        durationMinutes: parsed.data.durationMinutes ?? 45,
        notes,
        location,
        exercises: normalizedExercises,
        updatedAt: now
      }
    }
  );

  const updated = await templatesCol.findOne({ _id: templateOid, userId });

  return json({ ok: true, template: mapTemplate(updated) });
}

export async function DELETE({ locals, params }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const templateOid = toObjectIdOrNull(params.id);
  if (!templateOid) return json({ error: "invalid id" }, { status: 400 });

  const db = await getDb();
  await ensureWorkoutIndexes(db);

  const templatesCol = db.collection("templates");
  const deleted = await templatesCol.deleteOne({ _id: templateOid, userId: String(locals.userId) });
  if (!deleted.deletedCount) return notFound();

  return json({ ok: true });
}
