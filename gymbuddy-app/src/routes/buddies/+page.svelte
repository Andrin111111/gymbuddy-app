<script>
  import { onMount } from "svelte";
  import { readSession, onSessionChange } from "$lib/session.js";

  let session = $state(null);
  let isAuthenticated = $state(false);

  let buddies = $state([]);
  let loading = $state(false);
  let errorMsg = $state("");

  let gymFilter = $state("");
  let levelFilter = $state("");
  let codeFilter = $state("");
  let maxDistance = $state("");

  async function loadBuddies(userId) {
    loading = true;
    errorMsg = "";

    try {
      const res = await fetch(`/api/buddies?userId=${encodeURIComponent(userId)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Fehler beim Laden.");
      buddies = Array.isArray(data) ? data : [];
    } catch (e) {
      errorMsg = e?.message ?? "Fehler beim Laden.";
      buddies = [];
    } finally {
      loading = false;
    }
  }

  function filteredBuddies() {
    let list = Array.isArray(buddies) ? buddies : [];

    const gyms = gymFilter
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (gyms.length) {
      list = list.filter((b) => gyms.some((g) => String(b.gym ?? "").toLowerCase().includes(g)));
    }

    if (levelFilter) {
      list = list.filter((b) => String(b.trainingLevel ?? b.level ?? "").toLowerCase() === String(levelFilter).toLowerCase());
    }

    if (codeFilter) {
      list = list.filter((b) => String(b.buddyCode ?? b.code ?? "").includes(codeFilter.trim()));
    }

    const md = Number(maxDistance);
    if (Number.isFinite(md) && md > 0) {
      list = list.filter((b) => Number(b.distanceKm ?? 9999) <= md);
    }

    return list;
  }

  async function sendRequest(targetId) {
    if (!session?.userId) return;
    errorMsg = "";

    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.userId, targetId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Fehler");

      await loadBuddies(session.userId);
    } catch (e) {
      errorMsg = e?.message ?? "Fehler";
    }
  }

  async function acceptRequest(fromId) {
    if (!session?.userId) return;
    errorMsg = "";

    try {
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.userId, fromId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Fehler");

      await loadBuddies(session.userId);
    } catch (e) {
      errorMsg = e?.message ?? "Fehler";
    }
  }

  async function declineRequest(fromId) {
    if (!session?.userId) return;
    errorMsg = "";

    try {
      const res = await fetch("/api/friends/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.userId, fromId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Fehler");

      await loadBuddies(session.userId);
    } catch (e) {
      errorMsg = e?.message ?? "Fehler";
    }
  }

  async function cancelRequest(targetId) {
    if (!session?.userId) return;
    errorMsg = "";

    try {
      const res = await fetch("/api/friends/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.userId, targetId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Fehler");

      await loadBuddies(session.userId);
    } catch (e) {
      errorMsg = e?.message ?? "Fehler";
    }
  }

  async function removeFriend(targetId) {
    if (!session?.userId) return;
    errorMsg = "";

    try {
      const res = await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.userId, targetId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Fehler");

      await loadBuddies(session.userId);
    } catch (e) {
      errorMsg = e?.message ?? "Fehler";
    }
  }

  function incomingRequests() {
    return buddies.filter((b) => b.relationship === "incoming");
  }

  function outgoingRequests() {
    return buddies.filter((b) => b.relationship === "outgoing");
  }

  onMount(() => {
    session = readSession();
    isAuthenticated = !!session?.userId;

    if (session?.userId) loadBuddies(session.userId);

    const unsub = onSessionChange((s) => {
      session = s;
      isAuthenticated = !!s?.userId;
      if (s?.userId) loadBuddies(s.userId);
      else buddies = [];
    });

    return () => unsub();
  });
</script>

<h1 class="mb-3">Gymbuddies entdecken</h1>

{#if !isAuthenticated}
  <div class="alert alert-warning">
    Bitte melde dich an, um Gymbuddies zu sehen und Freundschaften zu verwalten.
  </div>
  <a class="btn btn-primary" href="/profile">Zur Anmeldung</a>
{:else}
  {#if errorMsg}
    <div class="alert alert-danger">{errorMsg}</div>
  {/if}

  <div class="card p-3 mb-4">
    <div class="row g-3">
      <div class="col-md-6">
        <label class="form-label" for="f-gym">Nach Gym filtern</label>
        <input
          id="f-gym"
          class="form-control"
          placeholder="z.B. Activ, Fitnesspark"
          bind:value={gymFilter}
        />
        <div class="form-text">Mehrere Gyms durch Komma trennen.</div>
      </div>

      <div class="col-md-6">
        <label class="form-label" for="f-level">Nach Level filtern</label>
        <select id="f-level" class="form-select" bind:value={levelFilter}>
          <option value="">Alle</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div class="col-md-6">
        <label class="form-label" for="f-code">Nach GymBuddy ID suchen</label>
        <input
          id="f-code"
          class="form-control"
          placeholder="z.B. 734821"
          bind:value={codeFilter}
        />
      </div>

      <div class="col-md-6">
        <label class="form-label" for="f-dist">Maximale Distanz (km)</label>
        <input
          id="f-dist"
          class="form-control"
          placeholder="z.B. 5"
          bind:value={maxDistance}
        />
      </div>
    </div>
  </div>

  {#if incomingRequests().length > 0}
    <div class="card p-3 mb-4">
      <div class="fw-bold mb-2">Eingehende Freundschaftsanfragen</div>
      <div class="list-group">
        {#each incomingRequests() as b}
          <div class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <div class="fw-bold">{b.name}</div>
              <div class="text-muted small">{b.gym} · {b.trainingLevel || b.level}</div>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-success btn-sm" type="button" onclick={() => acceptRequest(b.id)}>
                Annehmen
              </button>
              <button class="btn btn-outline-danger btn-sm" type="button" onclick={() => declineRequest(b.id)}>
                Ablehnen
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if outgoingRequests().length > 0}
    <div class="card p-3 mb-4">
      <div class="fw-bold mb-2">Ausgehende Freundschaftsanfragen</div>
      <div class="list-group">
        {#each outgoingRequests() as b}
          <div class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <div class="fw-bold">{b.name}</div>
              <div class="text-muted small">{b.gym} · {b.trainingLevel || b.level}</div>
            </div>
            <button class="btn btn-outline-secondary btn-sm" type="button" onclick={() => cancelRequest(b.id)}>
              Zurueckziehen
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="text-muted">Laedt...</div>
  {:else}
    <div class="list-group">
      {#each filteredBuddies() as buddy}
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-bold">
              {buddy.isSelf ? "Du" : buddy.name}
              <span class="badge text-bg-primary ms-2">{buddy.isSelf ? "Du" : ""}</span>
            </div>
            <div class="text-muted small">
              {buddy.gym} · Level {buddy.trainingLevel || buddy.level}
            </div>
            <div class="text-muted small">ID: {buddy.buddyCode || buddy.code}</div>
          </div>

          <div class="d-flex gap-2">
            {#if buddy.isSelf}
              <a class="btn btn-outline-primary btn-sm" href="/profile">Profil ansehen</a>
            {:else if buddy.relationship === "friend"}
              <a class="btn btn-outline-primary btn-sm" href={`/buddies/${buddy.id}`}>Profil ansehen</a>
              <button class="btn btn-outline-danger btn-sm" type="button" onclick={() => removeFriend(buddy.id)}>
                Entfernen
              </button>
            {:else if buddy.relationship === "outgoing"}
              <button class="btn btn-outline-secondary btn-sm" type="button" onclick={() => cancelRequest(buddy.id)}>
                Anfrage gesendet
              </button>
            {:else if buddy.relationship === "incoming"}
              <a class="btn btn-outline-primary btn-sm" href={`/buddies/${buddy.id}`}>Profil ansehen</a>
            {:else}
              <button class="btn btn-outline-success btn-sm" type="button" onclick={() => sendRequest(buddy.id)}>
                Freundschaftsanfrage
              </button>
              <a class="btn btn-outline-primary btn-sm" href={`/buddies/${buddy.id}`}>Profil ansehen</a>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
{/if}
