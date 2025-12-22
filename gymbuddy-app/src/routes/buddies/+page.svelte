<script>
  import { onMount } from "svelte";
  import { staticBuddies } from "$lib/buddies";

  const SESSION_KEY = "gymbuddy-session";

  let isAuthenticated = $state(false);
  let session = $state({ userId: "", email: "" });

  let gymFilter = $state("");
  let levelFilter = $state("");
  let idSearch = $state("");
  let distanceFilter = $state("");

  let buddies = $state([]); // echte + demos
  let error = $state("");

  let demoFriends = $state([]); // IDs der Demo-Buddies, mit denen man "befreundet" ist
  let selectedBuddy = $state(null); // für "Profil ansehen"

  onMount(async () => {
    const s = localStorage.getItem(SESSION_KEY);
    if (!s) {
      isAuthenticated = false;
      return;
    }

    try {
      session = JSON.parse(s);
      isAuthenticated = !!session?.userId;
      if (!isAuthenticated) return;

      await loadBuddies();
    } catch (err) {
      console.error(err);
      isAuthenticated = false;
    }
  });

  async function loadBuddies() {
    error = "";
    try {
      const res = await fetch(`/api/buddies?userId=${session.userId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Buddies konnten nicht geladen werden.");
      }

      const demo = staticBuddies.map((d) => ({
        ...d,
        isDemo: true,
        relationship: demoFriends.includes(d.id) ? "friends" : "none",
        isSelf: false
      }));

      const combined = [...data, ...demo];

      combined.sort((a, b) => {
        if (a.isSelf && !b.isSelf) return -1;
        if (!a.isSelf && b.isSelf) return 1;
        return a.name.localeCompare(b.name);
      });

      buddies = combined;
    } catch (err) {
      console.error(err);
      error = err.message || "Unbekannter Fehler beim Laden der Buddies.";
    }
  }

  function filteredAndSortedBuddies() {
    const gyms = gymFilter
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const maxDistance = distanceFilter ? Number(distanceFilter) : null;

    const list = buddies.filter((b) => {
      const gymLower = (b.gym || "").toLowerCase();
      const matchesGym = gyms.length === 0 || gyms.some((g) => gymLower.includes(g));

      const matchesLevel = !levelFilter || levelFilter === "Alle" || b.level === levelFilter;

      const matchesId =
        !idSearch || String(b.code || b.gymBuddyId || b.buddyCode || "").includes(idSearch);

      const matchesDistance =
        !maxDistance ||
        (b.distanceKm != null && b.distanceKm <= maxDistance);

      return matchesGym && matchesLevel && matchesId && matchesDistance;
    });

    return list.sort((a, b) => {
      if (a.isSelf && !b.isSelf) return -1;
      if (!a.isSelf && b.isSelf) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  function incomingRequests() {
    return buddies.filter((b) => b.relationship === "incoming");
  }

  async function sendFriendRequest(buddy) {
    if (buddy.isDemo) {
      if (!demoFriends.includes(buddy.id)) {
        demoFriends = [...demoFriends, buddy.id];
        await loadBuddies();
      }
      return;
    }

    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: session.userId,
          toUserId: buddy.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Anfrage konnte nicht gesendet werden.");
      }
      await loadBuddies();
    } catch (err) {
      console.error(err);
      error = err.message || "Fehler beim Senden der Anfrage.";
    }
  }

  async function acceptRequest(buddy) {
    try {
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentUserId: session.userId,
          otherUserId: buddy.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Anfrage konnte nicht akzeptiert werden.");
      }
      await loadBuddies();
    } catch (err) {
      console.error(err);
      error = err.message || "Fehler beim Akzeptieren der Anfrage.";
    }
  }

  async function declineRequest(buddy) {
    try {
      const res = await fetch("/api/friends/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentUserId: session.userId,
          otherUserId: buddy.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Anfrage konnte nicht abgelehnt werden.");
      }
      await loadBuddies();
    } catch (err) {
      console.error(err);
      error = err.message || "Fehler beim Ablehnen der Anfrage.";
    }
  }

  async function cancelOutgoingRequest(buddy) {
    if (buddy.isDemo) {
      return;
    }

    try {
      const res = await fetch("/api/friends/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: session.userId,
          toUserId: buddy.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Anfrage konnte nicht zurückgezogen werden.");
      }
      await loadBuddies();
    } catch (err) {
      console.error(err);
      error = err.message || "Fehler beim Zurückziehen der Anfrage.";
    }
  }

  async function removeFriend(buddy) {
    if (buddy.isDemo) {
      demoFriends =
        demoFriends.filter((id) => id !== buddy.id);

      await loadBuddies();
      return;
    }

    try {
      const res = await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentUserId: session.userId,
          otherUserId: buddy.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Freundschaft konnte nicht entfernt werden.");
      }
      await loadBuddies();
    } catch (err) {
      console.error(err);
      error = err.message || "Fehler beim Entfernen der Freundschaft.";
    }
  }

  function openProfile(buddy) {
    selectedBuddy = buddy;
  }

  function closeProfile() {
    selectedBuddy = null;
  }

  function formatDistance(buddy) {
    if (buddy.distanceKm == null) return "";
    return `${buddy.distanceKm} km`;
  }
</script>

{#if !isAuthenticated}
  <div class="container py-4">
    <div class="alert alert-warning">
      Du musst eingeloggt sein, um GymBuddies zu sehen.
    </div>
  </div>
{:else}
  <div class="container py-4">
    <h1 class="mb-3">Gymbuddies entdecken</h1>

    {#if error}
      <div class="alert alert-danger">{error}</div>
    {/if}

    <div class="row g-3 mb-4">
      <div class="col-md-6">
        <label class="form-label">Nach Gym filtern</label>
        <input
          class="form-control"
          placeholder="z.B. Activ, Fitnesspark"
          bind:value={gymFilter}
        />
        <div class="form-text">Mehrere Gyms durch Komma trennen.</div>
      </div>

      <div class="col-md-6">
        <label class="form-label">Nach Level filtern</label>
        <select class="form-select" bind:value={levelFilter}>
          <option value="">Alle</option>
          <option value="beginner">beginner</option>
          <option value="intermediate">intermediate</option>
          <option value="advanced">advanced</option>
        </select>
      </div>

      <div class="col-md-6">
        <label class="form-label">Nach GymBuddy ID suchen</label>
        <input
          class="form-control"
          placeholder="z.B. 734821"
          bind:value={idSearch}
        />
      </div>

      <div class="col-md-6">
        <label class="form-label">Maximale Distanz (km)</label>
        <input
          class="form-control"
          placeholder="z.B. 5"
          bind:value={distanceFilter}
        />
      </div>
    </div>

    {#if incomingRequests().length > 0}
      <div class="card mb-4">
        <div class="card-body">
          <h5 class="card-title mb-3">Offene Anfragen</h5>

          <div class="list-group">
            {#each incomingRequests() as req (req.id)}
              <div class="list-group-item d-flex align-items-center justify-content-between">
                <div>
                  <div class="fw-bold">{req.name}</div>
                  <div class="small text-muted">
                    {req.gym}
                    {#if formatDistance(req)} • {formatDistance(req)}{/if}
                  </div>
                </div>

                <div class="btn-group btn-group-sm">
                  <button
                    type="button"
                    class="btn btn-success"
                    onclick={() => acceptRequest(req)}
                  >
                    Annehmen
                  </button>

                  <button
                    type="button"
                    class="btn btn-outline-danger"
                    onclick={() => declineRequest(req)}
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <div class="card shadow-sm">
      <div class="card-body p-0">
        <div class="list-group list-group-flush">
          {#each filteredAndSortedBuddies() as b (b.id)}
            <div class="list-group-item d-flex align-items-center justify-content-between">
              <div>
                <div class="fw-bold">
                  {#if b.isSelf}
                    Du
                  {:else}
                    {b.name}
                  {/if}
                  {#if b.gym} – {b.gym}{/if}
                </div>

                <div class="small text-muted">
                  Level {b.level}
                  {#if b.goals} · Fokus: {b.goals}{/if}
                </div>

                {#if b.code}
                  <div class="small text-muted">ID: {b.code}</div>
                {/if}

                {#if formatDistance(b)}
                  <div class="small text-muted">Distanz: {formatDistance(b)}</div>
                {/if}
              </div>

              <div class="d-flex gap-2 align-items-center">
                {#if b.isSelf}
                  <span class="badge bg-primary">Du</span>
                {:else if b.relationship === "friends"}
                  <button
                    type="button"
                    class="btn btn-success btn-sm"
                    onclick={() => removeFriend(b)}
                  >
                    Verbunden – Verbindung lösen
                  </button>
                {:else if b.relationship === "outgoing"}
                  <button
                    type="button"
                    class="btn btn-outline-secondary btn-sm"
                    onclick={() => cancelOutgoingRequest(b)}
                  >
                    Anfrage zurückziehen
                  </button>
                {:else if b.relationship === "incoming"}
                  <button
                    type="button"
                    class="btn btn-outline-primary btn-sm"
                    onclick={() => openProfile(b)}
                  >
                    Anfrage offen
                  </button>
                {:else}
                  <button
                    type="button"
                    class="btn btn-outline-success btn-sm"
                    onclick={() => sendFriendRequest(b)}
                  >
                    Freundschaftsanfrage
                  </button>
                {/if}

                <button
                  type="button"
                  class="btn btn-outline-primary btn-sm"
                  onclick={() => openProfile(b)}
                >
                  Profil ansehen
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    {#if selectedBuddy}
      <div class="card mt-4 shadow-sm">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <h5 class="card-title mb-3">
              {selectedBuddy.isSelf ? "Dein Profil" : selectedBuddy.name}
              {#if selectedBuddy.gym} – {selectedBuddy.gym}{/if}
            </h5>

            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              onclick={closeProfile}
            >
              Schliessen
            </button>
          </div>

          <p class="card-text mb-1">
            <strong>Level:</strong> {selectedBuddy.level}
          </p>

          {#if selectedBuddy.code}
            <p class="card-text mb-1">
              <strong>ID:</strong> {selectedBuddy.code}
            </p>
          {/if}

          {#if selectedBuddy.goals}
            <p class="card-text mb-1">
              <strong>Ziele:</strong> {selectedBuddy.goals}
            </p>
          {/if}

          {#if selectedBuddy.trainingTimes}
            <p class="card-text mb-1">
              <strong>Trainingszeiten:</strong> {selectedBuddy.trainingTimes}
            </p>
          {/if}

          {#if selectedBuddy.contact}
            <p class="card-text mb-1">
              <strong>Kontakt:</strong> {selectedBuddy.contact}
            </p>
          {/if}

          {#if !selectedBuddy.isSelf && selectedBuddy.relationship !== "friends"}
            <div class="alert alert-info mt-3 mb-0">
              Du siehst nur das vollständige Profil, wenn ihr verbunden seid.
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}
