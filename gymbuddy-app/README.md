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
- Profile load/update (name, gym, training level, goals, preferred times, contact, visibility).
- Buddy search with filters (name/email/gym/training level/buddy code) and visibility rules.
- Friend requests (send/accept/decline/cancel/remove) and blocks.
- Workouts (create/edit/delete) with exercises/sets and templates.
- Analytics (weekly stats, best lifts) and XP updates.
- Ranks + leaderboards, achievements, notifications, buddy suggestions.

## Missing (future work)
- Chat, scheduling, and shared plans.
- Push/email notifications and admin tools.
- Persistent/global rate limiting store.
- Advanced privacy presets and moderation tools.

## Deployment (Netlify)
- Adapter: `@sveltejs/adapter-netlify`
- Build command: `npm run build`
- Publish: `build`
- Ensure env vars configured in Netlify UI.
