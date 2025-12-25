import { getDb } from "./mongo.js";

const MAX_NOTIFICATIONS = 200;

export async function ensureNotificationIndexes(db) {
  const col = db.collection("notifications");
  await col.createIndex({ userId: 1, createdAt: -1 });
  await col.createIndex({ userId: 1, read: 1 });
}

export async function createNotification(userId, type, payload = {}) {
  if (!userId || !type) return null;
  const db = await getDb();
  const col = db.collection("notifications");
  await ensureNotificationIndexes(db);

  const doc = {
    userId: String(userId),
    type,
    payload,
    read: false,
    createdAt: new Date()
  };
  await col.insertOne(doc);

  // enforce max 200 per user, remove oldest beyond limit
  const count = await col.countDocuments({ userId: String(userId) });
  if (count > MAX_NOTIFICATIONS) {
    const toDelete = count - MAX_NOTIFICATIONS;
    await col
      .find({ userId: String(userId) })
      .sort({ createdAt: 1 })
      .limit(toDelete)
      .forEach(async (d) => {
        await col.deleteOne({ _id: d._id });
      });
  }

  return doc;
}

export async function getNotifications(userId) {
  const db = await getDb();
  const col = db.collection("notifications");
  await ensureNotificationIndexes(db);
  const list = await col
    .find({ userId: String(userId) })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  return list.map((n) => ({
    _id: String(n._id),
    userId: n.userId,
    type: n.type,
    payload: n.payload || {},
    read: !!n.read,
    createdAt: n.createdAt
  }));
}

export async function markNotificationRead(userId, notificationId) {
  const db = await getDb();
  const col = db.collection("notifications");
  await ensureNotificationIndexes(db);
  await col.updateOne(
    { _id: notificationId, userId: String(userId) },
    { $set: { read: true } }
  );
}
