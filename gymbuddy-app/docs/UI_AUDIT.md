# UI Audit – GymBuddy (Stand: aktuell)

## Styling-System
- Setup: Bootstrap 5 via CDN in `src/app.html`.
- Globale CSS: sehr wenig (`src/styles.css` nur Grund-Background, Hero-Höhe, einfache Card-Akzentlinie).
- Keine Design-Tokens (Farben, Radius, Spacing), keine eigenständige Komponentenbibliothek.
- Schrift: Browser-Default (Bootstrap-Stack), keine einheitlichen Größen/Hervorhebungen definiert.

## Inkonsistenzen & Beobachtungen
- Spacing und Layout variieren je Route (Cards, Abstände, Stacks uneinheitlich).
- Buttons mischen `btn-primary`, `btn-outline-*` ohne einheitliche Größen/Radius/Hover.
- Forms nutzen Bootstrap-Defaults; Fokus-States, Fehlermeldungen, Labels teils eng/fehlend.
- Karten/Rahmen: mal Border, mal Shadow, mal gar nichts; Radius nicht konsistent.
- Typografie-Hierarchie fehlt (H1/H2/H3 Größen schwanken, teils gleiche Gewichtung wie Body).
- Navigation: Standard-Bootstrap, keine aktive Hervorhebung, kein klares Padding/Sticky-Verhalten.
- Tabellen/Listen (Leaderboards, Friends) wirken kompakt, keine mobilen Scroll-Styling.
- Loading/Error/Empty-States: meist nur Plaintext, keine gestalteten Skeletons/Banner.
- Color-Palette: Bootstrap-Standardblau (#0d6efd) und graue Defaults; kein abgestimmtes Farbschema.
- Hero/Landing: große weiße Flächen ohne konsistente Container-Breite oder Grid.

## Top 10 UI-Baustellen
1. Fehlende Design-Tokens (Farben, Radius, Schatten, Spacing) → Bedarf an leichtem, konsistentem System (Light Theme, Blau als Akzent).
2. Navigation optisch schwach: bessere Hinterlegung, aktive States, Padding, Sticky/Shadow.
3. Typografie-Hierarchie vereinheitlichen (H1/H2, Body 15–16px, Muted Textgrößen).
4. Buttons vereinheitlichen (Primary/Secondary/Danger, konsistente Höhe, Radius, Fokus-Ring).
5. Form-Controls modernisieren (Radius, Border, Fokus-Ring, Fehlermeldungs-Stil, Label-Abstände).
6. Cards/Sections angleichen (Radius ~12px, Schatten, Innenabstand 16–20px, max-width Container).
7. Tabellen/Listen (Leaderboards/Friends/Requests) mit Zeilenabstand, Hover, mobile Scrollbar-Styling.
8. Loading/Empty/Error-States visuell aufwerten (Banner, Skeletons/Placeholder-Boxen) ohne Logikänderung.
9. Landing-/Home-Layout strukturieren (Grid für Hero/Stats/Suggestions, konsistente Containerbreite, Hintergrund).
10. Profile/Training/Buddies-Seiten: Vereinheitlichte Abschnittstitel, Abstände zwischen Karten, Badges/Chips für Status.
# UI Audit – GymBuddy (Stand: aktuell)

## Styling-System
- Setup: Bootstrap 5 via CDN in `src/app.html`.
- Globale CSS: sehr wenig (`src/styles.css` nur Grund-Background, Hero-Höhe, einfache Card-Akzentlinie).
- Keine Design-Tokens (Farben, Radius, Spacing), keine eigenständige Komponentenbibliothek.
- Schrift: Browser-Default (Bootstrap-Stack), keine einheitlichen Größen/Hervorhebungen definiert.

## Inkonsistenzen & Beobachtungen
- Spacing und Layout variieren je Route (Cards, Abstände, Stacks uneinheitlich).
- Buttons mischen `btn-primary`, `btn-outline-*` ohne einheitliche Größen/Radius/Hover.
- Forms nutzen Bootstrap-Defaults; Fokus-States, Fehlermeldungen, Labels teils eng/fehlend.
- Karten/Rahmen: mal Border, mal Shadow, mal gar nichts; Radius nicht konsistent.
- Typografie-Hierarchie fehlt (H1/H2/H3 Größen schwanken, teils gleiche Gewichtung wie Body).
- Navigation: Standard-Bootstrap, keine aktive Hervorhebung, kein klares Padding/Sticky-Verhalten.
- Tabellen/Listen (Leaderboards, Friends) wirken kompakt, keine mobilen Scroll-Styling.
- Loading/Error/Empty-States: meist nur Plaintext, keine gestalteten Skeletons/Banner.
- Color-Palette: Bootstrap-Standardblau (#0d6efd) und graue Defaults; kein abgestimmtes Farbschema.
- Hero/Landing: große weiße Flächen ohne konsistente Container-Breite oder Grid.

## Top 10 UI-Baustellen
1. Fehlende Design-Tokens (Farben, Radius, Schatten, Spacing) → Bedarf an leichtem, konsistentem System (Light Theme, Blau als Akzent).
2. Navigation optisch schwach: bessere Hinterlegung, aktive States, Padding, Sticky/Shadow.
3. Typografie-Hierarchie vereinheitlichen (H1/H2, Body 15–16px, Muted Textgrößen).
4. Buttons vereinheitlichen (Primary/Secondary/Danger, konsistente Höhe, Radius, Fokus-Ring).
5. Form-Controls modernisieren (Radius, Border, Fokus-Ring, Fehlermeldungs-Stil, Label-Abstände).
6. Cards/Sections angleichen (Radius ~12px, Schatten, Innenabstand 16–20px, max-width Container).
7. Tabellen/Listen (Leaderboards/Friends/Requests) mit Zeilenabstand, Hover, mobile Scrollbar-Styling.
8. Loading/Empty/Error-States visuell aufwerten (Banner, Skeletons/Placeholder-Boxen) ohne Logikänderung.
9. Landing-/Home-Layout strukturieren (Grid für Hero/Stats/Suggestions, konsistente Containerbreite, Hintergrund).
10. Profile/Training/Buddies-Seiten: Vereinheitlichte Abschnittstitel, Abstände zwischen Karten, Badges/Chips für Status.
