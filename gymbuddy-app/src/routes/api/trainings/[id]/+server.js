
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo";
import { ObjectId } from "mongodb";

export async function DELETE({ params, url }) {
  const id = params.id;
  const userId = url.searchParams.get("userId");

  if (!id || !userId) {
    return json({ error: "id and userId required" }, { status: 400 });
  }

  const db = await getDb();
  const trainings = db.collection("trainings");
  const users = db.collection("users");

  const training = await trainings.findOne({
    _id: new ObjectId(id),
    userId,
  });

  if (!training) return json({ error: "Training not found" }, { status: 404 });

  await trainings.deleteOne({ _id: training._id });

  const xpToSubtract = training.xpGain ?? 0;

  const { value: updatedUser } = await users.findOneAndUpdate(
    { _id: userId },
    {
      $inc: { xp: -xpToSubtract, trainingsCount: -1 },
    },
    { returnDocument: "after" }
  );

  return json({
    ok: true,
    xp: updatedUser?.xp ?? 0,
    trainingsCount: updatedUser?.trainingsCount ?? 0,
  });
}
