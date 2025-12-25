# GymBuddy Security Overview

## Sessions & Cookies
- Sessions stored in MongoDB collection `sessions` with TTL index on `expiresAt` (14d) and absolute 30d.
- Cookie `gb_session` httpOnly, sameSite=lax, secure in production.
- Logout/delete invalidates server session and clears cookie.

## CSRF
- Double submit token: cookie `gb_csrf`, header `x-csrf-token` required for POST/PUT/PATCH/DELETE in `hooks.server`.
- CSRF cookie is non-httpOnly so client can echo header; enforced globally.

## AuthZ
- `locals.userId` from session cookie in `hooks.server`; all protected endpoints check and scope by this userId.
- Client-supplied userId is ignored for protected actions.

## Input Validation & Injection Safety
- Zod schemas on auth/profile/trainings/workouts/exercises/templates/friends/buddies/analytics.
- String fields trimmed and length-limited; only expected fields processed; helper rejects `$` or `.` in user-controlled strings.
- ObjectId parsing via safe helpers; queries use literal values, no dynamic operators from client.

## Rate Limiting (in-memory baseline)
- Login: 10/IP, 5/email per 10min.
- Register: 5/IP per hour.
- Friend requests: 20/user per day.
- Search/Buddies: 30/user per minute.
- (Further limits recommended for messages/comments/likes when implemented; Redis backing optional via RATE_LIMIT_REDIS_URL placeholder.)

## Passwords
- PBKDF2 hashing with strong iterations/salt (existing `security.js`). Recommendation: migrate to argon2id in future.

## Privacy/Visibility
- Not yet implemented: visibility settings, blocks, feed opt-in. Must be enforced in future feature work.

## XP/Gamification
- XP calculated server-side for trainings; profile bonus applied server-side once; workouts store volume and PR events for later XP caps/ranks.

## Logging
- No secrets logged; auth routes avoid logging bodies (only errors).

## Environment Variables
- Required: MONGODB_URI, MONGODB_DB_NAME, SESSION_SECRET, CSRF_SECRET, APP_ORIGIN.
- Optional: RATE_LIMIT_REDIS_URL, EMAIL_SMTP_URL, NODE_ENV/NETLIFY flags.

## Open Risks / TODO
- Privacy/blocks/search visibility/XP caps/achievements/ranks not implemented; must be added.
- In-memory rate limiter is per-instance only; use Redis for multi-instance Netlify edge if needed.
- Migrate password hashing to argon2id when possible.
