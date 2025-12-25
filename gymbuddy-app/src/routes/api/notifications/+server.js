import { json } from "@sveltejs/kit";
import { getNotifications } from "$lib/server/notifications.js";

export async function GET({ locals }) {
  if (!locals.userId) return json({ error: "unauthorized" }, { status: 401 });

  const list = await getNotifications(String(locals.userId));
  return json({ notifications: list });
}
