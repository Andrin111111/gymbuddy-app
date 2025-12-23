// src/lib/server/mongo.js
import { MongoClient } from "mongodb";
import { env } from "$env/dynamic/private";

let client;
let db;

export async function getDb() {
  const uri = env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI ist nicht gesetzt. Bitte als Netlify Environment Variable konfigurieren."
    );
  }

  if (!client) {
    client = new MongoClient(uri);
  }

  if (!db) {
    await client.connect();
    db = client.db();
  }

  return db;
}
