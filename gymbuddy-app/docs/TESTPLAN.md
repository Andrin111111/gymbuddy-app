# GymBuddy Testplan (manuell)

## Auth & Session
- Registrierung: neu anlegen, Erfolgsmeldung, Session-Cookie gesetzt, /api/auth/me -> 200 mit userId.
- Login: falsches Passwort -> 401, Rate Limit nach >10/IP oder >5/Email in 10min -> 429.
- Auto-Login-Regression: Ohne Session-Cookie -> /api/auth/me 401, UI zeigt ausgeloggt.
- Logout: /api/auth/logout -> 200, Cookie gelöscht, /api/auth/me -> 401, UI ausgeloggt.
- Reload: angemeldet bleiben mit gültiger Session; abgelaufene Session -> 401 und UI Logout.

## CSRF
- POST ohne x-csrf-token oder mit falschem Token -> 403 (z.B. /api/profile, /api/trainings, /api/friends/request).
- POST mit korrektem Token (Cookie == Header) -> 200.

## Profile
- Profil laden nach Login -> Felder gefüllt inkl. contact.
- Profil speichern -> Werte persistieren nach Reload; XP-Bonus (30) einmalig, Anzeige konsistent.

## Trainings
- Training erstellen (mit/ohne Buddy) -> erscheint in Liste, XP/Level/Trainingscount aktualisieren.
- Training löschen -> Eintrag entfernt, XP/Count dekrementieren entsprechend.
- Unauth: /api/trainings GET/POST -> 401.

## Buddies/Friends
- /api/buddies ohne Session -> 401.
- Mit Session: Liste lädt, Filter (gym, level, buddyCode) funktionieren.
- Friend Request senden/accept/decline/cancel/remove -> Statusänderungen sichtbar, Limits: >20/Tag -> 429.

## Security
- NoSQL Injection: Strings mit `$` oder `.` in Inputs abweisen (Validations).
- XSS: Eingaben mit `<script>` bleiben escaped in UI (Spot-check Profile/Notes).
- Rate Limits: Login/Register per Vorgaben; Friend Request limit greift.

## Critical Bugs Regression
- Bug1 Auto-Login: Keine Session -> UI ausgeloggt; /api/auth/me 401.
- Bug2 Logout: Session/Cookie invalidiert, geschützte APIs 401.
- Bug3 Profile contact: Speichern/Reload behält contact.
- Bug4 XP: XP-Anzeigen (Home/Profile/Trainingsliste) spiegeln Serverwerte nach Aktionen.

## Build/Deploy
- `npm run build` grün.
- Netlify env: MONGODB_URI, MONGODB_DB_NAME, SESSION_SECRET, CSRF_SECRET, APP_ORIGIN gesetzt.
