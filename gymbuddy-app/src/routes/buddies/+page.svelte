<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { readSession, subscribeSession, csrfHeader } from "$lib/session.js";

  let session = $state(readSession());
  let isAuthenticated = $derived(!!session?.userId);

  let searchLoading = $state(false);
  let reqLoading = $state(false);
  let friendsLoading = $state(false);
  let blockLoading = $state(false);
  let error = $state("");

  let me = $state(null);
  let results = $state([]);
  let incoming = $state([]);
  let outgoing = $state([]);
  let friends = $state([]);
  let blocks = $state([]);

  let q = $state("");
  let buddyCodeFilter = $state("");
  let gymFilter = $state("");
  let levelFilter = $state("");
  let maxDistanceKm = $state("");
  let distanceInfo = $state(null);

  function setError(msg) {
    error = msg || "";
  }

  async function loadSearch() {
    if (!session?.userId) return;
    setError("");
    searchLoading = true;
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (buddyCodeFilter.trim()) params.set("buddyCode", buddyCodeFilter.trim());
      if (gymFilter.trim()) params.set("gym", gymFilter.trim());
      if (levelFilter) params.set("level", levelFilter);
      if (maxDistanceKm && Number(maxDistanceKm) > 0) params.set("maxDistanceKm", String(maxDistanceKm));

      const res = await fetch(`/api/users/search?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Suche fehlgeschlagen.");
      me = data?.me || null;
      results = Array.isArray(data?.results) ? data.results : [];
      distanceInfo = data?.distanceInfo || null;
    } catch (e) {
      setError(e?.message || "Suche fehlgeschlagen.");
      results = [];
      distanceInfo = null;
    } finally {
      searchLoading = false;
    }
  }

  async function loadRequests() {
    if (!session?.userId) return;
    reqLoading = true;
    try {
      const res = await fetch("/api/friendRequests");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Anfragen konnten nicht geladen werden.");
      incoming = Array.isArray(data?.incoming) ? data.incoming : [];
      outgoing = Array.isArray(data?.outgoing) ? data.outgoing : [];
    } catch (e) {
      setError(e?.message || "Anfragen konnten nicht geladen werden.");
      incoming = [];
      outgoing = [];
    } finally {
      reqLoading = false;
    }
  }

  async function loadFriends() {
    if (!session?.userId) return;
    friendsLoading = true;
    try {
      const res = await fetch("/api/friends");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Freunde konnten nicht geladen werden.");
      friends = Array.isArray(data?.friends) ? data.friends : [];
    } catch (e) {
      setError(e?.message || "Freunde konnten nicht geladen werden.");
      friends = [];
    } finally {
      friendsLoading = false;
    }
  }

  async function loadBlocks() {
    if (!session?.userId) return;
    blockLoading = true;
    try {
      const res = await fetch("/api/blocks");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Blockliste konnte nicht geladen werden.");
      blocks = Array.isArray(data?.blocks) ? data.blocks : [];
    } catch (e) {
      setError(e?.message || "Blockliste konnte nicht geladen werden.");
      blocks = [];
    } finally {
      blockLoading = false;
    }
  }

  async function sendRequest(targetId) {
    setError("");
    reqLoading = true;
    try {
      const res = await fetch("/api/friendRequests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ toUserId: targetId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Anfrage konnte nicht gesendet werden.");
      await loadRequests();
      await loadSearch();
    } catch (e) {
      setError(e?.message || "Anfrage konnte nicht gesendet werden.");
    } finally {
      reqLoading = false;
    }
  }

  async function acceptRequest(id) {
    setError("");
    reqLoading = true;
    try {
      const res = await fetch(`/api/friendRequests/${id}/accept`, {
        method: "POST",
        headers: { ...csrfHeader() }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Anfrage konnte nicht angenommen werden.");
      await Promise.all([loadRequests(), loadFriends(), loadSearch()]);
    } catch (e) {
      setError(e?.message || "Anfrage konnte nicht angenommen werden.");
    } finally {
      reqLoading = false;
    }
  }

  async function declineRequest(id) {
    setError("");
    reqLoading = true;
    try {
      const res = await fetch(`/api/friendRequests/${id}/decline`, {
        method: "POST",
        headers: { ...csrfHeader() }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Anfrage konnte nicht abgelehnt werden.");
      await Promise.all([loadRequests(), loadSearch()]);
    } catch (e) {
      setError(e?.message || "Anfrage konnte nicht abgelehnt werden.");
    } finally {
      reqLoading = false;
    }
  }

  async function cancelRequest(id) {
    setError("");
    reqLoading = true;
    try {
      const res = await fetch(`/api/friendRequests/${id}/cancel`, {
        method: "POST",
        headers: { ...csrfHeader() }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Anfrage konnte nicht zurueckgezogen werden.");
      await Promise.all([loadRequests(), loadSearch()]);
    } catch (e) {
      setError(e?.message || "Anfrage konnte nicht zurueckgezogen werden.");
    } finally {
      reqLoading = false;
    }
  }

  async function removeFriend(targetId) {
    setError("");
    friendsLoading = true;
    try {
      const res = await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ targetUserId: targetId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Freund konnte nicht entfernt werden.");
      await Promise.all([loadFriends(), loadSearch()]);
    } catch (e) {
      setError(e?.message || "Freund konnte nicht entfernt werden.");
    } finally {
      friendsLoading = false;
    }
  }

  async function blockUser(targetId) {
    setError("");
    blockLoading = true;
    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ targetUserId: targetId, action: "block" })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Blocken fehlgeschlagen.");
      await Promise.all([loadBlocks(), loadFriends(), loadRequests(), loadSearch()]);
    } catch (e) {
      setError(e?.message || "Blocken fehlgeschlagen.");
    } finally {
      blockLoading = false;
    }
  }

  async function unblockUser(targetId) {
    setError("");
    blockLoading = true;
    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ targetUserId, action: "unblock" })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Unblocken fehlgeschlagen.");
      await Promise.all([loadBlocks(), loadSearch()]);
    } catch (e) {
      setError(e?.message || "Unblocken fehlgeschlagen.");
    } finally {
      blockLoading = false;
    }
  }

  function relationshipFor(user) {
    return user?.relationship || "none";
  }

  function isBlocked(userId) {
    return blocks.some((b) => String(b._id) === String(userId));
  }

  async function loadAll() {
    await Promise.all([loadSearch(), loadRequests(), loadFriends(), loadBlocks()]);
  }

  onMount(() => {
    const unsub = subscribeSession((s) => {
      session = s;
      if (s?.userId) loadAll();
      else {
        me = null;
        results = [];
        incoming = [];
        outgoing = [];
        friends = [];
        blocks = [];
        error = "";
      }
    });

    if (session?.userId) loadAll();
    return unsub;
  });
</script>

<div class="container py-4">
  <h1 class="mb-3">Gymbuddies</h1>

  {#if !isAuthenticated}
    <div class="alert alert-warning">
      Bitte melde dich an, um Gymbuddies zu verwalten.
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
      <h5 class="card-title mb-3">Suche</h5>
      <div class="row g-3">
        <div class="col-md-6">
            <label class="form-label" for="q">Name/E-Mail</label>
            <input id="q" class="form-control" placeholder="Name oder Email" bind:value={q} />
          </div>
          <div class="col-md-6">
            <label class="form-label" for="buddy">GymBuddy ID</label>
            <input id="buddy" class="form-control" placeholder="z.B. 734821" bind:value={buddyCodeFilter} />
          </div>
          <div class="col-md-6">
            <label class="form-label" for="gym">Gym</label>
            <input id="gym" class="form-control" placeholder="z.B. Activ" bind:value={gymFilter} />
          </div>
        <div class="col-md-6">
          <label class="form-label" for="level">Level</label>
          <select id="level" class="form-select" bind:value={levelFilter}>
            <option value="">Alle</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label" for="distance">Maximale Distanz (km)</label>
          <input
            id="distance"
            class="form-control"
            type="number"
            min="1"
            max="500"
            placeholder="z.B. 10"
            bind:value={maxDistanceKm}
          />
          <div class="form-text">
            Distanzfilter funktioniert nur, wenn du deine Adresse im Profil hinterlegt hast.
          </div>
          {#if distanceInfo?.ignoredReason === "missing-geo" && maxDistanceKm}
            <div class="text-warning small mt-1">Adresse fehlt – Distanzfilter wurde ignoriert.</div>
          {/if}
        </div>
      </div>
      <button class="btn btn-outline-primary mt-3" type="button" onclick={loadSearch} disabled={searchLoading}>
        Suchen
      </button>
    </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <h5 class="card-title mb-3">Gefundene Accounts</h5>
        {#if searchLoading}
          <div class="text-muted">Lade...</div>
        {:else if results.length === 0}
          <div class="text-muted">Keine passenden Buddies.</div>
        {:else}
          <div class="list-group">
            {#each results as u (u._id)}
              <div class="list-group-item d-flex justify-content-between align-items-start gap-3">
                <div class="flex-grow-1">
                  <div class="fw-semibold">{u.name || "Unbekannt"}</div>
                  <div class="text-muted">Gym: {u.gym || "n/a"} | Level: {u.trainingLevel || "n/a"}</div>
                  <div class="text-muted">
                    ID: {u.buddyCode || "n/a"} | Sichtbarkeit: {u.visibility}
                    {#if u.city || u.postalCode}
                      | {u.postalCode} {u.city}
                    {/if}
                    {#if typeof u.computedDistanceKm === "number"}
                      | Distanz: {u.computedDistanceKm} km
                    {:else}
                      | Distanz: unbekannt
                    {/if}
                  </div>
                </div>
                <div class="d-flex flex-column gap-2">
                  {#if isBlocked(u._id)}
                    <span class="badge text-bg-secondary">Geblockt</span>
                  {:else if relationshipFor(u) === "friend"}
                    <span class="badge text-bg-success">Freund</span>
                    <button class="btn btn-outline-danger btn-sm" type="button" onclick={() => removeFriend(u._id)} disabled={friendsLoading}>
                      Entfernen
                    </button>
                  {:else if relationshipFor(u) === "incoming"}
                    <div class="d-flex gap-2">
                      <button class="btn btn-success btn-sm" type="button" onclick={() => acceptRequest(incoming.find((r) => r.fromUserId === u._id)?._id)} disabled={reqLoading}>
                        Annehmen
                      </button>
                      <button class="btn btn-outline-danger btn-sm" type="button" onclick={() => declineRequest(incoming.find((r) => r.fromUserId === u._id)?._id)} disabled={reqLoading}>
                        Ablehnen
                      </button>
                    </div>
                  {:else if relationshipFor(u) === "outgoing"}
                    <button class="btn btn-outline-secondary btn-sm" type="button" onclick={() => cancelRequest(outgoing.find((r) => r.toUserId === u._id)?._id)} disabled={reqLoading}>
                      Anfrage zurueckziehen
                    </button>
                  {:else}
                    <div class="d-flex gap-2">
                      <button class="btn btn-outline-success btn-sm" type="button" onclick={() => sendRequest(u._id)} disabled={reqLoading}>
                        Freundschaftsanfrage
                      </button>
                      <button class="btn btn-outline-danger btn-sm" type="button" onclick={() => blockUser(u._id)} disabled={blockLoading}>
                        Blocken
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title m-0">Freundschaftsanfragen</h5>
          <button class="btn btn-outline-primary btn-sm" type="button" onclick={loadRequests} disabled={reqLoading}>Aktualisieren</button>
        </div>
        <div class="row g-3">
          <div class="col-md-6">
            <h6>Eingehend</h6>
            {#if reqLoading && incoming.length === 0}
              <div class="text-muted">Lade...</div>
            {:else if incoming.length === 0}
              <div class="text-muted">Keine eingehenden Anfragen.</div>
            {:else}
              <div class="list-group">
                {#each incoming as r (r._id)}
                  <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <div class="fw-semibold">{r.user?.name || r.fromUserId}</div>
                      <div class="text-muted small">ID: {r.user?.buddyCode || r.fromUserId}</div>
                    </div>
                    <div class="d-flex gap-2">
                      <button class="btn btn-success btn-sm" type="button" onclick={() => acceptRequest(r._id)} disabled={reqLoading}>Annehmen</button>
                      <button class="btn btn-outline-danger btn-sm" type="button" onclick={() => declineRequest(r._id)} disabled={reqLoading}>Ablehnen</button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
          <div class="col-md-6">
            <h6>Ausgehend</h6>
            {#if reqLoading && outgoing.length === 0}
              <div class="text-muted">Lade...</div>
            {:else if outgoing.length === 0}
              <div class="text-muted">Keine ausgehenden Anfragen.</div>
            {:else}
              <div class="list-group">
                {#each outgoing as r (r._id)}
                  <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <div class="fw-semibold">{r.user?.name || r.toUserId}</div>
                      <div class="text-muted small">ID: {r.user?.buddyCode || r.toUserId}</div>
                    </div>
                    <button class="btn btn-outline-secondary btn-sm" type="button" onclick={() => cancelRequest(r._id)} disabled={reqLoading}>
                      Anfrage zurueckziehen
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title m-0">Freunde</h5>
          <button class="btn btn-outline-primary btn-sm" type="button" onclick={loadFriends} disabled={friendsLoading}>Aktualisieren</button>
        </div>
        {#if friendsLoading && friends.length === 0}
          <div class="text-muted">Lade...</div>
        {:else if friends.length === 0}
          <div class="text-muted">Noch keine Freunde.</div>
        {:else}
          <div class="list-group">
            {#each friends as f (f._id)}
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <div class="fw-semibold">{f.name || f._id}</div>
                  <div class="text-muted small">ID: {f.buddyCode || "n/a"} | Gym: {f.gym || "n/a"}</div>
                </div>
                <div class="d-flex gap-2">
                  <button class="btn btn-outline-danger btn-sm" type="button" onclick={() => removeFriend(f._id)} disabled={friendsLoading}>Entfernen</button>
                  <button class="btn btn-outline-secondary btn-sm" type="button" onclick={() => blockUser(f._id)} disabled={blockLoading}>Blocken</button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title m-0">Blockierte Nutzer</h5>
          <button class="btn btn-outline-primary btn-sm" type="button" onclick={loadBlocks} disabled={blockLoading}>Aktualisieren</button>
        </div>
        {#if blockLoading && blocks.length === 0}
          <div class="text-muted">Lade...</div>
        {:else if blocks.length === 0}
          <div class="text-muted">Keine blockierten Nutzer.</div>
        {:else}
          <div class="list-group">
            {#each blocks as b (b._id)}
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <div class="fw-semibold">{b.name || b._id}</div>
                  <div class="text-muted small">ID: {b.buddyCode || "n/a"}</div>
                </div>
                <button class="btn btn-outline-secondary btn-sm" type="button" onclick={() => unblockUser(b._id)} disabled={blockLoading}>
                  Entsperren
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
