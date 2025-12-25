# GymBuddy STATUS

## Current implemented features
- Pages: Landing (`/`), Buddies (`/buddies`), Compare (`/compare`), Profile (`/profile`), Training (`/training`); shared layout with navbar.
- Auth: register/login/logout/me/delete endpoints; server-side sessions stored in Mongo (`sessions` with TTL) via `gb_session` httpOnly cookie; CSRF double-submit enforced in `hooks.server`; UI session snapshot kept in `localStorage` and refreshed from `/api/auth/me`.
- Profile: load/update basic fields (name, gym, trainingLevel, goals, preferredTimes, contact); 30 XP profile bonus applied server-side when complete.
- Training: full workout CRUD with date, duration, location, buddy (must be a friend), notes, exercises with sets/reps/weight/RPE/warmup flags; workout date normalized to ISO (local day); workout edit/delete adjusts XP delta; training summary returned. Exercise catalog endpoint, custom exercises (per user, max 100), templates CRUD (per user, max 30), owner-only checks and Zod validation on all new endpoints.
- Workouts analytics/PRs: PR detection (best weight per exerciseKey, max 2 per workout), total volume per workout, userStats cache, weekly workouts/volume, best lifts list, exercise detail endpoint, delete/edit recompute stats.
- Buddies: list all users with simple client filters (gym/level/code), shows relationships (self/friend/incoming/outgoing); friend requests send/accept/decline/cancel/remove via API.
- Security controls: CSRF check for mutating requests; Zod validation on auth, profile, trainings, friends, buddies, workouts, exercises, templates, analytics; in-memory rate limits for login (IP/email), register (IP), friend requests (per user), search (per user/min); sessions with httpOnly cookie; safe-string validation to block `$`/`.` in user inputs.
- Build: `npm run build` succeeds; Netlify adapter configured.

## Broken behavior and bugs
- Friend request UX: relies on manual refresh of list after actions; no in-page status/badge feedback per item beyond reload.
- XP integrity: XP still basic per-workout increments; no caps (300/workout, 2/day), no streaks/duration/set-based XP; UI messages can diverge from intended spec.
- In-memory rate limits only; per-instance and non-persistent.

## Missing features mapped to full spec
- Workouts: no XP caps/streak logic, no buddy suggestions during logging, no leaderboard tie-ins; XP still simple.
- Matching/Buddies: no search by name with privacy enforcement, no blocks, no privacy visibility (public/friends/private), no suggestion engine with scoring/reason tags, no dedicated friends list/inbox page, no availability/goal filters.
- Gamification: no XP caps (300/workout, 2 per day), no streaks, no duration/set XP, no ranks/thresholds/icons, no seasons/season XP reset, no achievements catalog/unlock, no XP breakdown.
- Notifications: none (no friend request/accepted/achievement/etc.).
- Compare/Leaderboards: only simple table; no season or friends leaderboards.
- Social optional: no feed/likes/comments, no challenges, no chat, no scheduling/training requests.
- Security hardening: no persistent rate limit store (Redis), no audit logging; privacy/blocks absent; password hashing uses PBKDF2 (not argon2id).

## Security gaps (P0)
- Privacy/blocks/visibility not enforced -> potential data exposure in buddies list/search.
- No XP caps/streak handling -> progression manipulation possible.
- Rate limiting is in-memory only (per instance, volatile).
- Workouts and buddies lack privacy/visibility and block enforcement.
- No audit logging or persistent rate limit store.

## Geo package
- Findings before change: Profile had no address or geo fields; buddy search UI distance input was not wired to backend; backend ignored distance entirely and stored no coordinates.
- Implemented in this package: profile now accepts addressLine1/2, postalCode, city, country; server-side geocoding (OpenCage via `GEOCODING_API_KEY`) with 2dsphere index on `users.geo`, rate-limited (5/hour/user), and coordinates rounded to 2 decimals for privacy. Buddy search applies real distance filtering when user has geo and returns only city/postalCode plus rounded distance (no raw coordinates/addresses). Geo failures keep address text but clear geo and return a warning.
