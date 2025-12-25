<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { readSession, subscribeSession, csrfHeader } from "$lib/session.js";

  let session = $state(readSession());
  let isAuthenticated = $derived(!!session?.userId);

  let loading = $state(false);
  let error = $state("");

  let trainings = $state([]);

  let date = $state(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  let withBuddy = $state(false);
  let buddyName = $state("");
  let notes = $state("");

  let xp = $state(0);
  let level = $state(1);
  let trainingsCount = $state(0);

  function setError(msg) {
    error = msg || "";
  }

  async function loadTrainings() {
    setError("");
    loading = true;

    try {
      const res = await fetch("/api/trainings");
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Fehler beim Laden der Trainings.");

      trainings = Array.isArray(data?.trainings) ? data.trainings : Array.isArray(data) ? data : [];

      const summary = data?.summary ?? {};

      if (typeof data?.xp === "number") xp = data.xp;
      else if (typeof summary?.xp === "number") xp = summary.xp;

      if (typeof data?.level === "number") level = data.level;
      else if (typeof summary?.level === "number") level = summary.level;

      if (typeof data?.trainingsCount === "number") trainingsCount = data.trainingsCount;
      else if (typeof summary?.trainingsCount === "number") trainingsCount = summary.trainingsCount;
    } catch (e) {
      setError(e?.message || "Fehler beim Laden der Trainings.");
      trainings = [];
      xp = 0;
      level = 1;
      trainingsCount = 0;
    } finally {
      loading = false;
    }
  }

  async function saveTraining() {
    setError("");
    loading = true;

    try {
      const payload = {
        date,
        withBuddy,
        buddyName: withBuddy ? buddyName : "",
        notes
      };

      const res = await fetch("/api/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Training konnte nicht gespeichert werden.");

      date = (() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      })();
      withBuddy = false;
      buddyName = "";
      notes = "";

      xp = data?.xp ?? xp;
      level = data?.level ?? level;
      trainingsCount = data?.trainingsCount ?? trainingsCount;

      await loadTrainings();
    } catch (e) {
      setError(e?.message || "Training konnte nicht gespeichert werden.");
    } finally {
      loading = false;
    }
  }

  async function deleteTraining(id) {
    const ok = confirm("Training wirklich loeschen?");
    if (!ok) return;

    setError("");
    loading = true;

    try {
      const res = await fetch(`/api/trainings/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { ...csrfHeader() }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Training konnte nicht geloescht werden.");

      xp = data?.xp ?? xp;
      level = data?.level ?? level;
      trainingsCount = data?.trainingsCount ?? trainingsCount;

      await loadTrainings();
    } catch (e) {
      setError(e?.message || "Training konnte nicht geloescht werden.");
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const unsub = subscribeSession((s) => {
      session = s;
      if (s?.userId) loadTrainings();
      else {
        trainings = [];
        xp = 0;
        level = 1;
        trainingsCount = 0;
        error = "";
      }
    });

    if (session?.userId) loadTrainings();

    return unsub;
  });
</script>

<div class="container py-4">
  <h1 class="mb-3">Trainings erfassen</h1>

  {#if !isAuthenticated}
    <div class="alert alert-warning">
      Bitte melde dich an, um Trainings zu erfassen und XP zu sammeln.
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
        <div class="row g-3 align-items-end">
          <div class="col-md-4">
            <label class="form-label" for="trainingDate">Datum</label>
            <input id="trainingDate" class="form-control" type="date" bind:value={date} />
          </div>

          <div class="col-md-4">
            <label class="form-label" for="withBuddyToggle">Training mit Buddy?</label>
            <div class="form-check form-switch">
              <input
                id="withBuddyToggle"
                class="form-check-input"
                type="checkbox"
                role="switch"
                bind:checked={withBuddy}
              />
              <label class="form-check-label" for="withBuddyToggle">Ja, Training mit GymBuddy</label>
            </div>
          </div>

          <div class="col-md-4">
            <label class="form-label" for="buddyName">Buddy Name</label>
            <input
              id="buddyName"
              class="form-control"
              placeholder="z.B. Andrin"
              bind:value={buddyName}
              disabled={!withBuddy}
            />
          </div>

          <div class="col-12">
            <label class="form-label" for="notes">Notizen (optional)</label>
            <textarea
              id="notes"
              class="form-control"
              rows="3"
              placeholder="z.B. PR im Kreuzheben, Technik verbessert..."
              bind:value={notes}
            ></textarea>
          </div>

          <div class="col-12">
            <button class="btn btn-primary" type="button" onclick={saveTraining} disabled={loading}>
              Training speichern
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-lg-4">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title mb-3">Dein Fortschritt</h5>
            <div><strong>Level:</strong> {level}</div>
            <div><strong>XP:</strong> {xp}</div>
            <div><strong>Trainings gesamt:</strong> {trainingsCount}</div>
            <div class="text-muted mt-2">
              10 XP pro Training allein, 20 XP mit Buddy, 30 XP fuer Profil.
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-8">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title mb-3">Letzte Trainings</h5>

            {#if loading && trainings.length === 0}
              <div class="text-muted">Lade...</div>
            {:else if trainings.length === 0}
              <div class="text-muted">Noch keine Trainings erfasst.</div>
            {:else}
              <div class="list-group">
                {#each trainings as t (t._id || t.id)}
                  <div class="list-group-item d-flex justify-content-between align-items-start gap-3">
                    <div class="flex-grow-1">
                      <div class="fw-semibold">
                        {t.date || ""}
                        {#if t.withBuddy}
                          <span class="badge text-bg-success ms-2">mit Buddy</span>
                        {:else}
                          <span class="badge text-bg-secondary ms-2">allein</span>
                        {/if}
                      </div>

                      {#if t.buddyName}
                        <div class="text-muted">Buddy: {t.buddyName}</div>
                      {/if}

                      {#if t.notes}
                        <div class="mt-2">{t.notes}</div>
                      {/if}
                    </div>

                    <button
                      class="btn btn-outline-danger btn-sm"
                      type="button"
                      onclick={() => deleteTraining(t._id || t.id)}
                      disabled={loading}
                    >
                      Loeschen
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
