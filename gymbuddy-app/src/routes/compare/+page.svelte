<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { readSession, subscribeSession } from "$lib/session.js";
  import { RANK_ICONS } from "$lib/ranks.config.js";

  let session = $state(readSession());
  let sessionReady = $state(false);
  let isAuthenticated = $derived(sessionReady && !!session?.userId);

  let loading = $state(false);
  let error = $state("");
  let leaderboard = $state([]);
  let seasonId = $state("");
  let lifetime = $state([]);
  let loadingLifetime = $state(false);

  function setError(msg) {
    error = msg || "";
  }

  function iconFor(key) {
    return RANK_ICONS[key] || RANK_ICONS.apex;
  }

  async function loadLeaderboard() {
    setError("");
    loading = true;
    try {
      const res = await fetch("/api/leaderboards/friends/season");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Leaderboard konnte nicht geladen werden.");
      leaderboard = Array.isArray(data?.users) ? data.users : [];
      seasonId = data?.seasonId || "";
    } catch (e) {
      setError(e?.message || "Leaderboard konnte nicht geladen werden.");
      leaderboard = [];
      seasonId = "";
    } finally {
      loading = false;
    }
  }

  async function loadLifetime() {
    loadingLifetime = true;
    try {
      const res = await fetch("/api/leaderboards/friends/lifetime");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Leaderboard konnte nicht geladen werden.");
      lifetime = Array.isArray(data?.users) ? data.users : [];
    } catch {
      lifetime = [];
    } finally {
      loadingLifetime = false;
    }
  }

  onMount(() => {
    const unsub = subscribeSession((s, ready) => {
      session = s;
      sessionReady = ready;
      if (ready && s?.userId) {
        loadLeaderboard();
        loadLifetime();
      } else if (ready && !s?.userId) {
        leaderboard = [];
        seasonId = "";
        error = "";
      }
    });

    if (session?.userId) {
      loadLeaderboard();
      loadLifetime();
    }
    return unsub;
  });
</script>

<div class="container py-4">
  <h1 class="mb-3">Season Leaderboard</h1>

  {#if !sessionReady}
    <div class="alert alert-info">Lade Session...</div>
  {:else if !isAuthenticated}
    <div class="alert alert-warning">
      Bitte melde dich an, um das Friends Leaderboard zu sehen.
    </div>
    <button class="btn btn-primary" type="button" onclick={() => goto("/profile")}>
      Zur Anmeldung
    </button>
  {:else}
    {#if error}
      <div class="alert alert-danger">{error}</div>
    {/if}

    <div class="d-flex gap-2 mb-3 align-items-center">
      <button class="btn btn-outline-primary" type="button" onclick={loadLeaderboard} disabled={loading}>
        Aktualisieren
      </button>
      {#if seasonId}
        <span class="badge text-bg-secondary">Season {seasonId}</span>
      {/if}
    </div>

    {#if loading && leaderboard.length === 0}
      <div class="text-muted">Lade...</div>
    {:else if leaderboard.length === 0}
      <div class="alert alert-info">Keine Einträge verfügbar. Lade Freunde ein und logge Workouts.</div>
    {:else}
      <div class="card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-title mb-0">Friends Season Leaderboard</h5>
            <button class="btn btn-outline-primary btn-sm" type="button" onclick={loadLeaderboard} disabled={loading}>
              Aktualisieren
            </button>
          </div>
          <div class="table-responsive">
            <table class="table align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Season XP</th>
                  <th>Lifetime XP</th>
                  <th>Stars</th>
                </tr>
              </thead>
              <tbody>
                {#each leaderboard as entry, idx (entry.userId)}
                  <tr class={entry.userId === session?.userId ? "table-primary" : ""}>
                    <td>{idx + 1}</td>
                    <td>
                      <div class="d-flex align-items-center gap-2">
                        <img src={iconFor(entry.rankKey)} alt={entry.rankName} width="32" height="32" />
                        <span>{entry.rankName}</span>
                      </div>
                    </td>
                    <td class="fw-semibold">{entry.name}</td>
                    <td>{entry.seasonXp}</td>
                    <td>{entry.lifetimeXp}</td>
                    <td>{entry.rankStars}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card mt-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-title mb-0">Friends Lifetime Leaderboard</h5>
            <button class="btn btn-outline-primary btn-sm" type="button" onclick={loadLifetime} disabled={loadingLifetime}>
              Aktualisieren
            </button>
          </div>
          {#if loadingLifetime && lifetime.length === 0}
            <div class="text-muted">Lade...</div>
          {:else if lifetime.length === 0}
            <div class="text-muted">Keine Einträge.</div>
          {:else}
            <div class="table-responsive">
              <table class="table align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Lifetime XP</th>
                    <th>Stars</th>
                  </tr>
                </thead>
                <tbody>
                  {#each lifetime as entry, idx (entry.userId)}
                    <tr class={entry.userId === session?.userId ? "table-primary" : ""}>
                      <td>{idx + 1}</td>
                      <td>
                        <div class="d-flex align-items-center gap-2">
                          <img src={iconFor(entry.rankKey)} alt={entry.rankName} width="32" height="32" />
                          <span>{entry.rankName}</span>
                        </div>
                      </td>
                      <td class="fw-semibold">{entry.name}</td>
                      <td>{entry.lifetimeXp}</td>
                      <td>{entry.rankStars}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>






