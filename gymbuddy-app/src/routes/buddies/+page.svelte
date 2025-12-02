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
      const parsed = JSON.parse(s);
      if (parsed.userId && parsed.email) {
        session = parsed;
        isAuthenticated = true;
        await loadBuddies();
      } else {
        isAuthenticated = false;
      }
    } catch {
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
    const list = buddies.filter((b) => {
      const trimmedGym = gymFilter.trim().toLowerCase();
      let matchesGym = true;
      if (trimmedGym) {
        const gyms = trimmedGym
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean);
        if (gyms.length > 0) {
          matchesGym = gyms.some((g) => b.gym.toLowerCase().includes(g));
        }
      }

      const matchesLevel =
        !levelFilter || String(b.level) === String(levelFilter);

      const trimmedId = idSearch.trim().toLowerCase();
      const matchesId =
        !trimmedId ||
        (b.code && b.code.toString().toLowerCase() === trimmedId);

      const maxDistance = Number(distanceFilter);
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

  async function removeFriend(buddy) {
    if (buddy.isDemo) {
      demoFriends = demoFriends.filter((id) => id !== buddy.id);
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
</script>

<h1>Gymbuddies entdecken</h1>

{#if !isAuthenticated}
  <div class="alert alert-warning mt-3">
    Du musst angemeldet sein, um Gymbuddies zu sehen und Freundschaftsanfragen zu verschicken.
  </div>
  <a href="/profile" class="btn btn-primary mt-2">Zur Anmeldung</a>
{:else}
  {#if error}
    <div class="alert alert-danger mt-3">
      {error}
    </div>
  {/if}

  <!-- Ort zum Anfragen annehmen -->
  {#if incomingRequests().length > 0}
    <div class="card mt-3 border-primary">
      <div class="card-body">
        <h5 class="card-title">Offene Freundschaftsanfragen</h5>
        <ul class="list-group list-group-flush">
          {#each incomingRequests() as b}
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>{b.name}</strong> – {b.gym}
                <div class="text-muted small">
                  Level {b.level}{#if b.code} · ID: {b.code}{/if}
                </div>
              </div>
              <div class="btn-group btn-group-sm">
                <button
                  type="button"
                  class="btn btn-primary"
                  onclick={() => acceptRequest(b)}
                >
                  Annehmen
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  onclick={() => declineRequest(b)}
                >
                  Ablehnen
                </button>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}

  <!-- Filter -->
  <div class="row mt-3 g-3">
    <div class="col-md-6 col-lg-4">
      <p class="form-label mb-1">Nach Gym filtern</p>
      <input
        type="text"
        class="form-control"
        placeholder="z.B. Activ, Fitnesspark"
        bind:value={gymFilter}
      />
      <div class="form-text">
        Mehrere Gyms durch Komma trennen.
      </div>
    </div>

    <div class="col-md-6 col-lg-4">
      <p class="form-label mb-1">Nach Level filtern</p>
      <select
        class="form-select"
        bind:value={levelFilter}
      >
        <option value="">Alle</option>
        <option value="1">Level 1</option>
        <option value="2">Level 2</option>
        <option value="3">Level 3</option>
      </select>
    </div>
  </div>

  <div class="row mt-1 g-3">
    <div class="col-md-6 col-lg-4">
      <p class="form-label mb-1">Nach GymBuddy ID suchen</p>
      <input
        type="text"
        class="form-control"
        placeholder="z.B. 734821"
        bind:value={idSearch}
      />
    </div>

    <div class="col-md-6 col-lg-4">
      <p class="form-label mb-1">Maximale Distanz (km)</p>
      <input
        type="number"
        min="0"
        class="form-control"
        placeholder="z.B. 5"
        bind:value={distanceFilter}
      />
    </div>
  </div>

  <!-- Buddy-Liste -->
  <ul class="list-group mt-4">
    {#each filteredAndSortedBuddies() as b}
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <strong>{b.isSelf ? "Du" : b.name}</strong> – {b.gym}
          <div class="text-muted small">
            Level {b.level}{#if b.goals} · Fokus: {b.goals}{/if}
          </div>
          {#if b.code}
            <div class="text-muted small">
              ID: {b.code}
            </div>
          {/if}
        </div>

        <div class="d-flex gap-2 align-items-center">
          {#if b.isSelf}
            <span class="badge bg-primary">Du</span>
          {:else}
            {#if b.isDemo}
              {#if demoFriends.includes(b.id)}
                <button
                  type="button"
                  class="btn btn-success btn-sm"
                  onclick={() => removeFriend(b)}
                >
                  Verbunden – Verbindung lösen
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
            {:else}
              {#if b.relationship === "friends"}
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
                  disabled
                >
                  Anfrage gesendet
                </button>
              {:else if b.relationship === "incoming"}
                <div class="btn-group btn-group-sm">
                  <button
                    type="button"
                    class="btn btn-primary"
                    onclick={() => acceptRequest(b)}
                  >
                    Annehmen
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline-secondary"
                    onclick={() => declineRequest(b)}
                  >
                    Ablehnen
                  </button>
                </div>
              {:else}
                <button
                  type="button"
                  class="btn btn-outline-success btn-sm"
                  onclick={() => sendFriendRequest(b)}
                >
                  Freundschaftsanfrage
                </button>
              {/if}
            {/if}
          {/if}

          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            onclick={() => openProfile(b)}
          >
            Profil ansehen
          </button>
        </div>
      </li>
    {/each}

    {#if filteredAndSortedBuddies().length === 0}
      <li class="list-group-item text-muted">
        Keine Gymbuddies für diese Filter gefunden.
      </li>
    {/if}
  </ul>

  <!-- Detailansicht des ausgewählten Profils -->
  {#if selectedBuddy}
    <div class="card mt-4 shadow-sm">
      <div class="card-body">
        <h5 class="card-title">
          {selectedBuddy.isSelf ? "Dein Profil" : selectedBuddy.name}
          {#if selectedBuddy.gym} – {selectedBuddy.gym}{/if}
        </h5>
        <p class="card-text mb-1">
          <strong>Level:</strong> {selectedBuddy.level}
        </p>
        {#if selectedBuddy.goals}
          <p class="card-text mb-1">
            <strong>Ziele:</strong> {selectedBuddy.goals}
          </p>
        {/if}
        {#if selectedBuddy.trainingTimes}
          <p class="card-text mb-1">
            <strong>Bevorzugte Zeiten:</strong> {selectedBuddy.trainingTimes}
          </p>
        {/if}
        {#if selectedBuddy.contact}
          <p class="card-text mb-1">
            <strong>Kontakt:</strong> {selectedBuddy.contact}
          </p>
        {/if}
        {#if selectedBuddy.code}
          <p class="card-text mb-0">
            <strong>GymBuddy ID:</strong> {selectedBuddy.code}
          </p>
        {/if}
      </div>
    </div>
  {/if}
{/if}
