# GymBuddy Security Overview

## Sessions & Cookies
- Sessions stored in MongoDB collection `sessions` with TTL index on `expiresAt`.
- Cookie `gb_session` is httpOnly, sameSite=lax, secure in production.
- Logout/delete invalidates the server session and clears the cookie.

## CSRF
- Double submit token: cookie `gb_csrf`, header `x-csrf-token` required for POST/PUT/PATCH/DELETE in `hooks.server`.
- CSRF cookie is non-httpOnly so the client can echo the header.

## AuthZ
- `locals.userId` from the session cookie gates protected endpoints.
- Client-supplied userId is ignored for protected actions.

## Input Validation & Injection Safety
- Zod schemas on auth/profile/users search/workouts/exercises/templates/friendRequests/friends/blocks/analytics.
- String fields trimmed and length-limited; helper rejects `$` or `.` in user-controlled strings.
- ObjectId parsing via safe helpers; queries use literal values.

## Rate Limiting (in-memory baseline)
- Login: 10/IP, 5/email per 10min.
- Register: 5/IP per hour.
- Friend requests: 20/user per day.
- Search: 30/user per minute.

## Passwords
- PBKDF2 hashing in `security.js`. Recommendation: migrate to argon2id in future.

## Privacy/Visibility
- Visibility (public/friends/private) and blocks are enforced in buddy search.
- Contact info is only shown when visibility allows it.

## XP/Gamification
- XP calculated server-side for workouts; profile bonus applied once.
- Ranks are derived from XP server-side and returned via `/api/ranks/me`.

## Environment Variables
- Required: MONGODB_URI, MONGODB_DB_NAME, SESSION_SECRET, CSRF_SECRET, APP_ORIGIN.
- Optional: RATE_LIMIT_REDIS_URL, EMAIL_SMTP_URL, NODE_ENV/NETLIFY flags.

## Open Risks / TODO
- In-memory rate limiter is per-instance only; use Redis for multi-instance scaling.
- Migrate password hashing to argon2id when possible.
