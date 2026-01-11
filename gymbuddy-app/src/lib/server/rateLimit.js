// Datei: src/lib/server/rateLimit.js
// Einfacher In-Memory-Rate-Limiter (pro Instanz). Fuer Produktion durch Redis ersetzen, falls RATE_LIMIT_REDIS_URL gesetzt ist.
const buckets = new Map();

function nowMs() {
  return Date.now();
}

export function rateLimit(key, limit, windowMs) {
  const bucket = buckets.get(key) || [];
  const cutoff = nowMs() - windowMs;
  const recent = bucket.filter((t) => t > cutoff);
  recent.push(nowMs());
  buckets.set(key, recent);
  return recent.length <= limit;
}

export function getRateLimitRemaining(key, limit, windowMs) {
  const bucket = buckets.get(key) || [];
  const cutoff = nowMs() - windowMs;
  const recent = bucket.filter((t) => t > cutoff);
  return Math.max(0, limit - recent.length);
}
