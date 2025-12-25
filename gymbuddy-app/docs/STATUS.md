# GymBuddy – Repo Audit & Gap Analysis (Post Sprint Baseline)

## 1. Vorhandene Struktur
- Pages/Routes: `/`, `/buddies`, `/compare`, `/profile`, `/training`; shared layout `src/routes/+layout.svelte`.
- APIs: `/api/auth/{register,login,me,logout,delete}`, `/api/profile`, `/api/trainings` (list/create), `/api/trainings/[id]` (delete), `/api/buddies` (list), `/api/friends/{request,accept,decline,cancel,remove}`.
- Libraries: `src/lib/session.js` (client snapshot + server fetch), `src/lib/server/{mongo.js,env.js,sessions.js,security.js}`, `src/lib/gamification.js`.

## 2. Aktueller Auth/Session Ansatz
- Serverseitige Sessions in Mongo (`sessions` Collection, TTL index), Cookie `gb_session`, loaded via `hooks.server`.
- Client holt Status über `/api/auth/me`, schreibt Snapshot in `localStorage` (nur UI); falsche Logins werden beim Refresh bereinigt.
- Logout invalidiert Server-Session und Cookie.
- Kein CSRF-Schutz (fehlte vor dieser Runde).

## 3. MongoDB Nutzung
- `getDb` mit `MONGODB_URI` + `MONGODB_DB_NAME`.
- Collections verwendet: `users`, `sessions`, `trainings`. Freundschaftsdaten werden in `users` Arrays gespeichert (keine dedizierten Collections).
- Keine programmatischen Index-Setups außer Sessions-TTL.

## 4. UI Screens
- Landing: Fortschritt-Karte aus `/api/profile`.
- Profile: Login/Register, Profilfelder (name, gym, trainingLevel, goals, preferredTimes, contact), XP/Level/Trainingscount, 30 XP Bonus-Hinweis.
- Training: Einfache Trainingsliste, create/delete; XP/Level/Count Anzeige.
- Buddies: Liste aller Users, Filter clientseitig, Friend-Request Buttons; Fehlermeldung bei fehlendem Profil.
- Compare: Vergleicht dich mit Freunden (basierend auf buddies-Response).

## 5. Was funktioniert
- Registrierung/Login speichern User (PBKDF2), Sessions werden erstellt (Cookie) und invalidiert bei Logout/Delete.
- Trainings: create/list/delete, XP wird addiert/abgezogen, Level berechnet.
- Friend Requests/Freunde: Basis-Endpunkte vorhanden (ohne Limits/Privacy).
- Build ist grün (lokal `npm run build`).

## 6. Bekannte Probleme (kritisch)
1) Auto-Login-Gefühl: Client liest evtl. altes `localStorage`, aber `/api/auth/me` liefert 200 mit null → sollte 401; Snapshot könnte bis Refresh widersprüchlich sein.
2) CSRF fehlt für alle mutierenden Requests.
3) Input-Validierung fehlt (keine Zod-Schemas), NoSQL-Injection-Schutz fehlt.
4) Rate Limiting fehlt (Bruteforce möglich).
5) Privacy/Blocks/Visibility fehlen komplett.
6) Gamification unvollständig: XP caps, ranks, achievements, seasons, PRs, Templates etc. fehlen.
7) Buddy-Search/Suggestions/Blocking fehlen.
8) Workouts sind minimal (keine Exercises/Sets, kein Edit, keine PRs, keine Templates).
9) Notifications/Analytics/Feed/Challenges/Chat/Scheduling nicht vorhanden.

## 7. Soll vs Ist (Auszug)
- Sessions/Cookies: teilweise vorhanden, aber kein CSRF, keine Rate Limits.
- Validation: fehlt; muss mit Zod und Feld-Whitelists umgesetzt werden.
- Security: CSRF, Rate Limit, AuthZ/Owner-Checks, Privacy/Blocks, Logging-Regeln fehlen.
- Workouts: fehlen Kernfelder (exercises/sets), Edit/Update, PRs, Templates.
- Buddy System: keine Suche/Filter/Blocks/Suggestions.
- Gamification: XP-Regeln, Caps, Ranks/Icons, Seasons, Achievements fehlen.
- Notifications: fehlt.
- Tests/Doku: TESTPLAN, SECURITY, README Env fehlen (noch zu ergänzen).

## 8. P0 Security Gaps
- Keine CSRF-Abwehr.
- Keine Zod-Validation → NoSQL-Injection-Risiko.
- Keine Rate Limits.
- Autorisierung noch schwach: einige Endpunkte nutzen locals.userId, aber Datenmodelle erlauben Fremdzugriff (Buddies/Requests, Workouts minimal).
- Privacy/Block fehlen → mögliche Datenlecks.

## 9. Nächste Schritte (in dieser Umsetzung)
- CSRF-Double-Submit-Token einführen.
- Zod-Validation + NoSQL-Key-Guards für vorhandene Endpunkte (auth/profile/trainings/friends/buddies).
- Rate Limiting für Login/Register/Friend Requests/Buddies (baseline).
- `/api/auth/me` 401 bei fehlender Session; Client-Session-Refresh nutzt das.
- Fix Profile-Save für Kontakt/XP-Kohärenz (bereits angepasst mit serverseitigem Profil-Roundtrip).
- Docs: SECURITY.md, TESTPLAN.md, README Env/Setup.
- Keep build green.
