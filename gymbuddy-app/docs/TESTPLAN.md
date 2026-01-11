# GymBuddy Testplan (manual)

## Auth & Session
- Registration: create new account, success, session cookie set, `/api/auth/me` -> 200 with userId.
- Login: wrong password -> 401; rate limit after >10/IP or >5/email in 10 min -> 429.
- Auto-login regression: without session cookie `/api/auth/me` -> 401 and UI shows logged out.
- Logout: `/api/auth/logout` -> 200, cookie cleared, `/api/auth/me` -> 401, UI logged out.
- Reload: stays logged in with valid session; expired session -> 401 and UI logout.
- Netlify fresh visit: no cookie => UI logged out, `/api/auth/me` -> 401.

## CSRF
- POST without `x-csrf-token` or wrong token -> 403 (e.g. `/api/profile`, `/api/workouts`, `/api/friendRequests`, blocks/templates/exercises).
- POST with correct token (cookie == header) -> 200.

## Profile
- Load profile after login -> fields populated including `contact`.
- Save profile -> values persist after reload; XP bonus (30) applied once, UI stays consistent.

## Workouts
- Workout create (with/without buddy) -> appears in list; summary updated.
- Workout edit -> changes saved; date not shifted; exercises/sets persisted.
- Workout delete -> entry removed; summary updated.
- Unauthorized: `/api/workouts` without session -> 401.

## Workouts Extras
- Exercise catalog loads; custom exercise creation limited to 100/user.
- Template create/edit/delete; use template to prefill workout.
- Analytics overview loads weekly workouts/volume and best lifts.

## PR/Stats
- New PR detected when a set weight exceeds previous best for that exerciseKey; max 2 PR events per workout.
- After edit/delete, PR cache and volume stay consistent (check `/api/analytics/exercise/{key}`).

## Buddies/Friends
- `/api/users/search` without session -> 401.
- With session: filters (name/email/gym/training level/buddyCode) work; visibility enforced.
- Friend request send/accept/decline/cancel/remove -> status visible; limit >20/day -> 429.
- Block/unblock -> blocked users disappear from search and friends list.

## Security
- NoSQL injection: strings containing `$` or `.` rejected in inputs (profile/buddies/workouts/etc.).
- XSS: inputs render escaped in UI (spot-check profile/notes/workout names).
- Rate limits: login/register per spec; friend request limit; search limit >30/min -> 429.

## Critical Bugs Regression
- Bug1 auto-login: no session -> UI logged out; `/api/auth/me` 401.
- Bug2 logout: session/cookie invalidated, protected APIs 401.
- Bug3 profile contact: save/reload keeps contact value.
- Bug4 XP display: XP/summary values match server after actions.

## Build/Deploy
- `npm run build` green.
- Netlify env: `MONGODB_URI`, `MONGODB_DB_NAME`, `SESSION_SECRET`, `CSRF_SECRET`, `APP_ORIGIN` set.
