<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { readSession, subscribeSession } from "$lib/session.js";

  let session = $state(readSession());
  let isAuthenticated = $derived(!!session?.userId);

  let loading = $state(false);
  let error = $state("");

  let me = $state(null);
  let users = $state([]);

  let gymFilter = $state("");
  let levelFilter = $state("");
  let buddyCodeFilter = $state("");
  let maxDistanceKm = $state("");

  function setError(msg) {
    error = msg || "";
  }

  function normalizeGymFilter(input) {
    return input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function applyClientFilters(list) {
    let filtered = Array.isArray(list) ? [...list] : [];

    const gyms = normalizeGymFilter(gymFilter);
    if (gyms.length > 0) {
      filtered = filtered.filter((u) => {
        const g = (u.gym || "").toLowerCase();
        return gyms.some((needle) => g.includes(needle.toLowerCase()));
      });
    }

    if (levelFilter) {
      filtered = filtered.filter((u) => (u.trainingLevel || u.level || "").toLowerCase() === levelFilter.toLowerCase());
    }

    if (buddyCodeFilter.trim()) {
      const code = buddyCodeFilter.trim();
      filtered = filtered.filter((u) => String(u.buddyCode || u.gymBuddyId || "").includes(code));
    }

    return filtered;
  }

  async function loadBuddies() {
    if (!session?.userId) return;

    setError("");
    loading = true;

    try {
      const res = await fetch(`/api/buddies?userId=${encodeURIComponent(session.userId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Buddies konnten nicht geladen werden.");

      me = data?.me || data?.user || null;
      users = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
    } catch (e) {
      setError(e?.message || "Buddies konnten nicht geladen werden.");
      me = null;
      users = [];
    } finally {
      loading = false;
    }
  }

  function isSelf(u) {
    const id = u?._id || u?.id;
    return !!(id && session?.userId && String(id) === String(session.userId));
  }

  function isFriend(u) {
    const id = String(u?._id || u?.id || "");
    const friends = Array.isArray(me?.friends) ? me.friends.map(String) : [];
    return friends.includes(id);
  }

  function isIncomingRequest(u) {
    const id = String(u?._id || u?.id || "");
    const incoming = Array.isArray(me?.friendRequestsIn) ? me.friendRequestsIn.map(String) : [];
    return incoming.includes(id);
  }

  function isOutgoingRequest(u) {
    const id = String(u?._id || u?.id || "");
    const outgoing = Array.isArray(me?.friendRequestsOut) ? me.friendRequestsOut.map(String) : [];
    return outgoing.includes(id);
  }

  async function sendRequest(targetId) {
    if (!session?.userId) return;

    setError("");
    loading = true;

    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.userId, targetUserId: targetId })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Anfrage konnte nicht gesendet werden.");

      await loadBuddies();
    } catch (e) {
      setError(e?.message || "Anfrage konnte nicht gesendet werden.");
    } finally {
      loading = false;
    }
  }

  async function cancelRequest(targetId) {
    if (!session?.userId) return;

    setError("");
    loading = true;

    try {
      const res = await fetch("/api/friends/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.userId, targetUserId: targetId })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Anfrage konnte nicht zurückgezogen werden.");

      await loadBuddies();
    } catch (e) {
      setError(e?.message || "Anfrage konnte nicht zurückgezogen werden.");
    } finally {
      loading = false;
    }
  }

  async function acceptRequest(fromId) {
    if (!session?.userId) return;

    setError("");
    loading = true;

    try {
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.userId, fromUserId: fromId })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Anfrage konnte nicht angenommen werden.");

      await loadBuddies();
    } catch (e) {
      setError(e?.message || "Anfrage konnte nicht angenommen werden.");
    } finally {
      loading = false;
    }
  }

  async function declineRequest(fromId) {
    if (!session?.userId) return;

    setError("");
    loading = true;

    try {
      const res = await fetch("/api/friends/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.userId, fromUserId: fromId })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Anfrage konnte nicht abgelehnt werden.");

      await loadBuddies();
    } catch (e) {
      setError(e?.message || "Anfrage konnte nicht abgelehnt werden.");
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const unsub = subscribeSession((s) => {
      session = s;
      if (s?.userId) loadBuddies();
      else {
        me = null;
        users = [];
        error = "";
      }
    });

    if (session?.userId) loadBuddies();

    return unsub;
  });
</script>

<div class="container py-4">
  <h1 class="mb-3">Gymbuddies entdecken</h1>

  {#if !isAuthenticated}
    <div class="alert alert-warning">
      Bitte melde dich an, um Gymbuddies zu sehen und Freundschaften zu verwalten.
    </div>
    <button class="btn btn-primary" type="button" onclick={() => goto("/profile")}>
      Zur Anmeldung
    </button>
  {:else}
    {#if error}
      <div class="alert alert-danger">{error}</div>
    {/if}

    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-3 mb-2">
          <div class="col-md-6">
            <label class="form-label" for="gymFilter">Nach Gym filtern</label>
            <input
              id="gymFilter"
              class="form-control"
              placeholder="z.B. Activ, Fitnesspark"
              bind:value={gymFilter}
            />
            <div class="form-text">Mehrere Gyms durch Komma trennen.</div>
          </div>

          <div class="col-md-6">
            <label class="form-label" for="levelFilter">Nach Level filtern</label>
            <select id="levelFilter" class="form-select" bind:value={levelFilter}>
              <option value="">Alle</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label" for="buddyCodeFilter">Nach GymBuddy ID suchen</label>
            <input
              id="buddyCodeFilter"
              class="form-control"
              placeholder="z.B. 734821"
              bind:value={buddyCodeFilter}
            />
          </div>

          <div class="col-md-6">
            <label class="form-label" for="maxDistanceKm">Maximale Distanz (km)</label>
            <input
              id="maxDistanceKm"
              class="form-control"
              placeholder="z.B. 5"
              bind:value={maxDistanceKm}
            />
            <div class="form-text">Distanz ist nur UI (wenn du keine Geo Daten hast).</div>
          </div>
        </div>

        <button class="btn btn-outline-primary btn-sm" type="button" onclick={loadBuddies} disabled={loading}>
          Aktualisieren
        </button>
      </div>
    </div>

    {#if loading && users.length === 0}
      <div class="text-muted">Lade...</div>
    {:else}
      {#if !me}
        <div class="alert alert-danger">Profil konnte nicht geladen werden.</div>
      {/if}

      {#if me && (me.friendRequestsIn?.length || 0) > 0}
        <div class="card mb-4">
          <div class="card-body">
            <h5 class="card-title mb-3">Eingehende Anfragen</h5>
            <div class="list-group">
              {#each me.friendRequestsIn as rid (rid)}
                <div class="list-group-item d-flex justify-content-between align-items-center">
                  <div class="text-muted">User ID: {rid}</div>
                  <div class="d-flex gap-2">
                    <button class="btn btn-success btn-sm" type="button" onclick={() => acceptRequest(rid)} disabled={loading}>
                      Annehmen
                    </button>
                    <button class="btn btn-outline-danger btn-sm" type="button" onclick={() => declineRequest(rid)} disabled={loading}>
                      Ablehnen
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <div class="card">
        <div class="card-body">
          <h5 class="card-title mb-3">Gefundene Accounts</h5>

          {#if applyClientFilters(users).length === 0}
            <div class="text-muted">Keine passenden Buddies gefunden.</div>
          {:else}
            <div class="list-group">
              {#each applyClientFilters(users) as u (u._id || u.id)}
                <div class="list-group-item d-flex justify-content-between align-items-start gap-3">
                  <div class="flex-grow-1">
                    <div class="fw-semibold">
                      {#if isSelf(u)}
                        Du
                      {:else}
                        {u.name || "Unbekannt"}
                      {/if}
                      <span class="text-muted">
                        {#if u.gym} – {u.gym}{/if}
                      </span>
                    </div>

                    <div class="text-muted">
                      Level {u.trainingLevel || u.level || "beginner"}
                      {#if u.goals} · Fokus: {u.goals}{/if}
                    </div>

                    <div class="text-muted">
                      ID: {u.buddyCode || u.gymBuddyId || "—"}
                    </div>
                  </div>

                  <div class="d-flex flex-column gap-2 align-items-end">
                    {#if isSelf(u)}
                      <span class="badge text-bg-primary">Du</span>
                    {:else if isFriend(u)}
                      <span class="badge text-bg-success">Freund</span>
                    {:else if isIncomingRequest(u)}
                      <span class="badge text-bg-warning">Anfrage erhalten</span>
                    {:else if isOutgoingRequest(u)}
                      <button
                        class="btn btn-outline-secondary btn-sm"
                        type="button"
                        onclick={() => cancelRequest(u._id || u.id)}
                        disabled={loading}
                      >
                        Anfrage zurückziehen
                      </button>
                    {:else}
                      <button
                        class="btn btn-outline-success btn-sm"
                        type="button"
                        onclick={() => sendRequest(u._id || u.id)}
                        disabled={loading}
                      >
                        Freundschaftsanfrage
                      </button>
                    {/if}

                    <a class="btn btn-outline-primary btn-sm" href={`/buddies/${u._id || u.id}`}>
                      Profil ansehen
                    </a>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>
