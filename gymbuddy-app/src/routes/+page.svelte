<script>
  import { onMount } from "svelte";
  import { calculateLevel } from "$lib/gamification.js";
  import { readSession, subscribeSession } from "$lib/session.js";

  let isAuthenticated = $state(false);
  let session = $state(null);

  let stats = $state({
    xp: 0,
    level: 1,
    trainingsCount: 0
  });

  let suggestions = $state([]);
  let suggestionsError = $state("");
  let suggestionsLoading = $state(false);

  async function loadServerStats() {
    const res = await fetch("/api/profile");
    if (!res.ok) return;
    const data = await res.json();

    const xp = Number(data?.xp ?? 0);
    const trainingsCount = Number(data?.trainingsCount ?? 0);

    stats = {
      xp,
      trainingsCount,
      level: calculateLevel(xp)
    };
  }

  async function loadSuggestions() {
    suggestionsLoading = true;
    suggestionsError = "";
    try {
      const res = await fetch("/api/buddies/suggestions");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Vorschlaege konnten nicht geladen werden.");
      suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
    } catch (e) {
      suggestionsError = e?.message || "Vorschlaege konnten nicht geladen werden.";
      suggestions = [];
    } finally {
      suggestionsLoading = false;
    }
  }

  onMount(() => {
    session = readSession();
    isAuthenticated = !!session?.userId;

    if (session?.userId) {
      loadServerStats();
      loadSuggestions();
    }

    const unsub = subscribeSession((s) => {
      session = s;
      isAuthenticated = !!s?.userId;
      if (s?.userId) {
        loadServerStats();
        loadSuggestions();
      } else {
        stats = { xp: 0, level: 1, trainingsCount: 0 };
        suggestions = [];
      }
    });

    return () => unsub();
  });
</script>

<div class="hero d-flex flex-column justify-content-center align-items-center text-center">
  <h1 class="mb-3">Finde deinen GymBuddy</h1>
  <p class="lead mb-4">
    Erstelle dein Profil, finde Trainingspartner in deinem Gym und sammle XP.
  </p>

  {#if !isAuthenticated}
    <div class="d-flex flex-wrap justify-content-center gap-3 mb-4">
      <a class="btn btn-primary" href="/profile">Profil erstellen</a>
      <a class="btn btn-outline-primary" href="/profile">Login</a>
    </div>
  {:else}
    <div class="d-flex flex-wrap justify-content-center gap-3 mb-4">
      <a class="btn btn-primary" href="/buddies">Gymbuddies entdecken</a>
      <a class="btn btn-outline-primary" href="/training">Training erfassen</a>
    </div>

    <div class="card p-3" style="max-width: 420px; width: 100%;">
      <div class="fw-bold mb-2">Dein Fortschritt</div>
      <div>Level: {stats.level}</div>
      <div>XP: {stats.xp}</div>
      <div>Trainings gesamt: {stats.trainingsCount}</div>
    </div>

    <div class="card p-3 mt-3" style="max-width: 640px; width: 100%;">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div class="fw-bold">Buddy Vorschlaege</div>
        <button class="btn btn-outline-primary btn-sm" type="button" onclick={loadSuggestions} disabled={suggestionsLoading}>
          Aktualisieren
        </button>
      </div>
      {#if suggestionsError}
        <div class="alert alert-danger mb-2">{suggestionsError}</div>
      {/if}
      {#if suggestionsLoading}
        <div class="text-muted">Lade Vorschlaege...</div>
      {:else if suggestions.length === 0}
        <div class="text-muted">Keine Vorschlaege verfuegbar.</div>
      {:else}
        <div class="vstack gap-2">
          {#each suggestions as s (s.userId)}
            <div class="border rounded p-2">
              <div class="d-flex justify-content-between align-items-start gap-2">
                <div>
                  <div class="fw-semibold">{s.name}</div>
                  <div class="text-muted small">Score {s.score}</div>
                  <div class="text-muted small">
                    {#each s.tags as tag, i (i)}
                      <span class="badge text-bg-light me-1 mb-1">{tag}</span>
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
  {/if}
</div>
