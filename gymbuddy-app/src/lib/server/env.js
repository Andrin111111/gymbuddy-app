// src/lib/server/env.js
import { env as privateEnv } from "$env/dynamic/private";
import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB_NAME: z.string().min(1).default("gymbuddy"),
  SESSION_SECRET: z.string().min(16).optional(),
  CSRF_SECRET: z.string().min(16).optional(),
  APP_ORIGIN: z.string().url().optional(),
  NODE_ENV: z.string().optional()
});

let cachedEnv;

export function getEnv() {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(privateEnv);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const msg = Object.entries(errors)
      .map(([key, val]) => `${key}: ${val.join(", ")}`)
      .join("; ");
    throw new Error(`Env validation failed: ${msg}`);
  }

  const data = parsed.data;
  cachedEnv = {
    MONGODB_URI: data.MONGODB_URI,
    MONGODB_DB_NAME: data.MONGODB_DB_NAME || "gymbuddy",
    SESSION_SECRET: data.SESSION_SECRET,
    CSRF_SECRET: data.CSRF_SECRET,
    APP_ORIGIN: data.APP_ORIGIN,
    NODE_ENV: data.NODE_ENV
  };

  return cachedEnv;
}

export function isProduction() {
  return (getEnv().NODE_ENV || "development") === "production";
}
