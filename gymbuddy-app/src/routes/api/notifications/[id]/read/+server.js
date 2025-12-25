import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { markNotificationRead } from "$lib/server/notifications.js";

function toObjectIdOrNull(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function POST({ locals, params }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const oid = toObjectIdOrNull(params.id);
  if (!oid) return json({ error: "invalid id" }, { status: 400 });

  await markNotificationRead(String(locals.userId), oid);
  return json({ ok: true });
}
