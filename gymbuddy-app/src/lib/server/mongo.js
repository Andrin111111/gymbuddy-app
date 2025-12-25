// src/lib/server/mongo.js
import { MongoClient } from "mongodb";
import { getEnv } from "./env.js";

let client;
let db;

export async function getDb() {
  const { MONGODB_URI, MONGODB_DB_NAME } = getEnv();

  if (!client) {
    client = new MongoClient(MONGODB_URI);
  }

  if (!db) {
    await client.connect();
    db = client.db(MONGODB_DB_NAME);
  }

  return db;
}
