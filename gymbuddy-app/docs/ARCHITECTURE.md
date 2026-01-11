# GymBuddy ARCHITECTURE

## Project layout
- `src/routes/` SvelteKit pages:
  - `+page.svelte` landing.
  - `buddies/+page.svelte` buddy search + friend request actions.
  - `compare/+page.svelte` leaderboards.
  - `profile/+page.svelte` login/register/profile.
  - `training/+page.svelte` workout logger.
- API endpoints under `src/routes/api/`:
  - `auth/{register,login,me,logout,delete}`.
  - `profile/+server.js`.
  - `users/search/+server.js`.
  - `friendRequests/+server.js`, `friendRequests/[id]/{accept,decline,cancel}`.
  - `friends/+server.js`, `friends/remove/+server.js`.
  - `blocks/+server.js`.
  - `workouts/+server.js`, `workouts/[id]/+server.js`.
  - `exercises/+server.js`, `exercises/custom/+server.js`.
  - `templates/+server.js`, `templates/[id]/+server.js`.
  - `analytics/overview/+server.js`, `analytics/exercise/[exerciseKey]/+server.js`.
  - `leaderboards/friends/{season,lifetime}/+server.js`.
  - `ranks/me/+server.js`.
  - `achievements/{catalog,me}/+server.js`.
  - `notifications/+server.js`, `notifications/[id]/read/+server.js`.
- `src/lib/` shared code:
  - `session.js` client session/CSRF helper.
  - `gamification.js` XP + legacy level helper.
  - `rank-utils.js`, `ranks.config.js` for rank display.
  - `server/` utilities: `mongo.js`, `env.js`, `sessions.js`, `csrf.js`, `rateLimit.js`, `security.js`, `ids.js`, `validation.js`, `workouts.js`, `objectId.js`.
- `hooks.server.js` loads session, ensures CSRF cookie, enforces CSRF on mutating methods.

## Server flow (high level)
- `hooks.server.js` reads the session cookie and blocks mutating requests without a matching CSRF token.
- Auth endpoints create/clear MongoDB sessions.
- Profile updates are validated and can grant the one-time profile XP bonus.
- Workouts update XP, stats, and PR tracking; buddy selection is limited to friends.
- Buddy search respects visibility and block rules; friend requests create notifications.

## Data/storage
- Collections used: `users`, `sessions`, `workouts`, `templates`, `userExercises`, `userStats`, `friendRequests`, `blocks`, `notifications`, `achievementsCatalog`, `userAchievements`.

## Security controls
- CSRF double-submit on POST/PUT/PATCH/DELETE.
- Zod validation on request bodies and query params.
- Safe-string helper blocks `$` and `.` in user input.
- In-memory rate limiting for auth/search/friend requests.
