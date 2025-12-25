// src/lib/server/geo.js
import { getEnv } from "./env.js";
import { rateLimit } from "./rateLimit.js";

function roundCoord(val) {
  return Math.round(val * 100) / 100;
}

export function computeDistanceKm(pointA, pointB) {
  if (!pointA?.coordinates || !pointB?.coordinates) return null;
  const [lng1, lat1] = pointA.coordinates.map(Number);
  const [lng2, lat2] = pointB.coordinates.map(Number);
  if (![lng1, lat1, lng2, lat2].every((n) => Number.isFinite(n))) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function geocodeAddress(input) {
  const {
    addressLine1 = "",
    addressLine2 = "",
    postalCode = "",
    city = "",
    country = "CH"
  } = input || {};

  const query = [addressLine1, addressLine2, postalCode, city, country].filter(Boolean).join(", ").trim();
  if (!query) return { ok: false, reason: "empty" };

  const { GEOCODING_API_KEY } = getEnv();
  if (!GEOCODING_API_KEY) return { ok: false, reason: "missing-api-key" };

  const url = new URL("https://api.opencagedata.com/geocode/v1/json");
  url.searchParams.set("q", query);
  url.searchParams.set("key", GEOCODING_API_KEY);
  url.searchParams.set("limit", "1");
  url.searchParams.set("no_annotations", "1");
  if (country) url.searchParams.set("countrycode", country.toLowerCase());

  try {
    const res = await fetch(url.toString());
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, reason: data?.status?.message || "geocode-failed" };
    }
    const best = Array.isArray(data?.results) ? data.results[0] : null;
    const lat = Number(best?.geometry?.lat);
    const lng = Number(best?.geometry?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ok: false, reason: "no-coordinates" };
    }
    return {
      ok: true,
      lat,
      lng,
      provider: "opencage",
      precision: "approx"
    };
  } catch (err) {
    return { ok: false, reason: "geocode-error", error: err };
  }
}

export function normalizeGeoFromGeocode(result, precision = "approx") {
  if (!result?.ok) return null;
  let lat = Number(result.lat);
  let lng = Number(result.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (precision === "approx") {
    lat = roundCoord(lat);
    lng = roundCoord(lng);
  }
  return {
    type: "Point",
    coordinates: [lng, lat]
  };
}

export async function ensureGeoIndex(db) {
  try {
    await db.collection("users").createIndex({ geo: "2dsphere" });
  } catch {
    // ignore index creation failures
  }
}

export function geocodeRateLimitKey(userId) {
  return `geocode:${userId}`;
}

export function checkGeocodeRateLimit(userId) {
  return rateLimit(geocodeRateLimitKey(userId), 5, 60 * 60 * 1000);
}
