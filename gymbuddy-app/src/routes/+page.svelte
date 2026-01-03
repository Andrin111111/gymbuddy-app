<script>
  let { data } = $props();

  let isAuthenticated = $derived(data?.isAuthenticated ?? false);
  let stats = $derived(data?.stats ?? { xp: 0, level: 1, trainingsCount: 0 });
  let suggestions = $derived(data?.suggestions ?? []);

  let suggestionsLoading = $state(false);
  let clientSuggestions = $state(null); // überschreibt Server-Daten falls vorhanden
  let suggestionsError = $state("");
  let lastFetchTs = $state(0);

  async function refreshSuggestions() {
    const now = Date.now();
    if (now - lastFetchTs < 60000) return;

    suggestionsLoading = true;
    suggestionsError = "";
    try {
      const res = await fetch("/api/buddies/suggestions");
      if (res.ok) {
        const json = await res.json();
        clientSuggestions = json.suggestions || [];
        lastFetchTs = now;
      } else {
        suggestionsError = "Vorschläge konnten nicht geladen werden.";
      }
    } catch (e) {
      suggestionsError = e?.message || "Vorschläge konnten nicht geladen werden.";
    } finally {
      suggestionsLoading = false;
    }
  }
</script>

<div class="hero">
  <div class="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3">
    <div class="text-start">
      <h1 class="mb-2">Finde deinen GymBuddy</h1>
      <p class="muted-subtitle mb-4">
        Erstelle dein Profil, finde Trainingspartner in deinem Gym und sammle XP.
      </p>
      {#if !isAuthenticated}
        <div class="d-flex flex-wrap gap-2 hero-actions">
          <a class="btn btn-primary" href="/profile">Profil erstellen</a>
          <a class="btn btn-outline-primary" href="/profile">Login</a>
        </div>
      {:else}
        <div class="d-flex flex-wrap gap-2 hero-actions">
          <a class="btn btn-primary" href="/buddies">Gymbuddies entdecken</a>
          <a class="btn btn-outline-primary" href="/training">Training erfassen</a>
        </div>
      {/if}
    </div>
    {#if isAuthenticated}
      <div class="card p-3 shadow-soft" style="max-width: 360px; width: 100%;">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div class="section-title m-0">Dein Fortschritt</div>
          <span class="pill">Level {stats.level}</span>
        </div>
        <div class="row g-3">
          <div class="col-6">
            <div class="text-muted small">XP</div>
            <div class="fw-bold fs-5">{stats.xp}</div>
          </div>
          <div class="col-6">
            <div class="text-muted small">Trainings</div>
            <div class="fw-bold fs-5">{stats.trainingsCount}</div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

{#if isAuthenticated}
  <div class="row g-3">
    <div class="col-lg-7">
      <div class="card p-3 shadow-soft h-100">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div class="section-title m-0">Buddy Vorschläge</div>
          <button class="btn btn-outline-primary btn-sm" type="button" onclick={refreshSuggestions} disabled={suggestionsLoading}>
            Aktualisieren
          </button>
        </div>
        {#if suggestionsError}
          <div class="error-banner mb-2">{suggestionsError}</div>
        {/if}
        {#if suggestionsLoading}
          <div class="skeleton" style="height: 96px;"></div>
          <div class="skeleton mt-2" style="height: 96px;"></div>
        {:else if (clientSuggestions || suggestions).length === 0}
          <div class="empty-state">Keine Vorschläge verfügbar.</div>
        {:else}
          <div class="vstack gap-2">
            {#each (clientSuggestions || suggestions) as s (s.userId)}
              <div class="border rounded-12 p-2">
                <div class="d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <div class="fw-semibold">{s.name}</div>
                    <div class="text-muted small">Score {s.score}</div>
                    <div class="text-muted small">
                      {#each s.tags as tag, i (i)}
                        <span class="chip chip-strong me-1 mb-1">{tag}</span>
                      {/each}
                    </div>
                  </div>
                  <a class="btn btn-outline-primary btn-sm" href="/buddies">Zum Buddy Tab</a>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
    <div class="col-lg-5">
      <div class="card p-3 shadow-soft h-100">
        <div class="section-title mb-1">Schnellstart</div>
        <p class="muted-subtitle">Navigation zu den wichtigsten Bereichen.</p>
        <div class="vstack spacing-sm">
          <a class="btn btn-primary w-100" href="/training">Training erfassen</a>
          <a class="btn btn-outline-primary w-100" href="/buddies">Gymbuddies entdecken</a>
          <a class="btn btn-outline-primary w-100" href="/compare">Vergleich &amp; Leaderboard</a>
          <a class="btn btn-outline-primary w-100" href="/profile">Profil &amp; Achievements</a>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="card p-3 shadow-soft">
    <div class="section-title mb-2">Warum GymBuddy?</div>
    <p class="muted-subtitle">
      Nutze Trainings-Tracking, Buddy-Finder und Gamification, um dranzubleiben. Erstelle dein Profil, sammle XP und finde Partner in deiner Nähe.
    </p>
    <div class="d-flex flex-wrap gap-2">
      <span class="chip chip-strong">XP &amp; Level</span>
      <span class="chip chip-strong">Buddy Vorschläge</span>
      <span class="chip chip-strong">Trainings-Templates</span>
      <span class="chip chip-strong">Leaderboard</span>
    </div>
  </div>
{/if}
