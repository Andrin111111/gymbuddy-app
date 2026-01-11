<script>
  import { onMount } from "svelte";
  import { readSession, subscribeSession } from "$lib/session.js";
  import { rankNameFromXp } from "$lib/rank-utils.js";

  /** @type {import('./$types').PageData} */
  let { data } = $props();

  let session = $state(readSession());
  let sessionReady = $state(false);
  let clientAuthenticated = $derived(sessionReady && !!session?.userId);
  let isAuthenticated = $derived(clientAuthenticated || (data?.isAuthenticated ?? false));
  let stats = $state(data?.stats ?? { xp: 0, trainingsCount: 0 });
  let rankLabel = $derived(rankNameFromXp(stats.xp));
  let lastStatsFetchTs = $state(0);

  onMount(() => {
    const unsub = subscribeSession((s, ready) => {
      session = s;
      sessionReady = ready;
      if (ready && s?.userId) refreshStats();
      if (ready && !s?.userId) {
        stats = { xp: 0, trainingsCount: 0 };
      }
    });
    return unsub;
  });

  async function refreshStats() {
    const now = Date.now();
    if (now - lastStatsFetchTs < 30000) return;
    lastStatsFetchTs = now;
    try {
      const res = await fetch("/api/profile");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;
      stats = {
        xp: Number(json?.xp ?? 0),
        trainingsCount: Number(json?.trainingsCount ?? 0)
      };
    } catch {}
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
          <span class="pill">Rank {rankLabel}</span>
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
        <div class="section-title mb-2">Schnellstart</div>
        <p class="muted-subtitle">Starte direkt mit Training oder finde neue Gymbuddies.</p>
        <div class="vstack spacing-sm">
          <a class="btn btn-primary w-100" href="/training">Training erfassen</a>
          <a class="btn btn-outline-primary w-100" href="/buddies">Gymbuddies entdecken</a>
          <a class="btn btn-outline-primary w-100" href="/compare">Vergleich &amp; Leaderboard</a>
          <a class="btn btn-outline-primary w-100" href="/profile">Profil &amp; Achievements</a>
        </div>
      </div>
    </div>
    <div class="col-lg-5">
      <div class="card p-3 shadow-soft h-100">
        <div class="section-title mb-2">Dein n&auml;chster Schritt</div>
        <ol class="mb-0 text-muted">
          <li>Profil pr&uuml;fen und Sichtbarkeit setzen.</li>
          <li>Ersten Workout erfassen und XP sammeln.</li>
          <li>Freundschaftsanfrage senden.</li>
        </ol>
      </div>
    </div>
  </div>
{:else}
  <div class="row g-3">
    <div class="col-lg-7">
      <div class="card p-3 shadow-soft h-100">
        <div class="section-title mb-2">Warum GymBuddy?</div>
        <p class="muted-subtitle">
          Nutze Trainings-Tracking, Buddy-Suche und Ranks, um dranzubleiben. Erstelle dein Profil, sammle XP und finde Trainingspartner im Gym.
        </p>
        <div class="d-flex flex-wrap gap-2">
          <span class="chip chip-strong">XP &amp; Rank</span>
          <span class="chip chip-strong">Buddy-Suche</span>
          <span class="chip chip-strong">Workouts</span>
          <span class="chip chip-strong">Leaderboard</span>
        </div>
      </div>
    </div>
    <div class="col-lg-5">
      <div class="card p-3 shadow-soft h-100">
        <div class="section-title mb-2">So startest du</div>
        <ol class="mb-0 text-muted">
          <li>Profil anlegen und Trainingslevel festlegen.</li>
          <li>Workouts erfassen und XP sammeln.</li>
          <li>Gymbuddies finden und gemeinsam trainieren.</li>
        </ol>
      </div>
    </div>
  </div>
{/if}
