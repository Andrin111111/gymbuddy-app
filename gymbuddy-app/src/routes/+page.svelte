<script>
  import { onMount } from "svelte";
  import { calculateUserStats } from "$lib/gamification";

  const PROFILE_KEY = "gymbuddy-profile";
  const TRAININGS_KEY = "gymbuddy-trainings";
  const SESSION_KEY = "gymbuddy-session";

  let stats = $state({
    soloCount: 0,
    buddyCount: 0,
    xp: 0,
    level: 1
  });

  let isAuthenticated = $state(false);

  onMount(() => {
    const sessionJson = localStorage.getItem(SESSION_KEY);
    isAuthenticated = !!sessionJson;

    const profileJson = localStorage.getItem(PROFILE_KEY);
    const trainingsJson = localStorage.getItem(TRAININGS_KEY);

    const profile = profileJson ? JSON.parse(profileJson) : null;
    const trainings = trainingsJson ? JSON.parse(trainingsJson) : [];

    stats = calculateUserStats(trainings, profile);
  });
</script>

<div class="hero d-flex flex-column justify-content-center align-items-center text-center">
  <h1 class="mb-3">Finde deinen GymBuddy</h1>
  <p class="lead mb-4">
    Erstelle dein Profil, finde Trainingspartner in deinem Gym und sammle XP für
    deine Workouts.
  </p>

  {#if !isAuthenticated}
    <div class="d-flex flex-wrap justify-content-center gap-3 mb-4">
      <a href="/profile" class="btn btn-primary btn-lg">
        Konto erstellen / Anmelden
      </a>
    </div>
  {:else}
    <div class="d-flex flex-wrap justify-content-center gap-3 mb-4">
      <a href="/buddies" class="btn btn-primary btn-lg">
        Gymbuddies entdecken
      </a>
      <a href="/training" class="btn btn-outline-secondary btn-lg">
        Trainings erfassen
      </a>
      <a href="/compare" class="btn btn-outline-secondary btn-lg">
        Vergleich ansehen
      </a>
    </div>
  {/if}

  {#if isAuthenticated}
    <div class="card card-gamification shadow-sm" style="max-width: 420px;">
      <div class="card-body">
        <h5 class="card-title mb-3">Dein Gamification-Status</h5>
        <p class="mb-1">
          <strong>Level:</strong> {stats.level}
        </p>
        <p class="mb-1">
          <strong>XP:</strong> {stats.xp}
        </p>
        <p class="mb-1">
          <strong>Trainings gesamt:</strong> {stats.soloCount + stats.buddyCount}
          {" "}({stats.soloCount} solo, {stats.buddyCount} mit Buddy)
        </p>
        <p class="text-muted small mb-0">
          10 XP pro Training allein, 20 XP pro Training mit Buddy, 30 XP für ein
          ausgefülltes Profil.
        </p>
      </div>
    </div>
  {/if}
</div>
