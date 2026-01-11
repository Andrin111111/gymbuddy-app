<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { readSession, subscribeSession, csrfHeader } from "$lib/session.js";

  let session = $state(readSession());
  let sessionReady = $state(false);
  let isAuthenticated = $derived(sessionReady && !!session?.userId);

  let searchLoading = $state(false);
  let reqLoading = $state(false);
  let friendsLoading = $state(false);
  let blockLoading = $state(false);
  let searchError = $state("");
  let requestsError = $state("");
  let friendsError = $state("");
  let blocksError = $state("");
  let hasSearched = $state(false);

  function setError(msg) {
    const text = msg || "";
    requestsError = text;
    friendsError = text;
    blocksError = text;
  }

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

  async function parseJsonSafe(res) {
    try {
      return await res.json();
    } catch {
      try {
        const txt = await res.text();
        return { error: txt };
      } catch {
        return {};
      }
    }
  }

  async function csrfHeaders(extra = {}) {
    let headers = { ...extra, ...csrfHeader() };
    if (!headers["x-csrf-token"]) {
      try {
        await fetch("/api/auth/me");
      } catch {}
      headers = { ...extra, ...csrfHeader() };
    }
    return headers;
  }


  async function loadSearch() {
    if (!session?.userId) return;
    hasSearched = true;
    searchError = "";
    searchLoading = true;
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const code = buddyCodeFilter.trim();
      if (code) {
        params.set("buddyCode", code);
      }
      if (gymFilter.trim()) params.set("gym", gymFilter.trim());
      if (levelFilter) params.set("level", levelFilter);

      const res = await fetch(`/api/users/search?${params.toString()}`);
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || `Suche fehlgeschlagen (Status ${res.status}).`);
      me = data?.me || null;
      results = Array.isArray(data?.results) ? data.results : [];
    } catch (e) {
      searchError = e?.message || "Suche fehlgeschlagen.";
      results = [];
    } finally {
      searchLoading = false;
    }
  }

  async function loadRequests() {
    if (!session?.userId) return;
    reqLoading = true;
    requestsError = "";
    try {
      const res = await fetch("/api/friendRequests");
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || "Anfragen konnten nicht geladen werden.");
      incoming = Array.isArray(data?.incoming) ? data.incoming : [];
      outgoing = Array.isArray(data?.outgoing) ? data.outgoing : [];
    } catch (e) {
      requestsError = e?.message || "Anfragen konnten nicht geladen werden.";
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
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || "Freunde konnten nicht geladen werden.");
      friends = Array.isArray(data?.friends) ? data.friends : [];
    } catch (e) {
      friendsError = e?.message || "Freunde konnten nicht geladen werden.";
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
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || "Blockliste konnte nicht geladen werden.");
      blocks = Array.isArray(data?.blocks) ? data.blocks : [];
    } catch (e) {
      blocksError = e?.message || "Blockliste konnte nicht geladen werden.";
      blocks = [];
    } finally {
      blockLoading = false;
    }
  }

  async function sendRequest(targetId) {
    setError("");
    reqLoading = true;
    try {
      const headers = await csrfHeaders({ "Content-Type": "application/json" });
      const res = await fetch("/api/friendRequests", {
        method: "POST",
        headers,
        body: JSON.stringify({ toUserId: targetId })
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || `Anfrage konnte nicht gesendet werden (Status ${res.status}).`);
      await loadRequests();
      await refreshSearchIfNeeded();
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
      const headers = await csrfHeaders();
      const res = await fetch(`/api/friendRequests/${id}/accept`, {
        method: "POST",
        headers
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || `Anfrage konnte nicht angenommen werden (Status ${res.status}).`);
      const tasks = [loadRequests(), loadFriends()];
      if (hasSearched) tasks.push(loadSearch());
      await Promise.all(tasks);
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
      const headers = await csrfHeaders();
      const res = await fetch(`/api/friendRequests/${id}/decline`, {
        method: "POST",
        headers
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || `Anfrage konnte nicht abgelehnt werden (Status ${res.status}).`);
      const tasks = [loadRequests()];
      if (hasSearched) tasks.push(loadSearch());
      await Promise.all(tasks);
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
      const headers = await csrfHeaders();
      const res = await fetch(`/api/friendRequests/${id}/cancel`, {
        method: "POST",
        headers
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || "Anfrage konnte nicht zurückgezogen werden.");
      const tasks = [loadRequests()];
      if (hasSearched) tasks.push(loadSearch());
      await Promise.all(tasks);
    } catch (e) {
      setError(e?.message || "Anfrage konnte nicht zurückgezogen werden.");
    } finally {
      reqLoading = false;
    }
  }

  async function removeFriend(targetId) {
    setError("");
    friendsLoading = true;
    try {
      const headers = await csrfHeaders({ "Content-Type": "application/json" });
      const res = await fetch("/api/friends/remove", {
        method: "POST",
        headers,
        body: JSON.stringify({ targetUserId: targetId })
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || `Freund konnte nicht entfernt werden (Status ${res.status}).`);
      const tasks = [loadFriends()];
      if (hasSearched) tasks.push(loadSearch());
      await Promise.all(tasks);
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
      const headers = await csrfHeaders({ "Content-Type": "application/json" });
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers,
        body: JSON.stringify({ targetUserId: targetId, action: "block" })
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || `Blocken fehlgeschlagen (Status ${res.status}).`);
      const tasks = [loadBlocks(), loadFriends(), loadRequests()];
      if (hasSearched) tasks.push(loadSearch());
      await Promise.all(tasks);
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
      const headers = await csrfHeaders({ "Content-Type": "application/json" });
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers,
        body: JSON.stringify({ targetUserId: targetId, action: "unblock" })
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || `Entsperren fehlgeschlagen (Status ${res.status}).`);
      const tasks = [loadBlocks()];
      if (hasSearched) tasks.push(loadSearch());
      await Promise.all(tasks);
    } catch (e) {
      setError(e?.message || "Entsperren fehlgeschlagen.");
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

  async function refreshSearchIfNeeded() {
    if (!hasSearched) return;
    await loadSearch();
  }

  async function loadAll() {
    await Promise.all([loadRequests(), loadFriends(), loadBlocks()]);
  }

  onMount(() => {
    const unsub = subscribeSession((s, ready) => {
      session = s;
      sessionReady = ready;
      if (ready && s?.userId) {
        loadAll();
      } else if (ready && !s?.userId) {
        me = null;
        results = [];
        incoming = [];
        outgoing = [];
        friends = [];
        blocks = [];
        hasSearched = false;
      }
    });

    if (session?.userId) loadAll();
    return unsub;
  });
</script>

<div class="page-shell py-3">
  <div class="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-2 mb-3">
    <div>
      <h1 class="mb-1">Gymbuddies</h1>
      <p class="muted-subtitle mb-0">Suche, Anfragen, Freunde und Blockliste im Überblick.</p>
    </div>
  </div>

  {#if !sessionReady}
    <div class="alert alert-info">Lade Session...</div>
  {:else if !isAuthenticated}
    <div class="card shadow-soft">
      <div class="card-body p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h5 class="mb-1">Bitte anmelden</h5>
          <p class="text-muted mb-0">Melde dich an, um Gymbuddies zu verwalten.</p>
        </div>
        <button class="btn btn-primary" type="button" onclick={() => goto("/profile")}>
          Zur Anmeldung
        </button>
      </div>
    </div>
  {:else}
    <div class="card shadow-soft mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <div class="section-title mb-1">Suche</div>
            <div class="muted-subtitle">Filtere nach Name, Gym oder Trainingslevel.</div>
          </div>
          <button class="btn btn-outline-primary btn-sm" type="button" onclick={loadSearch} disabled={searchLoading}>
            Suchen
          </button>
        </div>
        {#if searchError}
          <div class="alert alert-danger mb-2">{searchError}</div>
        {/if}
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
            <label class="form-label" for="level">Trainingslevel</label>
            <select id="level" class="form-select" bind:value={levelFilter}>
              <option value="">Alle</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="card shadow-soft mb-3">
      <div class="card-body">
        <div class="section-title mb-3">Gefundene Accounts</div>
        {#if searchLoading}
          <div class="skeleton" style="height: 110px;"></div>
        {:else if !hasSearched}
          <div class="empty-state">Noch keine Suche ausgeführt.</div>
        {:else if results.length === 0}
          <div class="empty-state">Keine passenden Buddies.</div>
        {:else}
          <div class="list-group">
            {#each results as u (u._id)}
              <div class="list-group-item d-flex justify-content-between align-items-start gap-3">
                <div class="flex-grow-1">
                  <div class="fw-semibold">{u.name || "Unbekannt"}</div>
                  <div class="text-muted small">Gym: {u.gym || "n/a"} | Trainingslevel: {u.trainingLevel || "n/a"}</div>
                  <div class="text-muted small">
                    ID: {u.buddyCode || "n/a"} | Sichtbarkeit: {u.visibility}
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
                      Anfrage zurückziehen
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

    <div class="card shadow-soft mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="section-title m-0">Freundschaftsanfragen</div>
          <button class="btn btn-outline-primary btn-sm" type="button" onclick={loadRequests} disabled={reqLoading}>Aktualisieren</button>
        </div>
        {#if requestsError}
          <div class="alert alert-warning mb-2">{requestsError}</div>
        {/if}
        <div class="row g-3">
          <div class="col-md-6">
            <h6>Eingehend</h6>
            {#if reqLoading && incoming.length === 0}
              <div class="text-muted">Lade...</div>
            {:else if incoming.length === 0}
              <div class="empty-state">Keine eingehenden Anfragen.</div>
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
              <div class="empty-state">Keine ausgehenden Anfragen.</div>
            {:else}
              <div class="list-group">
                {#each outgoing as r (r._id)}
                  <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <div class="fw-semibold">{r.user?.name || r.toUserId}</div>
                      <div class="text-muted small">ID: {r.user?.buddyCode || r.toUserId}</div>
                    </div>
                    <button class="btn btn-outline-secondary btn-sm" type="button" onclick={() => cancelRequest(r._id)} disabled={reqLoading}>
                      Anfrage zurückziehen
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <div class="card shadow-soft mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title m-0">Freunde</h5>
          <button class="btn btn-outline-primary btn-sm" type="button" onclick={loadFriends} disabled={friendsLoading}>Aktualisieren</button>
        </div>
        {#if friendsError}
          <div class="alert alert-warning mb-2">{friendsError}</div>
        {/if}
        {#if friendsLoading && friends.length === 0}
          <div class="text-muted">Lade...</div>
        {:else if friends.length === 0}
          <div class="empty-state">Noch keine Freunde.</div>
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

    <div class="card shadow-soft">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title m-0">Blockierte Nutzer</h5>
          <button class="btn btn-outline-primary btn-sm" type="button" onclick={loadBlocks} disabled={blockLoading}>Aktualisieren</button>
        </div>
        {#if blocksError}
          <div class="alert alert-warning mb-2">{blocksError}</div>
        {/if}
        {#if blockLoading && blocks.length === 0}
          <div class="text-muted">Lade...</div>
        {:else if blocks.length === 0}
          <div class="empty-state">Keine blockierten Nutzer.</div>
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
