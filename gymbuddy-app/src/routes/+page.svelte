<script>
  import { onMount } from "svelte";
  import { calculateLevel } from "$lib/gamification.js";
  import { readSession } from "$lib/session.js";

  let isAuthenticated = $state(false);
  let userId = $state("");
  let email = $state("");

  let xp = $state(0);
  let level = $state(1);
  let trainingsCount = $state(0);
  let soloCount = $state(0);
  let buddyCount = $state(0);
  let recentTrainings = $state([]);

  let loading = $state(false);
  let error = $state("");

  async function loadDashboard() {
    if (!isAuthenticated || !userId) return;

    loading = true;
    error = "";

    try {
      const [profileRes, trainingsRes] = await Promise.all([
        fetch(`/api/profile?userId=${encodeURIComponent(userId)}`),
        fetch(`/api/trainings?userId=${encodeURIComponent(userId)}`)
      ]);

      if (!profileRes.ok) {
        const err = await profileRes.json().catch(() => ({}));
        throw newError(err.error || "Profil konnte nicht geladen werden.");
      }

      if (!trainingsRes.ok) {
        const err = await trainingsRes.json().catch(() => ({}));
        throw new Error(err.error || "Trainings konnten nicht geladen werden.");
      }

      const profileData = await profileRes.json();
      const trainingsData = await trainingsRes.json();

      xp = Number(profileData?.xp ?? 0);
      trainingsCount = Number(profileData?.trainingsCount ?? trainingsData?.trainingsCount ?? 0);
      level = calculateLevel(xp);

      const list = Array.isArray(trainingsData?.trainings) ? trainingsData.trainings : [];
      buddyCount = list.filter((t) => !!t?.withBuddy).length;
      soloCount = list.length - buddyCount;
      recentTrainings = list.slice(0, 5);
    } catch (e) {
      error = e?.message || "Fehler beim Laden.";
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const auth = readSession();
    if (auth?.userId) {
      isAuthenticated = true;
      userId = auth.userId;
      email = auth.email || "";
      loadDashboard();
    }
  });
</script>

<div class="container py-4">
  <h1 class="mb-3">GymBuddy</h1>

  {#if !isAuthenticated}
    <div class="alert alert-info">
      Bitte melde dich an, um Gymbuddies zu finden, Trainings zu erfassen und XP zu sammeln.
    </div>
    <a href="/profile" class="btn btn-primary">Zum Login / Account erstellen</a>
  {:else}
    <p class="text-muted">Angemeldet als <strong>{email}</strong></p>

    {#if error}
      <div class="alert alert-danger">{error}</div>
    {/if}

    <div class="row g-3">
      <div class="col-12 col-lg-5">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">Dein Fortschritt</h5>
            {#if loading}
              <div class="text-muted">Lade...</div>
            {:else}
              <p class="mb-1"><strong>Level:</strong> {level}</p>
              <p class="mb-1"><strong>XP:</strong> {xp}</p>
              <p class="mb-1"><strong>Trainings gesamt:</strong> {trainingsCount}</p>
              <p class="mb-0 text-muted" style="font-size: 0.95rem;">
                {soloCount} allein, {buddyCount} mit Buddy
              </p>
            {/if}
          </div>
        </div>

        <div class="card shadow-sm mt-3">
          <div class="card-body">
            <h5 class="card-title">Nächste Schritte</h5>
            <div class="d-grid gap-2">
              <a href="/buddies" class="btn btn-outline-primary">Gymbuddies entdecken</a>
              <a href="/training" class="btn btn-outline-primary">Training erfassen</a>
              <a href="/compare" class="btn btn-outline-primary">Vergleich / Ranking</a>
              <a href="/profile" class="btn btn-outline-secondary">Mein Profil</a>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-7">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">Letzte Trainings</h5>
            {#if loading}
              <div class="text-muted">Lade...</div>
            {:else if recentTrainings.length === 0}
              <div class="text-muted">Noch keine Trainings erfasst.</div>
            {:else}
              <ul class="list-group list-group-flush">
                {#each recentTrainings as t}
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <div><strong>{t.date}</strong></div>
                      <div class="text-muted" style="font-size: 0.9rem;">
                        {#if t.withBuddy}
                          Mit Buddy: {t.buddyName}
                        {:else}
                          Allein
                        {/if}
                        {#if t.notes}
                          · {t.notes}
                        {/if}
                      </div>
                    </div>
                    <span class="badge bg-primary rounded-pill">+{t.xpGain} XP</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
