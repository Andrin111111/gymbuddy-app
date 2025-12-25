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

  onMount(() => {
    session = readSession();
    isAuthenticated = !!session?.userId;

    if (session?.userId) {
      loadServerStats();
    }

    const unsub = subscribeSession((s) => {
      session = s;
      isAuthenticated = !!s?.userId;
      if (s?.userId) loadServerStats();
      else stats = { xp: 0, level: 1, trainingsCount: 0 };
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
  {/if}
</div>
