<script>
  import { onMount } from "svelte";
  import { calculateUserStats } from "$lib/gamification";

  const PROFILE_KEY = "gymbuddy-profile";
  const SESSION_KEY = "gymbuddy-session";

  let trainings = $state([]);
  let profile = $state(null);
  let stats = $state({
    soloCount: 0,
    buddyCount: 0,
    xp: 0,
    level: 1
  });

  let form = $state({
    date: new Date().toISOString().slice(0, 10),
    withBuddy: false,
    buddyName: "",
    notes: ""
  });

  let isAuthenticated = $state(false);
  let loading = $state(false);
  let error = $state("");

  function updateStats() {
    stats = calculateUserStats(trainings, profile);
  }

  async function loadTrainings() {
    loading = true;
    error = "";
    try {
      const res = await fetch("/api/trainings");
      if (!res.ok) {
        throw new Error("Fehler beim Laden der Trainings.");
      }
      const data = await res.json();
      trainings = data;
      updateStats();
    } catch (err) {
      console.error(err);
      error = err.message || "Unbekannter Fehler beim Laden der Trainings.";
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    isAuthenticated = !!savedSession;

    const savedProfile = localStorage.getItem(PROFILE_KEY);
    profile = savedProfile ? JSON.parse(savedProfile) : null;

    if (isAuthenticated) {
      loadTrainings();
    }
  });

  async function handleSubmit(event) {
    event.preventDefault();
    error = "";

    const payload = {
      date: form.date,
      withBuddy: form.withBuddy,
      buddyName: form.withBuddy ? form.buddyName : "",
      notes: form.notes
    };

    try {
      const res = await fetch("/api/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let body;
        try {
          body = await res.json();
        } catch {
          body = {};
        }
        throw new Error(body.error || "Fehler beim Speichern des Trainings.");
      }

      const created = await res.json();
      trainings = [created, ...trainings];
      updateStats();

      form = {
        date: new Date().toISOString().slice(0, 10),
        withBuddy: false,
        buddyName: "",
        notes: ""
      };
    } catch (err) {
      console.error(err);
      error = err.message || "Unbekannter Fehler beim Speichern.";
    }
  }

  async function deleteTraining(id) {
    error = "";

    try {
      const res = await fetch(`/api/trainings/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        throw new Error("Fehler beim Löschen des Trainings.");
      }
      trainings = trainings.filter((t) => t.id !== id);
      updateStats();
    } catch (err) {
      console.error(err);
      error = err.message || "Unbekannter Fehler beim Löschen.";
    }
  }
</script>

<h1>Trainings erfassen</h1>

{#if !isAuthenticated}
  <div class="alert alert-warning mt-3">
    Bitte melde dich an, um Trainings zu erfassen und XP zu sammeln.
  </div>
  <a href="/profile" class="btn btn-primary mt-2">Zur Anmeldung</a>
{:else}
  {#if error}
    <div class="alert alert-danger mt-3">
      {error}
    </div>
  {/if}

  <form class="mt-3" onsubmit={handleSubmit}>
    <div class="row g-3">
      <div class="col-md-4">
        <label class="form-label" for="date">Datum</label>
        <input
          id="date"
          type="date"
          class="form-control"
          bind:value={form.date}
          required
        />
      </div>

      <div class="col-md-4">
        <p class="form-label d-block mb-1">Training mit Buddy?</p>
        <div class="form-check form-switch">
          <input
            class="form-check-input"
            type="checkbox"
            id="withBuddy"
            bind:checked={form.withBuddy}
          />
          <label class="form-check-label" for="withBuddy">
            Ja, Training mit GymBuddy
          </label>
        </div>
      </div>

      {#if form.withBuddy}
        <div class="col-md-4">
          <label class="form-label" for="buddyName">Name des Buddies</label>
          <input
            id="buddyName"
            type="text"
            class="form-control"
            placeholder="z.B. Lena"
            bind:value={form.buddyName}
            required
          />
        </div>
      {/if}

      <div class="col-12">
        <label class="form-label" for="notes">Notizen (optional)</label>
        <textarea
          id="notes"
          class="form-control"
          rows="2"
          placeholder="z.B. PR im Kreuzheben, Technik verbessert..."
          bind:value={form.notes}
        ></textarea>
      </div>
    </div>

    <button type="submit" class="btn btn-primary mt-3">
      Training speichern
    </button>
  </form>

  <div class="row mt-4 g-3">
    <div class="col-md-4">
      <div class="card shadow-sm">
        <div class="card-body">
          <h5 class="card-title">Dein Fortschritt</h5>
          <p class="mb-1"><strong>Level:</strong> {stats.level}</p>
          <p class="mb-1"><strong>XP:</strong> {stats.xp}</p>
          <p class="mb-1">
            <strong>Trainings gesamt:</strong> {stats.soloCount + stats.buddyCount}
          </p>
          <p class="mb-0 text-muted small">
            10 XP pro Training allein, 20 XP mit Buddy, 30 XP für Profil.
          </p>
        </div>
      </div>
    </div>

    <div class="col-md-8">
      <h2 class="h5 mb-3">
        {#if loading}
          Trainings werden geladen...
        {:else}
          Letzte Trainings
        {/if}
      </h2>

      {#if loading}
        <p class="text-muted">Bitte warten...</p>
      {:else if trainings.length === 0}
        <p class="text-muted">Noch keine Trainings erfasst.</p>
      {:else}
        <ul class="list-group">
          {#each trainings as t}
            <li class="list-group-item d-flex justify-content-between align-items-start">
              <div>
                <div>
                  <strong>{t.date}</strong>
                  {#if t.withBuddy}
                    – mit {t.buddyName}
                  {:else}
                    – solo
                  {/if}
                </div>
                {#if t.notes}
                  <div class="text-muted small">{t.notes}</div>
                {/if}
              </div>
              <button
                type="button"
                class="btn btn-sm btn-outline-danger"
                onclick={() => deleteTraining(t.id)}
              >
                Löschen
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
{/if}

