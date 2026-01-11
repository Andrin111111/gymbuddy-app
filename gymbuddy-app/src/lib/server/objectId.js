// Datei: src/lib/server/objectId.js
import { ObjectId } from "mongodb";

export function toObjectIdOrNull(id) {
  if (!id) return null;
  try {
    return new ObjectId(String(id));
  } catch {
    return null;
  }
}
