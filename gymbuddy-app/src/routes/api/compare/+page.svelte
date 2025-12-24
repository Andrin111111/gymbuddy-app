<script>
  import { onMount } from "svelte";
  import { staticBuddies } from "$lib/buddies";
  import { calculateUserStats } from "$lib/gamification";

  const TRAININGS_KEY = "gymbuddy-trainings";
  const PROFILE_KEY = "gymbuddy-profile";
  const SESSION_KEY = "gymbuddy-session";

  let profile = $state(null);
  let stats = $state({
    soloCount: 0,
    buddyCount: 0,
    xp: 0,
    level: 1
  });

  let ranking = $state([]);
  let isAuthenticated = $state(false);

  onMount(() => {
    const sessionJson = localStorage.getItem(SESSION_KEY);
    isAuthenticated = !!sessionJson;

    if (!isAuthenticated) {
      ranking = [];
      profile = null;
      stats = {
        soloCount: 0,
        buddyCount: 0,
        xp: 0,
        level: 1
      };
      return;
    }

    const profileJson = localStorage.getItem(PROFILE_KEY);
    const trainingsJson = localStorage.getItem(TRAININGS_KEY);

    profile = profileJson ? JSON.parse(profileJson) : null;
    const trainings = trainingsJson ? JSON.parse(trainingsJson) : [];

    stats = calculateUserStats(trainings, profile);

    const userEntry = {
      id: "you",
      name: profile && profile.name ? profile.name : "Du",
      gym: profile && profile.gym ? profile.gym : "Dein Gym",
      level: stats.level,
      xp: stats.xp,
      isUser: true
    };

    ranking = [userEntry, ...staticBuddies].sort((a, b) => b.xp - a.xp);
  });
</script>

<h1>Vergleich mit deinen Gymbuddies</h1>

{#if !isAuthenticated}
  <div class="alert alert-warning mt-3">
    Bitte melde dich an, um deinen Fortschritt mit anderen Gymbuddies zu
    vergleichen.
  </div>
  <a href="/profile" class="btn btn-primary mt-2">Zur Anmeldung</a>
{:else}
  <p class="mt-2">
    Hier siehst du dein aktuelles Level und deine XP im Vergleich zu anderen
    Gymbuddies.
  </p>

  <div class="row mt-3 g-3">
    <div class="col-md-4">
      <div class="card shadow-sm">
        <div class="card-body">
          <h5 class="card-title">Dein Status</h5>
          <p class="mb-1"><strong>Name:</strong> {profile?.name || "Du"}</p>
          <p class="mb-1"><strong>Gym:</strong> {profile?.gym || "Dein Gym"}</p>
          <p class="mb-1"><strong>Level:</strong> {stats.level}</p>
          <p class="mb-0"><strong>XP:</strong> {stats.xp}</p>
        </div>
      </div>
    </div>

    <div class="col-md-8">
      <h2 class="h5 mb-3">Ranking</h2>
      <ul class="list-group">
        {#each ranking as entry, index}
          <li
            class="list-group-item d-flex justify-content-between align-items-center"
            class:active={entry.isUser}
          >
            <div>
              <strong>#{index + 1} {entry.name}</strong>
              <div class="text-muted small">
                {entry.gym} · Level {entry.level}
              </div>
            </div>
            <span>{entry.xp} XP</span>
          </li>
        {/each}
      </ul>
      <p class="text-muted small mt-2">
        Einträge mit blauem Hintergrund sind deine eigenen Daten.
      </p>
    </div>
  </div>
{/if}
