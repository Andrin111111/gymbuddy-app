# Projektdokumentation – GymBuddy

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
5. [Erweiterungen [Optional]](#5-erweiterungen-optional)
6. [Projektorganisation [Optional]](#6-projektorganisation-optional)
7. [KI‑Deklaration](#7-ki‑deklaration)
8. [Anhang [Optional]](#8-anhang-optional)

> **Hinweis:** Massgeblich sind die im **Unterricht** und auf **Moodle** kommunizierten Anforderungen.

<!-- WICHTIG: DIE KAPITELSTRUKTUR DARF NICHT VERÄNDERT WERDEN! -->

<!-- Diese Vorlage ist für eine README.md im Repository gedacht. Ergänzt/ersetzt die Platzhalter mit euren Projektdaten. 
     Die Kapitelstruktur soll unverändert bleiben. Optional markierte Kapitel können weggelassen werden, wenn in den Übungen nichts anderes verlangt wird. -->

## 1. Einordnung & Zielsetzung
Kurz beschreiben, welches Problem adressiert wird und welches Ergebnis angestrebt ist.
- **Kontext & Problem:** Viele trainieren gerne, haben aber Mühe, im gleichen Gym spontan passende Trainingspartner zu finden. Gleichzeitig fehlt oft eine einfache Möglichkeit, Trainings zu dokumentieren und den Fortschritt gemeinsam sichtbar zu machen.  
- **Ziele:** Ein online verfügbarer Web‑Prototyp, mit dem ich ein Profil erstellen kann, Gym Buddies finden und als Freunde hinzufügen kann, Trainings erfassen kann und über XP/Level den Fortschritt von mir und meinen Freunden vergleichen kann.  
- **Abgrenzung [Optional]:** Kein Chat‑System, keine Terminplanung, keine GPS‑Standortfunktion und keine Anbindung an externe Gym‑Datenbanken. Eine Buddy‑Detailseite existiert als Demo, ist aber nicht Teil des Kern‑Workflows.  

## 2. Zielgruppe & Stakeholder
Wem nützt die Lösung, wer ist beteiligt oder betroffen?
- **Primäre Zielgruppe:** Fitness und Kraftsport Interessierte, die regelmässig in einem Gym trainieren und sich unkompliziert mit Trainingspartnern vernetzen möchten.  
- **Weitere Stakeholder [Optional]:** Dozierende (Bewertung), Testpersonen aus dem Umfeld, potenzielle Nutzerinnen und Nutzer aus dem ZHAW‑Umfeld.  
- **Annahmen [Optional]:**  
  - Nutzerinnen und Nutzer vernetzen sich eher, wenn Gym und Trainingslevel sichtbar sind.  
  - Ein schlanker Friend‑Request‑Flow ist verständlicher als komplexe Social‑Features.  
  - Gamification (XP/Level) motiviert zur Nutzung und macht Fortschritt vergleichbar.  

## 3. Anforderungen & Umfang
Welche Mindestanforderungen werden erfüllt, was ist im Umfang enthalten?
- **Kernfunktionalität (Mindestumfang):**  
  - Registrierung, Login, Logout  
  - Profil erfassen und aktualisieren  
  - Buddy‑Suche mit Filtermöglichkeiten  
  - Freundschaftsanfragen senden, annehmen, ablehnen und Freunde entfernen  
  - Workouts erfassen und anzeigen  
  - Vergleichsseite mit Fortschritt (XP/Level)  
- **Akzeptanzkriterien (Beispiele):**  
  - Ein Account kann erstellt werden und der Login funktioniert.  
  - Profiländerungen bleiben gespeichert und sind nach erneutem Login noch vorhanden.  
  - Eine zweite Person kann eine Anfrage annehmen, danach sind beide als Freunde sichtbar.  
  - Ein Workout kann gespeichert und in der Übersicht wieder angezeigt werden.  

## 4. Vorgehen & Artefakte
Die Durchführung erfolgte iterativ entlang der fünf Phasen aus dem Unterricht.

### 4.1 Understand & Define
- **Ausgangslage & Ziele:** Fokus auf Kern‑Workflows rund um Profil, Buddy‑Suche, Freundschaften und Workout‑Logging.  
- **Zielgruppenverständnis:** Ableitung der wichtigsten Nutzungssituationen aus eigener Erfahrung und kurzen Gesprächen im Umfeld (welche Infos braucht man, bevor man zusammen trainiert).  
- **Wesentliche Erkenntnisse:**  
  - Profilfelder müssen schnell ausfüllbar sein (Name, Gym, Level, Ziele, Zeiten, Kontakt).  
  - Buddy‑Suche braucht mindestens Filter nach Gym und Trainingslevel.  
  - Friend‑Requests sind ein einfacher und verständlicher Mechanismus zur Vernetzung.  
  - Ein minimaler Gamification‑Loop (Training erfassen, XP, Level) reicht für den Prototyp.  

### 4.2 Sketch
- **Variantenüberblick:** Skizzen für Landing, Profil‑Formular, Buddy‑Karten, Trainings‑Formular und Vergleichsseite.  
- **Artefakte:** Figma‑Mockup als Referenz: https://www.figma.com/make/G6bWGI9Ga2YQ2nz8LW32cX/GymBuddy-App-Mockup?node-id=0-1&t=7UI8fRhekKjJIiDL-1  

### 4.3 Decide
- **Gewählte Variante & Begründung:** Kartenbasiertes Layout mit klaren Primäraktionen, weil es schnell verständlich ist und die UI‑Komplexität niedrig hält.  
- **End‑to‑End‑Ablauf:** Startseite → Profil erstellen → Buddies suchen → Anfrage senden → Anfrage annehmen → Workout erfassen → Vergleich ansehen.  

### 4.4 Prototype
- **Kernfunktionalität:** Profil, Buddies, Freundschaften, Workout‑Logging, XP/Level, Vergleich.  
- **Deployment:** https://gymbuddyandrin.netlify.app/  

#### 4.4.1. Entwurf (Design)
- **Informationsarchitektur:** Seiten: Start, Profil, Buddies, Training, Vergleich. Jede Seite hat einen klaren Zweck und eine primäre Aktion.  
- **Oberflächenentwürfe:** Konsistentes Karten und Formular‑Layout (Bootstrap) mit einheitlichen Buttons und Alerts für Statusmeldungen.  
- **Designentscheidungen:**  
  - Fokus auf Übersichtlichkeit und klare Buttons  
  - Einheitliche Abstände und Typografie über CSS  
  - Responsives Layout für Desktop und Mobile  

#### 4.4.2. Umsetzung (Technik)
- **Technologie‑Stack:** SvelteKit (Svelte 5) mit Vite, Deployment über `@sveltejs/adapter-netlify`, Datenhaltung in MongoDB (MongoDB Atlas) über den offiziellen MongoDB Node Driver.  
- **Tooling:** Visual Studio Code, GitHub, Netlify, MongoDB Atlas und MongoDB Compass.  
- **UI‑Routen (SvelteKit):**  
  - `/`  
  - `/profile`  
  - `/buddies`  
  - `/buddies/[id]` (Demo‑Detailseite)  
  - `/training`  
  - `/compare`  
- **API‑Endpoints (SvelteKit +server.js):**  
  - `GET` `/api/achievements/catalog`
  - `GET` `/api/achievements/me`
  - `GET` `/api/analytics/exercise/[exerciseKey]`
  - `GET` `/api/analytics/overview`
  - `POST` `/api/auth/delete`
  - `POST` `/api/auth/login`
  - `POST` `/api/auth/logout`
  - `GET` `/api/auth/me`
  - `POST` `/api/auth/register`
  - `GET, POST` `/api/blocks`
  - `GET` `/api/exercises`
  - `POST` `/api/exercises/custom`
  - `GET, POST` `/api/friendRequests`
  - `POST` `/api/friendRequests/[id]/accept`
  - `POST` `/api/friendRequests/[id]/cancel`
  - `POST` `/api/friendRequests/[id]/decline`
  - `GET` `/api/friends`
  - `POST` `/api/friends/accept`
  - `POST` `/api/friends/cancel`
  - `POST` `/api/friends/decline`
  - `POST` `/api/friends/remove`
  - `POST` `/api/friends/request`
  - `GET` `/api/leaderboards/friends/lifetime`
  - `GET` `/api/leaderboards/friends/season`
  - `GET` `/api/notifications`
  - `POST` `/api/notifications/[id]/read`
  - `GET, PUT` `/api/profile`
  - `GET` `/api/ranks/me`
  - `GET, POST` `/api/templates`
  - `GET, PUT, DELETE` `/api/templates/[id]`
  - `GET` `/api/users/search`
  - `GET, POST` `/api/workouts`
  - `GET, PUT, DELETE` `/api/workouts/[id]`
- **Security (Prototyp‑Scope):** Passwort‑Hashing (PBKDF2), Session‑Handling, Basis‑Validierung und Schutz gegen typische Missbrauchsfälle (z. B. ungültige Inputs).  

### 4.5 Validate
- **URL der getesteten Version** (separat deployt): Es wurde keine separate Testinstanz deployt. Getestet wurde die gleiche URL wie oben: https://gymbuddyandrin.netlify.app/  
- **Ziele der Prüfung:** Verstehen Testpersonen die wichtigsten Workflows ohne Erklärung. Finden sie die Buddy‑Suche und den Friend‑Request‑Flow. Wirkt die UI verständlich und übersichtlich.  
- **Vorgehen:** Moderierter Kurztest per Screen‑Sharing, Think‑aloud.  
- **Stichprobe:** 2 Testpersonen (Studierende, trainieren regelmässig).  
- **Aufgaben/Szenarien:**  
  1. Account registrieren und anmelden.  
  2. Profil mit Gym, Level und Kontakt anlegen.  
  3. Buddy im gleichen Gym finden und Freundschaftsanfrage senden.  
  4. Mit zweitem Account anmelden und Anfrage annehmen.  
  5. Zwei Workouts erfassen (solo und mit Buddy).  
  6. Vergleichsseite öffnen und erklären, was angezeigt wird.  
  7. Logout und erneuter Login.  
- **Kennzahlen & Beobachtungen:** Keine formale Zeitmessung, Fokus auf qualitative Beobachtungen und klare Probleme im Flow.  
- **Zusammenfassung der Resultate:** Beide Testpersonen verstanden den Grundaufbau (Profil, Buddies, Training, Vergleich). In der Buddy‑Suche fiel ein Fehler auf, weil die Suchfunktion im Test nicht zuverlässig Resultate geliefert hat. Zusätzlich wurde die UI als funktional, aber visuell noch zu wenig „clean“ bewertet.  
- **Abgeleitete Verbesserungen:**  
  1. **P1:** Suchfunktion stabilisieren, damit Filter zuverlässig nach Gym, Level und Name/ID suchen und passende Ergebnisse liefern.  
  2. **P2:** UI vereinheitlichen und „cleaner“ gestalten (Karten kompakter, konsistente Abstände, klarere Hierarchie).  
  3. **P3:** Bessere Feedback‑Meldungen (Empty‑State, Ladeindikator, Fehlermeldungen) bei Suche und Requests.  
- **Umgesetzte Anpassungen [Optional]:** Nach dem Test wurde an der Suchfunktion gearbeitet und die UI‑Aufräumarbeiten wurden als nächster Schritt priorisiert.  

## 5. Erweiterungen [Optional]
Dokumentiert Erweiterungen über den Mindestumfang hinaus.
- **Beschreibung & Nutzen:** Gamification (XP/Level), Achievements und Leaderboards erhöhen Motivation und machen Fortschritt vergleichbar.  
- **Umsetzung in Kürze:** XP/Level werden serverseitig berechnet und über eigene API‑Endpoints (z. B. Ranks, Achievements, Leaderboards) ausgelesen.  
- **Abgrenzung zum Mindestumfang:** Erweiterungen betreffen Motivation und Auswertung, nicht den Kern‑Flow von Profil, Buddy‑Suche und Workout‑Logging.  

## 6. Projektorganisation [Optional]
- **Repository & Struktur:** https://github.com/Andrin111111/gymbuddy-app  
- **Versionierung:** Commits nach Features/Fixes, einfache Versionsbezeichnungen in Commit‑Messages.  
- **Deployment:** Netlify, Environment‑Variablen werden dort gesetzt (keine Secrets im Repository).  

## 7. KI‑Deklaration

### Eingesetzte KI‑Werkzeuge
ChatGPT (OpenAI).

### Zweck & Umfang
Ich habe KI als Unterstützung eingesetzt für:
- **Dateistruktur erstellen:** Vorschläge für eine sinnvolle Projekt‑ und Ordnerstruktur als Startpunkt.  
- **UI‑Bugs finden und erklären:** Unterstützung beim Finden, Eingrenzen und Erklären von UI‑Bugs (z. B. defekte Suche), inklusive Vorschlägen für Fixes.  
- **Rechtschreibung & Textqualität:** Verbesserung von Rechtschreibung und Stil in Dokumentation und Ausarbeitung.  
- **Funktionen ausarbeiten:** Strukturieren und Formulieren, welche Funktionen die App haben sollte.  
- **Codepassagen generieren:** Generierung einzelner Codepassagen als Vorlage (z. B. kleinere Utilities oder API‑Skeletons), die ich anschliessend überprüft und angepasst habe.  

### Art der Beiträge
Textentwürfe, Strukturierungsvorschläge und einzelne Code‑Snippets. Alle Vorschläge wurden von mir geprüft, angepasst und in meinen Kontext übertragen.

### Eigene Leistung (Abgrenzung)
Architektur, konkrete Workflows, Implementierung in SvelteKit, MongoDB‑Integration, Testing, Debugging und die finale Überarbeitung der KI‑Vorschläge liegen bei mir.

### Reflexion
- **Nutzen:** Schnellerer Einstieg, weniger Zeit für Boilerplate, bessere Strukturierung für Dateistrukturen und Dokumentation.  
- **Grenzen:** Vorschläge sind nicht immer konsistent mit dem aktuellen Code‑Stand und mussten angepasst werden. Deshalb waren eigene Tests und manuelle Kontrolle entscheidend.  

### Prompt‑Vorgehen [Optional]
Beispiele: „Erstelle eine SvelteKit Dateistruktur für Feature X“, „Schlage API‑Endpoints für Friend‑Requests vor“, „Formuliere dieses Kapitel verständlich und korrekt“.

### Quellen & Rechte [Optional]
Bootstrap wurde als UI‑Basis verwendet. Screenshots und Mockups stammen aus dem eigenen Figma‑Prototyp.

## 8. Anhang [Optional]
- **Testskript & Materialien:** Die Testaufgaben sind im Abschnitt „Validate“ dokumentiert.  
- **Rohdaten/Auswertung:** Keine separaten Rohdaten, qualitative Findings sind im Abschnitt „Validate“ zusammengefasst.  
- **Video‑Walkthrough:** Video wird via Moodle als Datei abgegeben.  

<!--
CHECKLISTE (optional):

[ ] Repository sauber (keine Secrets; .env nicht committet; README.md vorhanden)
[ ] Deployment funktioniert (Link in README)
[ ] Kern‑Workflows vorhanden (Login/Profil/Buddies/Friends/Workouts/Compare)
[ ] Umsetzung (Technik) vollständig (Stack; Tools; Struktur/Komponenten; Daten/Schnittstellen falls genutzt)
[ ] Evaluation durchgeführt; Ergebnisse dokumentiert; Verbesserungen abgeleitet
[ ] Dokumentation vollständig, klar strukturiert und konsistent
[ ] KI‑Deklaration ausgefüllt (Werkzeuge; Zweck & Umfang; Art der Beiträge; Abgrenzung; Quellen & Rechte; optional: Prompt‑Vorgehen, Reflexion)
[ ] Erweiterungen (falls vorhanden) begründet und abgegrenzt
[ ] Anhang gepflegt (Testskript/Materialien, Rohdaten/Auswertung) [optional]
-->
