# Projektdokumentation – GymBuddy

Modul: PT – Prototyping mit Webtechnologien  
Autor: Andrin Rüedi  
Prototyp: Web-App zur Suche nach passenden GymBuddies

## Inhaltsverzeichnis

1. [Einordnung & Zielsetzung](#1-einordnung--zielsetzung)  
2. [Zielgruppe & Stakeholder](#2-zielgruppe--stakeholder)  
3. [Anforderungen & Umfang](#3-anforderungen--umfang)  
4. [Vorgehen & Artefakte](#4-vorgehen--artefakte)  
   - [Understand & Define](#41-understand--define)  
   - [Sketch](#42-sketch)  
   - [Decide](#43-decide)  
   - [Prototype](#44-prototype)  
   - [Validate](#45-validate)  
5. [Erweiterungen](#5-erweiterungen-optional)  
6. [Projektorganisation](#6-projektorganisation-optional)  
7. [KI-Deklaration](#7-ki-deklaration)  

---

## 1. Einordnung & Zielsetzung

**Kontext & Problem**  
Viele Studierende und Fitness-Interessierte trainieren alleine im Gym. Es ist schwierig, zuverlässig Trainingspartner mit ähnlichem Level, ähnlichen Zielen und im gleichen Fitnessstudio zu finden. Absprachen laufen oft chaotisch über verschiedene Chats und sind schlecht strukturiert.

**Ziele**

- Eine einfache Web-App, mit der man
  - ein persönliches GymBuddy-Profil erstellen,
  - passende Trainingspartner:innen finden und
  - sich mit ihnen verbinden kann.
- Klarer Haupt-Workflow von **„Kein Account“ → „Profil erstellt“ → „GymBuddy gefunden & verknüpft“**.
- Gamification-Elemente, die motivieren (XP für Aktivitäten, Vergleich mit Buddies).
- Technische Anforderungen aus dem Modul erfüllen: SvelteKit-Prototyp mit MongoDB, Deployment und Nutzung von Git/GitHub.

**Abgrenzung**

- Kein vollwertiges Social Network (z. B. keine Chat-Funktion, keine Gruppen-Workouts).
- Kein komplexes Rechtesystem (nur normale User, kein Admin-Backend).
- Trainingspläne werden nur sehr einfach protokolliert, nicht professionell periodisiert.

---

## 2. Zielgruppe & Stakeholder

**Primäre Zielgruppe**

- Studierende und junge Erwachsene (ca. 18–35 Jahre), die
  - regelmässig ins Fitnessstudio gehen,
  - gezielt Trainingspartner:innen suchen (Spotter, Motivation, Technik) und
  - sich mit Menschen auf ähnlichem Level verbinden wollen.

**Weitere Stakeholder**

- Fitnessstudios (indirekt): könnten von motivierten Mitgliedern und höherer Trainingsfrequenz profitieren.
- Dozierende des Moduls PT: nutzen den Prototyp, um den Umgang mit SvelteKit, MongoDB und Prototyping-Methoden zu prüfen.

**Annahmen**

- Die Zielgruppe ist digital affin und nutzt moderne Web-Apps.
- Die Gym-Standorte werden von den Nutzenden selbst gepflegt (keine offizielle Studio-API).
- Es reicht, wenn die App zunächst auf Desktop/Laptop und im mobilen Browser funktioniert.

---

## 3. Anforderungen & Umfang

### Kernfunktionalität (Mindestumfang)

Haupt-Workflow **„GymBuddy finden & verbinden“**:

1. **Account anlegen**  
   - Registrierung mit E-Mail und Passwort.  
   - Passwort-Regeln (min. 8 Zeichen, Buchstabe, Zahl, keine Leerzeichen).

2. **Anmelden & Session**  
   - Login mit E-Mail & Passwort.  
   - Session wird im Browser gespeichert (Session-Key in `localStorage`).  
   - Solange man angemeldet ist, hat man Zugriff auf alle Bereiche (Start, Gymbuddies, Trainings, Vergleich, Mein Profil).  
   - Ohne Login ist nur die Profil-/Login-Seite erreichbar.

3. **Profil anlegen & bearbeiten**  
   - Felder: Name/Nickname, Gym/Standort, Trainingslevel, Trainingsziele, bevorzugte Zeiten, Kontaktinfo, automatisch generierte **GymBuddy-ID**.  
   - GymBuddy-ID wird vom System einmalig vergeben und kann nicht manuell verändert werden.  
   - Vollständig ausgefülltes Profil wird als Vorschaukarte angezeigt.

4. **GymBuddies suchen & filtern**  
   - Übersichtsseite mit allen Profilen (inkl. Demo-Buddies aus Datenbank).  
   - Filter nach:
     - Trainingslevel
     - Gym/Standort (mehrere Gyms möglich)
     - optional Distanz / Matching nach Standort (vereinfachte Logik).  
   - Suche nach GymBuddy-ID möglich (z. B. um sich direkt zu finden).

5. **Verknüpfen & Freundschaftsanfragen**  
   - Zu jedem Profil:  
     - **Profil ansehen** → Detailansicht des Profils.  
     - **Verknüpfen** → Freundschaftsanfrage senden.  
   - Anfragen müssen von der anderen Person angenommen oder abgelehnt werden.  
   - Angenommene Verbindungen erscheinen in der Buddy-Liste; man sieht sich selbst immer zuoberst.  
   - Demo-Buddies akzeptieren Anfragen automatisch, damit der Workflow ausprobiert werden kann.

6. **Trainings erfassen & vergleichen**  
   - Trainingsseite: einfache Erfassung von Datum, Trainingstyp, Notizen und subjektivem Score.  
   - Liste eigener Trainings.  
   - Vergleichsseite: einfache Gegenüberstellung des eigenen Levels/XP mit den verbundenen GymBuddies.

7. **Deployment & Datenpersistenz**  
   - Persistenz mit MongoDB (Atlas): User, Profile, Verbindungen, Trainingsdaten.  
   - Prototyp ist deployt und über eine öffentliche URL erreichbar.  
   - Git/GitHub wird für Versionsverwaltung verwendet.

### Akzeptanzkriterien

- Nutzer:innen können ein Konto erstellen und sich anschliessend mit denselben Daten anmelden.  
- Ohne gültige Session sind die Seiten „Gymbuddies“, „Trainings“, „Vergleich“ nicht erreichbar.  
- Ein Profil kann erstellt, gespeichert, erneut geladen und angepasst werden.  
- Zu einem anderen Profil kann eine Freundschaftsanfrage geschickt und angenommen werden; danach erscheint die Verbindung in der Buddy-Liste.  
- Mindestens eine Seite zeigt Daten aus MongoDB in einer Liste (z. B. Gymbuddies-Übersicht), mindestens eine Seite erlaubt das Erstellen/Bearbeiten von Einträgen (Profil, Trainings).  
- Die App läuft im Deployment ohne Fehlermeldungen durch den Haupt-Workflow.

### Erweiterungen (kurzer Überblick)

Details siehe Kapitel [5. Erweiterungen](#5-erweiterungen-optional):

- Gamification (XP für Aktionen, Hinweis auf XP-Belohnung bei vollständig ausgefülltem Profil).  
- GymBuddy-ID als eindeutiger, systemgenerierter Code.  
- Freundschaftsanfragen inkl. Annehmen/Ablehnen.  
- Demo-Buddies in der Datenbank zum Testen.  

---

## 4. Vorgehen & Artefakte

### 4.1 Understand & Define

- Analyse der Ausgangslage: viele trainieren alleine, Wunsch nach Trainingspartnern.  
- Definition des Haupt-Workflows:  
  1. Registrieren  
  2. Profil ausfüllen  
  3. GymBuddies finden & filtern  
  4. Verbindung herstellen  
  5. Training weiter tracken und vergleichen  
- Abgrenzung: kein Chat, keine komplexe Trainingsplanung, Fokus auf Matching & Motivation.

### 4.2 Sketch

- Erste Skizzen auf Papier / Whiteboard:
  - Navigation mit Reitern: **Start**, **Gymbuddies**, **Trainings**, **Vergleich**, **Mein Profil**.
  - Kartenansicht für GymBuddies mit Name, Gym, Level, GymBuddy-ID und Buttons.
  - Profilformular mit klar getrennten Abschnitten (Basisdaten, Ziele, Zeiten, Kontakt).

### 4.3 Decide

- Auswahl einer klaren, einfachen Navigationsstruktur (Top-Navigation) statt Burger-Menu.  
- Angelehnt an **Material Design** und die Design Guidelines (Apple, Google, Microsoft).  
- Festgelegtes Farbkonzept: weisser Hintergrund, blaues Akzent-Blau passend zum Logo.  
- Referenz-Mockup in Figma erstellt und als Grundlage für das UI verwendet:  
  - Figma-Link: _[hier den aktuellen Link zu deinem Mockup einfügen]_.

### 4.4 Prototype

Umsetzung mit **SvelteKit**:

- Projekt erstellt mit `npm create svelte@latest` (Skeleton-Projekt).  
- Routenstruktur:
  - `/` – Startseite mit Einführung und Call-to-Action.  
  - `/buddies` – Übersicht & Filter für GymBuddies.  
  - `/buddies/[id]` – Detailansicht eines Profils.  
  - `/training` – Trainings erfassen & anzeigen.  
  - `/compare` – Vergleich eigener Daten mit Buddies.  
  - `/profile` – Login/Registrierung sowie Profilformular.  
- Komponenten:
  - NavBar mit Logo und Zustandsanzeige (Anmelden/Abmelden).  
  - BuddyCard, BuddyFilter, ProfileForm, TrainingList etc.  
- Backend-Funktionen:
  - API-Routen unter `/src/routes/api/...` für Auth, Profile, Buddies, Friends und Trainings.  
  - MongoDB-Zugriff gekapselt in `src/lib/server/mongo.js`.  
- Authentifizierung:
  - Registrierung/Anmeldung über API-Endpoints.  
  - Session-Objekt wird im `localStorage` gespeichert (`SESSION_KEY = "gymbuddy-session"`).  
  - Layout prüft beim Laden, ob eine gültige Session existiert und passt die Navigation an.

### 4.5 Validate

- Manuelle Tests des Haupt-Workflows:
  - Neuer Account → Profil ausfüllen → Buddy suchen → Anfrage schicken → annehmen → Verbindung sichtbar.  
  - Login/Logout und erneuter Zugriff mit existierendem Account.  
- Fehlerfälle:
  - Doppelte E-Mail bei Registrierung wird korrekt abgewehrt.  
  - Passwort-Validierung (zu kurz, keine Zahl/Buchstabe) zeigt Fehler an.  
- Informelle Usability-Checks mit Kommilitonen (Navigation, Bezeichnungen, Verständlichkeit).

---

## 5. Erweiterungen [Optional]

Folgende Funktionen gehen über den Mindestumfang hinaus:

- **Gamification**
  - XP-System (z. B. XP für vollständiges Profil, neue Verbindungen, erfasste Trainings).
  - Hinweis, dass ein vollständig ausgefülltes Profil einmalig XP bringt.

- **Freundschaftssystem**
  - Getrennte Listen für:
    - offene Anfragen,
    - eingehende Anfragen,
    - bestätigte GymBuddies.  
  - Demo-Buddies akzeptieren Anfragen automatisch, damit der Workflow ohne zweiten echten User getestet werden kann.

- **GymBuddy-ID**
  - Systemgenerierte, eindeutige ID pro Account.  
  - Wird im Profil angezeigt, kann aber nicht manuell geändert werden.  
  - Suche nach GymBuddy-ID im Buddy-Suchfeld möglich.

- **UX-Feinschliff**
  - Konsistente Fehlermeldungen, Hinweise und farblich hervorgehobene Buttons.  
  - Responsive Layout, das auch auf kleineren Screens lesbar bleibt.

---

## 6. Projektorganisation [Optional]

- **Arbeitsform:** Einzelarbeit.  
- **Versionsverwaltung:** Git & GitHub
  - Repository enthält den vollständigen SvelteKit-Code inkl. `README.md`.
  - Regelmässige Commits mit sinnvollen Commit-Messages.  
- **Branch-Strategie:** einfache `main`-Branch mit Zwischenschritten; grössere Änderungen könnten in Feature-Branches umgesetzt werden.

---

## 7. KI-Deklaration

Im Projekt wurden KI-Werkzeuge unterstützend eingesetzt:

- **ChatGPT (OpenAI)**  
  - Unterstützung bei:
    - Formulierung von Anforderungen und Akzeptanzkriterien.  
    - Ideen für UI-Struktur und Gamification-Elemente.  
    - Erstellen und Überarbeiten von SvelteKit-Code (z. B. Routen, API-Endpoints, Formular-Handling).  
  - Vorgehen:
    - KI-Vorschläge wurden nicht blind übernommen, sondern jeweils verstanden, angepasst und getestet.  
    - Sicherheits- und Validierungslogik (z. B. Passwort-Regeln) wurde zusätzlich manuell überprüft.


