# GymBuddy (SvelteKit + MongoDB + Netlify)

## Setup
1. Install dependencies  
   ```bash
   npm install
   ```
2. Environment variables (Netlify/locally via `.env`)
   - `MONGODB_URI` (required)
   - `MONGODB_DB_NAME` (required)
   - `SESSION_SECRET` (required)
   - `CSRF_SECRET` (required)
   - `APP_ORIGIN` (required; e.g. https://your-app.netlify.app)
   - `GEOCODING_API_KEY` (required for address->geo via OpenCage)
   - Optional: `RATE_LIMIT_REDIS_URL`, `EMAIL_SMTP_URL`, `NODE_ENV`
3. Run dev  
   ```bash
   npm run dev
   ```
4. Build (Netlify uses this)  
   ```bash
   npm run build
   ```

## What's implemented (current baseline)
- Server-side sessions stored in MongoDB with TTL, httpOnly cookie `gb_session`.
- CSRF double-submit token (`gb_csrf` cookie + `x-csrf-token` header) enforced for mutating requests.
- Auth endpoints (register/login/logout/me/delete) with rate limits and validation.
- Profile load/update (contact persists) with server XP bonus application.
- Trainings create/list/delete with server XP updates.
- Buddies list + client filters; Friend request accept/decline/cancel/remove (no blocks/visibility yet).
- In-memory rate limits: login/register/friend requests.
- Input validation via Zod on existing endpoints.
- Profile address + server geocoding (OpenCage) with rounded coordinates; buddy search can filter by distance (no raw address/coords are exposed, only city/PLZ and approximate km).

## Missing (future work)
- Full workout model (exercises/sets, edit, PRs, templates).
- Privacy/visibility, blocks, buddy search filters with enforcement.
- XP caps, ranks, seasons, achievements, notifications.
- Suggestions, feed, challenges, chat, scheduling.
- Persistent/global rate limiting store.
- Distance-based matching refinements.

## Geocoding provider
- Provider: OpenCage (`https://api.opencagedata.com/geocode/v1/json`).
- Env var: `GEOCODING_API_KEY` (set in Netlify).
- Privacy: stored geo is rounded (approx), address lines/coords are never returned to other users, only city/PLZ + approx distance.

## Deployment (Netlify)
- Adapter: `@sveltejs/adapter-netlify`
- Build command: `npm run build`
- Publish: `build`
- Ensure env vars configured in Netlify UI.
