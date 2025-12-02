// src/routes/api/buddies/+server.js
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/server/mongo.js";
import { ObjectId } from "mongodb";

export async function GET({ url }) {
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return json({ error: "userId fehlt." }, { status: 400 });
  }

  const db = await getDb();
  const usersCol = db.collection("users");
  const friendshipsCol = db.collection("friendships");

  const currentId = new ObjectId(userId);

  const users = await usersCol
    .find({}, { projection: { password: 0 } })
    .toArray();

  const friendships = await friendshipsCol
    .find({
      $or: [{ userId1: currentId }, { userId2: currentId }]
    })
    .toArray();

  function getRelationship(otherId) {
    if (otherId.equals(currentId)) return "self";

    const rel = friendships.find(
      (f) =>
        (f.userId1.equals(currentId) && f.userId2.equals(otherId)) ||
        (f.userId2.equals(currentId) && f.userId1.equals(otherId))
    );

    if (!rel) return "none";
    if (rel.status === "accepted") return "friends";
    if (rel.status === "pending") {
      if (rel.requesterId.equals(currentId)) return "outgoing";
      return "incoming";
    }
    return "none";
  }

  const buddies = users.map((u) => ({
    id: u._id.toString(),
    email: u.email,
    name: u.profile?.name || "Unbenannter Nutzer",
    gym: u.profile?.gym || "Noch kein Gym",
    level:
      u.profile?.level === "beginner"
        ? 1
        : u.profile?.level === "intermediate"
        ? 2
        : 3,
    goals: u.profile?.goals || "",
    trainingTimes: u.profile?.trainingTimes || "",
    contact: u.profile?.contact || "",
    code: u.profile?.code || "",
    relationship: getRelationship(u._id),
    isSelf: u._id.equals(currentId),
    isDemo: false // echte User
  }));

  return json(buddies);
}
