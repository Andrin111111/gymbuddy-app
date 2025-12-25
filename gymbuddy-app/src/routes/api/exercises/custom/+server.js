import { json } from "@sveltejs/kit";
import { z } from "zod";
import { getDb } from "$lib/server/mongo.js";
import { assertSafeStrings } from "$lib/server/validation.js";
import { loadExerciseCatalog } from "$lib/server/workouts.js";

const customExerciseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  muscleGroup: z.string().trim().max(40).optional().nullable(),
  equipment: z.string().trim().max(40).optional().nullable(),
  isBodyweight: z.boolean().optional()
});

function randomKey() {
  return `cust-${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST({ locals, request }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid json" }, { status: 400 });

  const parsed = customExerciseSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid exercise data" }, { status: 400 });

  const userId = String(locals.userId);
  const name = String(parsed.data.name).trim();
  const muscleGroup = String(parsed.data.muscleGroup ?? "").trim();
  const equipment = String(parsed.data.equipment ?? "").trim();
  const isBodyweight = Boolean(parsed.data.isBodyweight);

  try {
    assertSafeStrings([name, muscleGroup, equipment].filter(Boolean));
  } catch {
    return json({ error: "invalid characters" }, { status: 400 });
  }

  const db = await getDb();
  const col = db.collection("userExercises");

  await col.createIndex({ userId: 1, key: 1 }, { unique: true });

  const count = await col.countDocuments({ userId });
  if (count >= 100) return json({ error: "exercise limit reached" }, { status: 400 });

  const now = new Date();
  const doc = {
    userId,
    key: randomKey(),
    name,
    muscleGroup,
    equipment,
    isBodyweight,
    createdAt: now,
    updatedAt: now
  };

  await col.insertOne(doc);

  const catalog = await loadExerciseCatalog(userId);

  return json({
    ok: true,
    exercise: { ...doc, _id: undefined },
    builtIn: catalog.builtIn,
    custom: catalog.custom,
    all: catalog.all
  });
}
