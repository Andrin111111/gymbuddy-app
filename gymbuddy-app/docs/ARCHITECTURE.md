# GymBuddy ARCHITECTURE

## Project layout
- `src/routes/` SvelteKit routes:
  - `+layout.svelte` navbar, reads client session snapshot.
  - `+page.svelte` landing.
  - `buddies/+page.svelte` list/filter buddies and friend request actions.
  - `compare/+page.svelte` compare self vs friends (from buddies API).
  - `profile/+page.svelte` login/register/profile form.
  - `training/+page.svelte` full workout logger with exercises/sets, templates, custom exercises, buddy selector.
  - API endpoints under `api/`:
    - `auth/{register,login,me,logout,delete}`.
    - `profile/+server.js`.
    - `trainings/+server.js` and `trainings/[id]/+server.js` (legacy simple trainings).
    - `workouts/+server.js` and `workouts/[id]/+server.js` (owner-only workout CRUD with exercises/sets, PR events, volume).
    - `exercises/+server.js` and `exercises/custom/+server.js` (catalog + custom exercises).
    - `templates/+server.js` and `templates/[id]/+server.js` (workout templates CRUD).
    - `analytics/overview/+server.js` and `analytics/exercise/[exerciseKey]/+server.js` (weekly stats, best lifts, exercise detail).
    - `buddies/+server.js` (search/list) and `friends/{request,accept,decline,cancel,remove}/+server.js`.
- `src/lib/` shared code:
  - `session.js` client session/localStorage helper, fetches `/api/auth/me`, provides CSRF header helper.
  - `gamification.js` minimal XP/level helpers (no caps/ranks).
  - `data/exercises.js` built-in exercise catalog.
  - `server/` utilities: `mongo.js` (DB client), `env.js` (env validation), `sessions.js` (Mongo sessions + cookie), `csrf.js` (double-submit), `rateLimit.js` (in-memory limiter), `security.js` (PBKDF2 password hashing), `ids.js` (buddy code generator), `validation.js` (safe strings), `workouts.js` (schemas + normalization helpers, PR/volume/stat recompute), `objectId.js`.
- `hooks.server.js` loads session from cookie into `locals`, ensures CSRF cookie, enforces CSRF on mutating methods.
- Netlify: `netlify.toml` uses `npm run build`; adapter-netlify configured in SvelteKit.

## Server logic flow
- Incoming requests pass `hooks.server.js`:
  - Sets CSRF cookie if missing.
  - Reads session via `sessions.js`; stores `locals.userId/sessionToken`.
  - Blocks mutating requests without matching `gb_csrf` cookie/header (403).
- Auth endpoints:
  - Register/Login validate with Zod; rate-limited (IP/email). PBKDF2 hashes stored; on success create Mongo session doc, set httpOnly cookie.
  - `/api/auth/me` returns user info or 401 if no session.
  - Logout/Delete invalidate session doc and clear cookie.
- Profile endpoint:
  - GET/PUT require `locals.userId`; Zod validation; applies 30 XP bonus once when profile complete.
- Workouts endpoints:
  - Require `locals.userId`; Zod validation via `workouts.js`; exercise keys validated against catalog/custom; buddy must be in friend list; date normalized (local day -> ISO); XP delta applied per workout; owner guard on get/update/delete; indexes ensured on user/date.
  - Templates endpoints: owner-only CRUD for workout templates (max 30 per user).
  - Exercises endpoints: return built-in catalog; allow custom exercises (max 100 per user) with safe-string checks.
  - Legacy `trainings` endpoints remain for simple entries (date/buddy/notes) but superseded by `workouts`.
- Buddies endpoint:
  - Requires auth; returns current user summary and all users with relationship flags; basic filters (gym/level/buddyCode) using regex; no privacy/blocks.
- Friend endpoints:
  - Require auth; Zod validation; update `users` arrays for friendRequests/friends; rate limit on requests (20/day/user).

## Data/storage
- MongoDB via `MONGODB_URI`/`MONGODB_DB_NAME`.
- Collections used: `users`, `sessions` (TTL index created in code), `workouts` (indexed by user/date), `templates` (user-scoped), `userExercises` (user + key unique), `userStats` (best weights/volume/workout counts cache), legacy `trainings`. Friend request/friends data embedded in `users`.
- No additional collections (achievements, notifications, blocks, etc.).

## Security controls
- Sessions: httpOnly cookie, sameSite=lax, secure in production; TTL/absolute expiry; env validation requires `SESSION_SECRET`, `CSRF_SECRET`, `APP_ORIGIN`.
- CSRF: double-submit token enforced globally for mutating requests.
- Validation: Zod on auth/profile/trainings/workouts/exercises/templates/friends/buddies; safe-string helper blocks `$`/`.` keys; ObjectId parsing helpers.
- Rate limiting: in-memory per-instance for login/register/friend requests/search.
- Passwords: PBKDF2 hashing.
- Gaps: privacy/blocks absent; XP caps absent; rate limits not persistent; no audit logging; PBKDF2 instead of argon2id.
