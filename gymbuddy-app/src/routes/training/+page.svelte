<script>
  import { onMount } from "svelte";
  import { readSession, onSessionChange } from "$lib/session.js";

  let session = $state(null);
  let isAuthenticated = $state(false);

  let trainings = $state([]);
  let summary = $state({ xp: 0, level: 1, trainingsCount: 0 });

  let loading = $state(false);
  let errorMsg = $state("");

  let form = $state({
    date: "",
    withBuddy: false,
    buddyName: "",
    notes: ""
  });

  async function loadTrainings(userId) {
    loading = true;
    errorMsg = "";

    try {
      const res = await fetch(`/api/trainings?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("Fehler beim Laden der Trainings.");
      const data = await res.json();
      trainings = Array.isArray(data?.trainings) ? data.trainings : [];
      summary = data?.summary ?? { xp: 0, level: 1, trainingsCount: 0 };
    } catch (e) {
      errorMsg = e?.message ?? "Fehler beim Laden der Trainings.";
      trainings = [];
      summary = { xp: 0, level: 1, trainingsCount: 0 };
    } finally {
      loading = false;
    }
  }

  async function saveTraining() {
    if (!session?.userId) return;

    errorMsg = "";

    try {
      const res = await fetch("/api/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.userId,
          date: form.date,
          withBuddy: form.withBuddy,
          buddyName: form.withBuddy ? form.buddyName : "",
          notes: form.notes
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Fehler beim Speichern.");

      if (data?.training) {
        trainings = [data.training, ...trainings];
      }

      if (data?.summary) summary = data.summary;

      form = { date: "", withBuddy: false, buddyName: "", notes: "" };
    } catch (e) {
      errorMsg = e?.message ?? "Fehler beim Speichern.";
    }
  }

  async function deleteTraining(id) {
    if (!session?.userId) return;

    errorMsg = "";

    try {
      const res = await fetch(`/api/trainings/${encodeURIComponent(id)}?userId=${encodeURIComponent(session.userId)}`, {
        method: "DELETE"
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Fehler beim Loeschen.");

      trainings = trainings.filter((t) => String(t._id) !== String(id));
      if (data?.summary) summary = data.summary;
    } catch (e) {
      errorMsg = e?.message ?? "Fehler beim Loeschen.";
    }
  }

  onMount(() => {
    session = readSession();
    isAuthenticated = !!session?.userId;

    if (session?.userId) loadTrainings(session.userId);

    const unsub = onSessionChange((s) => {
      session = s;
      isAuthenticated = !!s?.userId;
      if (s?.userId) loadTrainings(s.userId);
      else {
        trainings = [];
        summary = { xp: 0, level: 1, trainingsCount: 0 };
      }
    });

    return () => unsub();
  });
</script>

<h1 class="mb-3">Trainings erfassen</h1>

{#if !isAuthenticated}
  <div class="alert alert-warning">
    Bitte melde dich an, um Trainings zu erfassen und XP zu sammeln.
  </div>
  <a class="btn btn-primary" href="/profile">Zur Anmeldung</a>
{:else}
  {#if errorMsg}
    <div class="alert alert-danger">{errorMsg}</div>
  {/if}

  <div class="row g-4">
    <div class="col-lg-7">
      <div class="card p-3">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label" for="t-date">Datum</label>
            <input id="t-date" class="form-control" type="date" bind:value={form.date} />
          </div>

          <div class="col-md-6 d-flex align-items-end">
            <div class="form-check form-switch">
              <input id="t-buddy" class="form-check-input" type="checkbox" bind:checked={form.withBuddy} />
              <label class="form-check-label" for="t-buddy">Training mit Buddy?</label>
            </div>
          </div>

          {#if form.withBuddy}
            <div class="col-md-12">
              <label class="form-label" for="t-buddyName">Buddy Name</label>
              <input id="t-buddyName" class="form-control" bind:value={form.buddyName} />
            </div>
          {/if}

          <div class="col-12">
            <label class="form-label" for="t-notes">Notizen (optional)</label>
            <textarea id="t-notes" class="form-control" rows="3" bind:value={form.notes}></textarea>
          </div>

          <div class="col-12">
            <button class="btn btn-primary" type="button" onclick={saveTraining}>
              Training speichern
            </button>
          </div>
        </div>
      </div>

      <div class="mt-4">
        <h3 class="h5">Letzte Trainings</h3>

        {#if loading}
          <div class="text-muted">Laedt...</div>
        {:else}
          {#if trainings.length === 0}
            <div class="text-muted">Noch keine Trainings erfasst.</div>
          {:else}
            <div class="list-group">
              {#each trainings as t}
                <div class="list-group-item d-flex justify-content-between align-items-start">
                  <div>
                    <div class="fw-bold">{t.date || "Ohne Datum"}</div>
                    <div class="text-muted small">
                      {t.withBuddy ? `Mit Buddy: ${t.buddyName || ""}` : "Allein"} · +{t.xpGain} XP
                    </div>
                    {#if t.notes}
                      <div class="mt-2">{t.notes}</div>
                    {/if}
                  </div>

                  <button class="btn btn-outline-danger btn-sm" type="button" onclick={() => deleteTraining(t._id)}>
                    Loeschen
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </div>

    <div class="col-lg-5">
      <div class="card p-3">
        <div class="fw-bold mb-2">Dein Fortschritt</div>
        <div><b>Level:</b> {summary.level}</div>
        <div><b>XP:</b> {summary.xp}</div>
        <div><b>Trainings gesamt:</b> {summary.trainingsCount}</div>
        <div class="text-muted small mt-2">
          10 XP pro Training allein, 20 XP mit Buddy, 30 XP fuer Profil.
        </div>
      </div>
    </div>
  </div>
{/if}

