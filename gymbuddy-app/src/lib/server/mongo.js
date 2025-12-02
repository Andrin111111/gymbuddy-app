// src/lib/server/mongo.js
import { MongoClient } from "mongodb";
import { MONGODB_URI } from "$env/static/private";

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI ist nicht gesetzt. Bitte in der .env-Datei konfigurieren.");
}

const client = new MongoClient(MONGODB_URI);

let db;

/**
 * Liefert eine wiederverwendbare MongoDB-Connection.
 */
export async function getDb() {
  if (!db) {
    await client.connect();
    // Wenn im URI eine DB angegeben ist (…/gymbuddy), wird diese verwendet
    db = client.db();
  }
  return db;
}
