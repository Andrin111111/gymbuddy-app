# GymBuddy STATUS

## Current implemented features
- Pages: Landing (/), Buddies (/buddies), Compare (/compare), Profile (/profile), Training (/training).
- Auth: register/login/logout/me/delete endpoints; sessions in Mongo with httpOnly cookie; CSRF double-submit enforced in hooks.
- Profile: name, gym, training level, goals, preferred times, contact; visibility; profile XP bonus.
- Buddies: search by name/email/gym/training level/buddy code; privacy rules; friend requests; friends list; blocks.
- Training: workout CRUD with exercises/sets, buddy must be a friend, analytics (weekly stats, best lifts), XP updates.
- Ranks + leaderboards, achievements, notifications.
- Validation and rate limits on auth/search/friend request endpoints.

## Known gaps
- Workout templates UI is hidden (card has `d-none`), so templates are not reachable from the UI.
- Rate limiting is in-memory only (per instance).
- No buddy suggestions or distance search.
