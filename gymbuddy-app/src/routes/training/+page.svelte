<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { readSession, subscribeSession, csrfHeader } from "$lib/session.js";

  const LOCATION_OPTIONS = [
    { value: "gym", label: "Gym" },
    { value: "home", label: "Home" },
    { value: "outdoor", label: "Outdoor" },
    { value: "other", label: "Andere" }
  ];

  function todayDate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function createSetEntry(seed = {}) {
    return {
      reps: seed.reps ?? 8,
      weight: seed.weight ?? 0,
      rpe: seed.rpe ?? "",
      isWarmup: Boolean(seed.isWarmup)
    };
  }

  function createExerciseEntry(seed = {}) {
    const sets = Array.isArray(seed.sets) && seed.sets.length > 0 ? seed.sets.map((s) => createSetEntry(s)) : [createSetEntry()];
    return {
      exerciseKey: seed.exerciseKey ?? "",
      name: seed.name ?? "",
      sets
    };
  }

  function cloneExercise(ex) {
    return createExerciseEntry(ex || {});
  }

  function cloneForm(form) {
    return JSON.parse(JSON.stringify(form));
  }

  function createWorkoutForm(seed = {}) {
    return {
      date: seed.dateLocal || (seed.date ? String(seed.date).slice(0, 10) : todayDate()),
      durationMinutes: seed.durationMinutes ?? 45,
      location: seed.location || "gym",
      buddyUserId: seed.buddyUserId ?? "",
      notes: seed.notes || "",
      exercises: Array.isArray(seed.exercises) && seed.exercises.length > 0 ? seed.exercises.map(cloneExercise) : [createExerciseEntry()]
    };
  }

  function createTemplateForm(seed = {}) {
    return {
      name: seed.name || "",
      durationMinutes: seed.durationMinutes ?? 45,
      location: seed.location || "gym",
      notes: seed.notes || "",
      exercises: Array.isArray(seed.exercises) && seed.exercises.length > 0 ? seed.exercises.map(cloneExercise) : [createExerciseEntry()]
    };
  }

  let session = $state(readSession());
  let isAuthenticated = $derived(!!session?.userId);

  let workouts = $state([]);
  let templates = $state([]);
  let exercisesCatalog = $state({ all: [], builtIn: [], custom: [] });
  let friends = $state([]);
  let buddySuggestions = $state([]);
  let suggestionsLoading = $state(false);
  let suggestionsError = $state("");
  let summary = $state({ xp: 0, level: 1, trainingsCount: 0 });
  let analytics = $state({ workoutsThisWeek: 0, totalVolumeThisWeek: 0, bestLifts: [] });

  let workoutForm = $state(createWorkoutForm());
  let templateForm = $state(createTemplateForm());
  let customExerciseForm = $state({ name: "", muscleGroup: "", equipment: "", isBodyweight: false });

  let editingWorkoutId = $state("");
  let editingTemplateId = $state("");
  let expandedWorkoutId = $state("");

  let loadingWorkouts = $state(false);
  let loadingTemplates = $state(false);
  let loadingCatalog = $state(false);
  let loadingFriends = $state(false);
  let savingWorkout = $state(false);
  let savingTemplate = $state(false);
  let addingCustomExercise = $state(false);

  let loadError = $state("");
  let workoutError = $state("");
  let templateError = $state("");
  let customExerciseError = $state("");
  let analyticsError = $state("");

  function mutateForm(target, fn) {
    const base = target === "template" ? templateForm : workoutForm;
    const next = cloneForm(base);
    fn(next);
    if (target === "template") templateForm = next;
    else workoutForm = next;
  }

  function ensureDefaultExerciseSelection(target = "workout") {
    if (!Array.isArray(exercisesCatalog.all) || exercisesCatalog.all.length === 0) return;
    const fallback = exercisesCatalog.all[0];
    mutateForm(target, (form) => {
      if (!Array.isArray(form.exercises) || form.exercises.length === 0) {
        form.exercises = [createExerciseEntry({ exerciseKey: fallback.key, name: fallback.name })];
        return;
      }
      for (const ex of form.exercises) {
        if (!ex.exerciseKey) {
          ex.exerciseKey = fallback.key;
          ex.name = fallback.name;
        }
        if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
          ex.sets = [createSetEntry()];
        }
      }
    });
  }

  function setExerciseKey(target, index, key) {
    mutateForm(target, (form) => {
      const ex = form.exercises[index];
      if (!ex) return;
      ex.exerciseKey = key;
      const match = exercisesCatalog.all.find((opt) => opt.key === key);
      ex.name = match?.name ?? ex.name ?? "";
      if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
        ex.sets = [createSetEntry()];
      }
    });
  }

  function addExercise(target) {
    mutateForm(target, (form) => {
      form.exercises = [...(form.exercises || []), createExerciseEntry()];
    });
  }

  function removeExercise(target, index) {
    mutateForm(target, (form) => {
      const list = Array.isArray(form.exercises) ? form.exercises : [];
      if (list.length <= 1) return;
      form.exercises = list.filter((_, idx) => idx !== index);
    });
  }

  function addSet(target, exIndex) {
    mutateForm(target, (form) => {
      const ex = form.exercises?.[exIndex];
      if (!ex) return;
      ex.sets = [...(ex.sets || []), createSetEntry()];
    });
  }

  function removeSet(target, exIndex, setIndex) {
    mutateForm(target, (form) => {
      const ex = form.exercises?.[exIndex];
      if (!ex || !Array.isArray(ex.sets)) return;
      if (ex.sets.length <= 1) return;
      ex.sets = ex.sets.filter((_, idx) => idx !== setIndex);
    });
  }

  function updateSetField(target, exIndex, setIndex, field, value) {
    mutateForm(target, (form) => {
      const ex = form.exercises?.[exIndex];
      if (!ex || !Array.isArray(ex.sets)) return;
      const set = ex.sets[setIndex];
      if (!set) return;
      if (field === "isWarmup") set.isWarmup = Boolean(value);
      else if (field === "reps") set.reps = Number(value);
      else if (field === "weight") set.weight = Number(value);
      else if (field === "rpe") set.rpe = value === "" ? "" : Number(value);
    });
  }

  function resetWorkoutForm(seed) {
    workoutForm = createWorkoutForm(seed);
    ensureDefaultExerciseSelection("workout");
    editingWorkoutId = "";
  }

  function resetTemplateForm(seed) {
    templateForm = createTemplateForm(seed);
    ensureDefaultExerciseSelection("template");
    editingTemplateId = "";
  }

  function applySummary(data) {
    if (data?.summary) {
      summary = {
        xp: Number(data.summary.xp ?? summary.xp),
        level: Number(data.summary.level ?? summary.level),
        trainingsCount: Number(data.summary.trainingsCount ?? summary.trainingsCount)
      };
    }
  }

  async function loadSummaryFromProfile() {
    if (!session?.userId) return;
    try {
      const res = await fetch("/api/profile");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      summary = {
        xp: Number(data?.xp ?? data?.lifetimeXp ?? summary.xp),
        level: Number(data?.level ?? summary.level),
        trainingsCount: Number(data?.trainingsCount ?? summary.trainingsCount)
      };
    } catch {
      // ignore
    }
  }

  async function loadCatalog() {
    if (!session?.userId) return;
    loadingCatalog = true;
    loadError = "";
    try {
      const res = await fetch("/api/exercises");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Katalog konnte nicht geladen werden.");
      exercisesCatalog = {
        all: Array.isArray(data?.all) ? data.all : [],
        builtIn: Array.isArray(data?.builtIn) ? data.builtIn : [],
        custom: Array.isArray(data?.custom) ? data.custom : []
      };
      ensureDefaultExerciseSelection("workout");
      ensureDefaultExerciseSelection("template");
    } catch (e) {
      loadError = e?.message || "Fehler beim Laden.";
    } finally {
      loadingCatalog = false;
    }
  }
  async function loadWorkouts() {
    if (!session?.userId) return;
    loadingWorkouts = true;
    workoutError = "";
    try {
      const res = await fetch("/api/workouts");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Workouts konnten nicht geladen werden.");
      workouts = Array.isArray(data?.workouts) ? data.workouts : [];
      applySummary(data);
    } catch (e) {
      workoutError = e?.message || "Fehler beim Laden der Workouts.";
      workouts = [];
    } finally {
      loadingWorkouts = false;
    }
  }

  async function loadAnalytics() {
    if (!session?.userId) return;
    analyticsError = "";
    try {
      const res = await fetch("/api/analytics/overview");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Analytics konnten nicht geladen werden.");
      analytics = {
        workoutsThisWeek: Number(data?.workoutsThisWeek ?? 0),
        totalVolumeThisWeek: Number(data?.totalVolumeThisWeek ?? 0),
        bestLifts: Array.isArray(data?.bestLifts) ? data.bestLifts : []
      };
    } catch (e) {
      analyticsError = e?.message || "Analytics konnten nicht geladen werden.";
      analytics = { workoutsThisWeek: 0, totalVolumeThisWeek: 0, bestLifts: [] };
    }
  }

  async function loadTemplates() {
    if (!session?.userId) return;
    loadingTemplates = true;
    templateError = "";
    try {
      const res = await fetch("/api/templates");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Vorlagen konnten nicht geladen werden.");
      templates = Array.isArray(data?.templates) ? data.templates : [];
    } catch (e) {
      templateError = e?.message || "Fehler beim Laden der Vorlagen.";
      templates = [];
    } finally {
      loadingTemplates = false;
    }
  }

  async function loadFriends() {
    if (!session?.userId) return;
    loadingFriends = true;
    try {
      const res = await fetch("/api/friends");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Freunde konnten nicht geladen werden.");
      const list = Array.isArray(data?.friends) ? data.friends : [];
      friends = list.map((u) => ({
        id: u._id || u.id || "",
        name: u.name || u.email || u.buddyCode || "Buddy"
      }));
    } catch {
      friends = [];
    } finally {
      loadingFriends = false;
    }
  }

  async function loadBuddySuggestions() {
    if (!session?.userId) return;
    suggestionsLoading = true;
    suggestionsError = "";
    try {
      const res = await fetch("/api/buddies/suggestions");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Vorschläge konnten nicht geladen werden.");
      buddySuggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
    } catch (e) {
      suggestionsError = e?.message || "Vorschläge konnten nicht geladen werden.";
      buddySuggestions = [];
    } finally {
      suggestionsLoading = false;
    }
  }

  function buildWorkoutPayload() {
    return {
      date: workoutForm.date,
      durationMinutes: Number(workoutForm.durationMinutes),
      notes: workoutForm.notes || "",
      location: workoutForm.location || "gym",
      buddyUserId: workoutForm.buddyUserId || undefined,
      exercises: (workoutForm.exercises || []).map((ex) => ({
        exerciseKey: ex.exerciseKey,
        name: ex.name,
        sets: (ex.sets || []).map((s) => ({
          reps: Number(s.reps),
          weight: Number(s.weight ?? 0),
          rpe: s.rpe === "" ? undefined : Number(s.rpe),
          isWarmup: Boolean(s.isWarmup)
        }))
      }))
    };
  }

  async function saveWorkout() {
    if (!session?.userId) return;
    workoutError = "";

    ensureDefaultExerciseSelection("workout");
    const payload = buildWorkoutPayload();
    const fallback = Array.isArray(exercisesCatalog.all) && exercisesCatalog.all.length ? exercisesCatalog.all[0] : null;
    if (fallback) {
      payload.exercises = (payload.exercises || []).map((ex) => ({
        exerciseKey: ex.exerciseKey || fallback.key,
        name: ex.name || fallback.name,
        sets: Array.isArray(ex.sets) && ex.sets.length > 0 ? ex.sets : [createSetEntry()]
      }));
    }
    if (!payload.date) {
      workoutError = "Bitte Datum wählen.";
      return;
    }
    if (!payload.exercises.length || payload.exercises.some((ex) => !ex.exerciseKey || !ex.sets.length)) {
      workoutError = "Bitte mindestens eine Übung mit Sätzen erfassen.";
      return;
    }

    savingWorkout = true;
    try {
      const method = editingWorkoutId ? "PUT" : "POST";
      const url = editingWorkoutId
        ? `/api/workouts/${encodeURIComponent(editingWorkoutId)}`
        : "/api/workouts";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Workout konnte nicht gespeichert werden.");

      applySummary(data);
      resetWorkoutForm();
      editingWorkoutId = "";
      expandedWorkoutId = data?.workout?._id || expandedWorkoutId;
      await loadWorkouts();
    } catch (e) {
      workoutError = e?.message || "Workout konnte nicht gespeichert werden.";
    } finally {
      savingWorkout = false;
    }
  }

  async function deleteWorkout(id) {
    const confirmDelete = confirm("Workout wirklich Löschen?");
    if (!confirmDelete) return;
    savingWorkout = true;
    workoutError = "";
    try {
      const res = await fetch(`/api/workouts/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { ...csrfHeader() }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Workout konnte nicht gelöscht werden.");
      applySummary(data);
      await loadWorkouts();
    } catch (e) {
      workoutError = e?.message || "Workout konnte nicht gelöscht werden.";
    } finally {
      savingWorkout = false;
    }
  }

  function startEditWorkout(workout) {
    resetWorkoutForm(workout);
    editingWorkoutId = workout?._id || "";
    expandedWorkoutId = workout?._id || "";
  }

  function useTemplate(template) {
    resetWorkoutForm({ ...template, date: todayDate() });
    editingWorkoutId = "";
  }

  function buildTemplatePayload() {
    return {
      name: templateForm.name,
      durationMinutes: Number(templateForm.durationMinutes),
      notes: templateForm.notes || "",
      location: templateForm.location || "gym",
      exercises: (templateForm.exercises || []).map((ex) => ({
        exerciseKey: ex.exerciseKey,
        name: ex.name,
        sets: (ex.sets || []).map((s) => ({
          reps: Number(s.reps),
          weight: Number(s.weight ?? 0),
          rpe: s.rpe === "" ? undefined : Number(s.rpe),
          isWarmup: Boolean(s.isWarmup)
        }))
      }))
    };
  }

  async function saveTemplate() {
    if (!session?.userId) return;
    templateError = "";

    const payload = buildTemplatePayload();
    if (!payload.name || !payload.exercises.length) {
      templateError = "Bitte Name und mindestens eine Übung angeben.";
      return;
    }

    savingTemplate = true;
    try {
      const method = editingTemplateId ? "PUT" : "POST";
      const url = editingTemplateId
        ? `/api/templates/${encodeURIComponent(editingTemplateId)}`
        : "/api/templates";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Vorlage konnte nicht gespeichert werden.");

      resetTemplateForm();
      await loadTemplates();
    } catch (e) {
      templateError = e?.message || "Vorlage konnte nicht gespeichert werden.";
    } finally {
      savingTemplate = false;
    }
  }

  async function deleteTemplate(id) {
    const confirmDelete = confirm("Vorlage wirklich Löschen?");
    if (!confirmDelete) return;
    templateError = "";
    savingTemplate = true;
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { ...csrfHeader() }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Vorlage konnte nicht gelöscht werden.");
      if (editingTemplateId === id) resetTemplateForm();
      await loadTemplates();
    } catch (e) {
      templateError = e?.message || "Vorlage konnte nicht gelöscht werden.";
    } finally {
      savingTemplate = false;
    }
  }

  function startEditTemplate(t) {
    templateForm = createTemplateForm(t);
    editingTemplateId = t?._id || "";
  }

  function cancelTemplateEdit() {
    resetTemplateForm();
  }

  async function addCustomExercise() {
    if (!session?.userId) return;
    customExerciseError = "";
    addingCustomExercise = true;
    try {
      if (!customExerciseForm.name) throw new Error("Name wird benötigt.");
      const res = await fetch("/api/exercises/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify(customExerciseForm)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Übung konnte nicht erstellt werden.");
      exercisesCatalog = {
        all: Array.isArray(data?.all) ? data.all : exercisesCatalog.all,
        builtIn: Array.isArray(data?.builtIn) ? data.builtIn : exercisesCatalog.builtIn,
        custom: Array.isArray(data?.custom) ? data.custom : exercisesCatalog.custom
      };
      customExerciseForm = { name: "", muscleGroup: "", equipment: "", isBodyweight: false };
    } catch (e) {
      customExerciseError = e?.message || "Übung konnte nicht erstellt werden.";
    } finally {
      addingCustomExercise = false;
    }
  }

  function displayDate(workout) {
    const local = workout?.dateLocal || (workout?.date ? String(workout.date).slice(0, 10) : "");
    return local || "Datum fehlt";
  }

  onMount(() => {
    const unsub = subscribeSession((s) => {
      session = s;
      if (s?.userId) {
        loadCatalog();
        loadWorkouts();
        loadFriends();
        loadBuddySuggestions();
        loadAnalytics();
        loadSummaryFromProfile();
      } else {
        workouts = [];
        templates = [];
        friends = [];
        buddySuggestions = [];
        summary = { xp: 0, level: 1, trainingsCount: 0 };
        analytics = { workoutsThisWeek: 0, totalVolumeThisWeek: 0, bestLifts: [] };
      }
    });

    if (session?.userId) {
      loadCatalog();
      loadWorkouts();
      loadFriends();
      loadBuddySuggestions();
      loadAnalytics();
      loadSummaryFromProfile();
    }

    return () => unsub();
  });
</script>
<div class="page-shell py-4 px-3">
  <div class="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
    <div>
      <h1 class="mb-1">Workouts</h1>
      <p class="muted-subtitle mb-0">Tracke deine Sessions und behalte deine Kennzahlen im Blick.</p>
    </div>
    {#if isAuthenticated}
      <div class="pill">
        <span>Level {summary.level}</span>
        <span class="badge text-bg-light">XP {summary.xp}</span>
        <span class="badge text-bg-light">Trainings {summary.trainingsCount}</span>
      </div>
    {/if}
  </div>

  {#if !isAuthenticated}
    <div class="card shadow-soft">
      <div class="card-body p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h5 class="mb-1">Bitte einloggen</h5>
          <p class="text-muted mb-0">Melde dich an, um Workouts zu erfassen und Vorlagen zu nutzen.</p>
        </div>
        <button class="btn btn-primary" type="button" onclick={() => goto("/profile")}>
          Zur Anmeldung
        </button>
      </div>
    </div>
  {:else}
    {#if loadError}
      <div class="error-banner mb-3">{loadError}</div>
    {/if}

    <div class="row g-4">
      <div class="col-lg-8">
        <div class="card shadow-soft">
          <div class="card-body p-4">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
              <div>
                <h5 class="card-title mb-1">{editingWorkoutId ? "Workout bearbeiten" : "Workout erfassen"}</h5>
                <div class="text-muted small">Datum, Dauer, Buddy und alle Übungen mit Sets</div>
              </div>
              {#if editingWorkoutId}
                <span class="badge text-bg-info">Bearbeitung</span>
              {/if}
            </div>

            {#if workoutError}
              <div class="error-banner mb-3">{workoutError}</div>
            {/if}

            <div class="row g-3 mb-3">
              <div class="col-sm-6 col-lg-4">
                <label class="form-label" for="workoutDate">Datum</label>
                <input
                  id="workoutDate"
                  class="form-control"
                  type="date"
                  value={workoutForm.date}
                  oninput={(e) => (workoutForm = { ...workoutForm, date: e.target.value })}
                />
              </div>
              <div class="col-sm-6 col-lg-4">
                <label class="form-label" for="workoutDuration">Dauer (Minuten)</label>
                <input
                  id="workoutDuration"
                  class="form-control"
                  type="number"
                  min="5"
                  max="240"
                  value={workoutForm.durationMinutes}
                  oninput={(e) => (workoutForm = { ...workoutForm, durationMinutes: Number(e.target.value) })}
                />
              </div>
              <div class="col-sm-6 col-lg-4">
                <label class="form-label" for="workoutLocation">Ort</label>
                <select
                  id="workoutLocation"
                  class="form-select"
                  value={workoutForm.location}
                  onchange={(e) => (workoutForm = { ...workoutForm, location: e.target.value })}
                >
                  {#each LOCATION_OPTIONS as opt}
                    <option value={opt.value}>{opt.label}</option>
                  {/each}
                </select>
              </div>
              <div class="col-sm-6 col-lg-4">
                <label class="form-label" for="buddySelect">Buddy (Freunde)</label>
                <select
                  id="buddySelect"
                  class="form-select"
                  value={workoutForm.buddyUserId}
                  onchange={(e) => (workoutForm = { ...workoutForm, buddyUserId: e.target.value })}
                >
                  <option value="">Kein Buddy</option>
                  {#if friends.length > 0}
                    <optgroup label="Freunde">
                      {#each friends as f}
                        <option value={f.id}>{f.name}</option>
                      {/each}
                    </optgroup>
                  {/if}
                  {#if buddySuggestions.length > 0}
                    <optgroup label="Vorschläge">
                      {#each buddySuggestions as s (s.userId)}
                        <option value={s.userId}>{s.name}</option>
                      {/each}
                    </optgroup>
                  {/if}
                </select>
                {#if loadingFriends}
                  <div class="text-muted small mt-1">Freunde werden geladen...</div>
                {/if}
                {#if suggestionsLoading}
                  <div class="text-muted small mt-1">Buddy Vorschläge werden geladen...</div>
                {/if}
                {#if !loadingFriends && !suggestionsLoading && friends.length === 0 && buddySuggestions.length === 0}
                  <div class="text-muted small mt-1">Noch keine Buddies verfügbar.</div>
                {/if}
                {#if suggestionsError}
                  <div class="text-danger small mt-1">{suggestionsError}</div>
                {/if}
              </div>
              <div class="col-12">
                <label class="form-label" for="notesInput">Notizen (optional)</label>
                <textarea
                  id="notesInput"
                  class="form-control"
                  rows="2"
                  placeholder="z.B. PR im Kreuzheben, Technik verbessert..."
                  value={workoutForm.notes}
                  oninput={(e) => (workoutForm = { ...workoutForm, notes: e.target.value })}
                ></textarea>
              </div>
            </div>

            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="mb-0">Übungen &amp; Sätze</h6>
              <button class="btn btn-outline-primary btn-sm" type="button" onclick={() => addExercise("workout")}>
                Übung hinzufügen
              </button>
            </div>
            <div class="text-muted small mb-2">
              Für jede Übung kannst du eigene Sets erfassen. Mehrere Übungen pro Workout sind möglich.
            </div>

            <div class="vstack gap-3">
              {#each workoutForm.exercises as ex, exIndex}
                <div class="border rounded p-3">
                  <div class="d-flex gap-2 align-items-end">
                    <div class="flex-grow-1">
                      <label class="form-label" for={`workout-ex-${exIndex}`}>Übung</label>
                      <select
                        id={`workout-ex-${exIndex}`}
                        class="form-select"
                        value={ex.exerciseKey}
                        onchange={(e) => setExerciseKey("workout", exIndex, e.target.value)}
                      >
                        <option value="">Übung wählen...</option>
                        <optgroup label="Katalog">
                          {#each exercisesCatalog.builtIn as opt}
                            <option value={opt.key}>{opt.name}</option>
                          {/each}
                        </optgroup>
                        <optgroup label="Eigene Übungen">
                          {#each exercisesCatalog.custom as opt}
                            <option value={opt.key}>{opt.name}</option>
                          {/each}
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <button
                        class="btn btn-outline-danger btn-sm"
                        type="button"
                        disabled={workoutForm.exercises.length <= 1}
                        onclick={() => removeExercise("workout", exIndex)}
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>

                  <div class="mt-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <div class="text-muted small">Sets</div>
                      <button class="btn btn-outline-secondary btn-sm" type="button" onclick={() => addSet("workout", exIndex)}>
                        Set hinzufügen
                      </button>
                    </div>
                    <div class="vstack gap-2">
                      {#each ex.sets as set, setIndex}
                        <div class="row g-2 align-items-end">
                          <div class="col-3 col-sm-2">
                            <label class="form-label form-label-sm" for={`reps-${exIndex}-${setIndex}`}>Reps</label>
                            <input
                              id={`reps-${exIndex}-${setIndex}`}
                              class="form-control form-control-sm"
                              type="number"
                              min="1"
                              max="50"
                              value={set.reps}
                              oninput={(e) => updateSetField("workout", exIndex, setIndex, "reps", e.target.value)}
                            />
                          </div>
                          <div class="col-4 col-sm-3">
                            <label class="form-label form-label-sm" for={`weight-${exIndex}-${setIndex}`}>Gewicht</label>
                            <input
                              id={`weight-${exIndex}-${setIndex}`}
                              class="form-control form-control-sm"
                              type="number"
                              min="0"
                              step="0.5"
                              value={set.weight}
                              oninput={(e) => updateSetField("workout", exIndex, setIndex, "weight", e.target.value)}
                            />
                          </div>
                          <div class="col-3 col-sm-2">
                            <label class="form-label form-label-sm" for={`rpe-${exIndex}-${setIndex}`}>RPE</label>
                            <input
                              id={`rpe-${exIndex}-${setIndex}`}
                              class="form-control form-control-sm"
                              type="number"
                              min="1"
                              max="10"
                              step="0.5"
                              value={set.rpe === null ? "" : set.rpe}
                              oninput={(e) => updateSetField("workout", exIndex, setIndex, "rpe", e.target.value)}
                            />
                          </div>
                          <div class="col-4 col-sm-3 d-flex align-items-center gap-2">
                            <input
                              class="form-check-input mt-0"
                              type="checkbox"
                              checked={set.isWarmup}
                              onchange={(e) => updateSetField("workout", exIndex, setIndex, "isWarmup", e.target.checked)}
                            />
                            <span class="small">Warm-up</span>
                          </div>
                          <div class="col-2 col-sm-2 d-flex justify-content-end">
                            <button
                              class="btn btn-outline-danger btn-sm"
                              type="button"
                              disabled={(ex.sets || []).length <= 1}
                              onclick={() => removeSet("workout", exIndex, setIndex)}
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
              {/each}
            </div>

            <div class="d-flex flex-wrap gap-2 mt-4">
              <button class="btn btn-primary" type="button" onclick={saveWorkout} disabled={savingWorkout}>
                {editingWorkoutId ? "Workout aktualisieren" : "Workout speichern"}
              </button>
              {#if editingWorkoutId}
                <button class="btn btn-outline-secondary" type="button" onclick={() => resetWorkoutForm()} disabled={savingWorkout}>
                  Abbrechen
                </button>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card shadow-soft mb-3">
          <div class="card-body p-4">
            <h5 class="card-title mb-3">Dein Fortschritt</h5>
            <div class="stat-grid mb-2">
              <div class="stat-tile">
                <div class="label">Level</div>
                <div class="value">{summary.level}</div>
              </div>
              <div class="stat-tile">
                <div class="label">XP gesamt</div>
                <div class="value">{summary.xp}</div>
              </div>
              <div class="stat-tile">
                <div class="label">Trainings</div>
                <div class="value">{summary.trainingsCount}</div>
              </div>
            </div>
            <div class="text-muted small">
              XP-Logik bleibt simpel, detaillierte Ranks &amp; Caps folgen in späteren Paketen.
            </div>
          </div>
        </div>

        <div class="card shadow-soft mb-3">
          <div class="card-body p-4">
            <h6 class="card-title mb-3">Wochen-Analytics</h6>
            {#if analyticsError}
              <div class="error-banner mb-2">{analyticsError}</div>
            {/if}
            <div class="stat-grid mb-2">
              <div class="stat-tile">
                <div class="label">Workouts diese Woche</div>
                <div class="value">{analytics.workoutsThisWeek}</div>
              </div>
              <div class="stat-tile">
                <div class="label">Volumen diese Woche</div>
                <div class="value">{analytics.totalVolumeThisWeek.toFixed(0)} kg</div>
              </div>
            </div>
            <div class="mt-2">
              <div class="fw-semibold mb-1">Best Lifts</div>
              {#if analytics.bestLifts.length === 0}
                <div class="text-muted small">Noch keine Bestwerte.</div>
              {:else}
                <ul class="small mb-0">
                  {#each analytics.bestLifts as lift}
                    <li>{lift.exerciseKey}: {lift.weight} kg</li>
                  {/each}
                </ul>
              {/if}
            </div>
          </div>
        </div>

        <div class="card shadow-soft mb-3">
          <div class="card-body p-4">
            <h6 class="card-title mb-2">Eigene Übung anlegen</h6>
            {#if customExerciseError}
              <div class="error-banner mb-2">{customExerciseError}</div>
            {/if}
            <div class="mb-2">
              <label class="form-label form-label-sm" for="customName">Name</label>
              <input
                id="customName"
                class="form-control form-control-sm"
                value={customExerciseForm.name}
                oninput={(e) => (customExerciseForm = { ...customExerciseForm, name: e.target.value })}
              />
            </div>
            <div class="mb-2">
              <label class="form-label form-label-sm" for="customMuscle">Muskelgruppe (optional)</label>
              <input
                id="customMuscle"
                class="form-control form-control-sm"
                value={customExerciseForm.muscleGroup}
                oninput={(e) => (customExerciseForm = { ...customExerciseForm, muscleGroup: e.target.value })}
              />
            </div>
            <div class="mb-2">
              <label class="form-label form-label-sm" for="customEquipment">Equipment (optional)</label>
              <input
                id="customEquipment"
                class="form-control form-control-sm"
                value={customExerciseForm.equipment}
                oninput={(e) => (customExerciseForm = { ...customExerciseForm, equipment: e.target.value })}
              />
            </div>
            <div class="form-check mb-3">
              <input
                class="form-check-input"
                type="checkbox"
                id="customIsBodyweight"
                checked={customExerciseForm.isBodyweight}
                onchange={(e) => (customExerciseForm = { ...customExerciseForm, isBodyweight: e.target.checked })}
              />
              <label class="form-check-label" for="customIsBodyweight">Körpergewicht</label>
            </div>
            <button class="btn btn-outline-primary btn-sm" type="button" onclick={addCustomExercise} disabled={addingCustomExercise}>
              Übung speichern
            </button>
          </div>
        </div>

        <div class="card shadow-soft d-none" aria-hidden="true">
          <div class="card-body p-4">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
              <h6 class="card-title mb-0">{editingTemplateId ? "Vorlage bearbeiten" : "Vorlage erstellen"}</h6>
              {#if editingTemplateId}
                <span class="badge text-bg-info">Bearbeitung</span>
              {/if}
            </div>
            {#if templateError}
              <div class="error-banner mb-2">{templateError}</div>
            {/if}
            <div class="mb-2">
              <label class="form-label form-label-sm" for="templateName">Name</label>
              <input
                id="templateName"
                class="form-control form-control-sm"
                value={templateForm.name}
                oninput={(e) => (templateForm = { ...templateForm, name: e.target.value })}
              />
            </div>
            <div class="row g-2 mb-2">
              <div class="col-6">
                <label class="form-label form-label-sm" for="templateDuration">Dauer</label>
                <input
                  id="templateDuration"
                  class="form-control form-control-sm"
                  type="number"
                  min="5"
                  max="240"
                  value={templateForm.durationMinutes}
                  oninput={(e) => (templateForm = { ...templateForm, durationMinutes: Number(e.target.value) })}
                />
              </div>
              <div class="col-6">
                <label class="form-label form-label-sm" for="templateLocation">Ort</label>
                <select
                  id="templateLocation"
                  class="form-select form-select-sm"
                  value={templateForm.location}
                  onchange={(e) => (templateForm = { ...templateForm, location: e.target.value })}
                >
                  {#each LOCATION_OPTIONS as opt}
                    <option value={opt.value}>{opt.label}</option>
                  {/each}
                </select>
              </div>
            </div>
            <div class="mb-2">
              <label class="form-label form-label-sm" for="templateNotes">Notizen (optional)</label>
              <textarea
                id="templateNotes"
                class="form-control form-control-sm"
                rows="2"
                value={templateForm.notes}
                oninput={(e) => (templateForm = { ...templateForm, notes: e.target.value })}
              ></textarea>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="small fw-semibold">Übungen</span>
              <button class="btn btn-outline-secondary btn-sm" type="button" onclick={() => addExercise("template")}>
                Übung hinzufügen
              </button>
            </div>
            <div class="vstack gap-2 mb-2">
              {#each templateForm.exercises as ex, idx}
                <div class="border rounded p-2">
                  <div class="d-flex gap-2 align-items-end">
                    <div class="flex-grow-1">
                      <select
                        class="form-select form-select-sm"
                        value={ex.exerciseKey}
                        onchange={(e) => setExerciseKey("template", idx, e.target.value)}
                      >
                        <option value="">Übung wählen...</option>
                        <optgroup label="Katalog">
                          {#each exercisesCatalog.builtIn as opt}
                            <option value={opt.key}>{opt.name}</option>
                          {/each}
                        </optgroup>
                        <optgroup label="Eigene Übungen">
                          {#each exercisesCatalog.custom as opt}
                            <option value={opt.key}>{opt.name}</option>
                          {/each}
                        </optgroup>
                      </select>
                    </div>
                    <button
                      class="btn btn-outline-danger btn-sm"
                      type="button"
                      disabled={templateForm.exercises.length <= 1}
                      onclick={() => removeExercise("template", idx)}
                    >
                      &times;
                    </button>
                  </div>
                  <div class="mt-2">
                    {#each ex.sets as set, sIdx}
                      <div class="row g-1 align-items-center mb-1">
                        <div class="col-4">
                          <input
                            class="form-control form-control-sm"
                            type="number"
                            min="1"
                            max="50"
                            value={set.reps}
                            oninput={(e) => updateSetField("template", idx, sIdx, "reps", e.target.value)}
                          />
                        </div>
                        <div class="col-4">
                          <input
                            class="form-control form-control-sm"
                            type="number"
                            min="0"
                            step="0.5"
                            value={set.weight}
                            oninput={(e) => updateSetField("template", idx, sIdx, "weight", e.target.value)}
                          />
                        </div>
                        <div class="col-2">
                          <input
                            class="form-control form-control-sm"
                            type="number"
                            min="1"
                            max="10"
                            step="0.5"
                            value={set.rpe === null ? "" : set.rpe}
                            oninput={(e) => updateSetField("template", idx, sIdx, "rpe", e.target.value)}
                          />
                        </div>
                        <div class="col-2 d-flex justify-content-end">
                          <button
                            class="btn btn-outline-danger btn-sm"
                            type="button"
                            disabled={(ex.sets || []).length <= 1}
                            onclick={() => removeSet("template", idx, sIdx)}
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    {/each}
                    <button class="btn btn-link btn-sm ps-0" type="button" onclick={() => addSet("template", idx)}>
                      + Set hinzufügen
                    </button>
                  </div>
                </div>
              {/each}
            </div>
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-outline-primary btn-sm" type="button" onclick={saveTemplate} disabled={savingTemplate}>
                {editingTemplateId ? "Vorlage aktualisieren" : "Vorlage speichern"}
              </button>
              {#if editingTemplateId}
                <button class="btn btn-outline-secondary btn-sm" type="button" onclick={cancelTemplateEdit} disabled={savingTemplate}>
                  Abbrechen
                </button>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card shadow-soft mt-4">
      <div class="card-body p-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h5 class="card-title mb-0">Gespeicherte Workouts</h5>
          <span class="text-muted small">{workouts.length} Einträge</span>
        </div>

        {#if loadingWorkouts}
          <div class="text-muted">Lade Workouts...</div>
        {:else if workouts.length === 0}
          <div class="empty-state">Noch keine Workouts erfasst.</div>
        {:else}
          <div class="list-group">
            {#each workouts as w (w._id)}
              <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <div class="fw-semibold">{displayDate(w)} - {w.durationMinutes} Min</div>
                    <div class="text-muted small">
                      {w.exercises?.length || 0} Übungen
                      {#if w.buddyName}
                        - Buddy: {w.buddyName}
                      {/if}
                    </div>
                  </div>
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary" type="button" onclick={() => startEditWorkout(w)}>
                      Bearbeiten
                    </button>
                    <button class="btn btn-outline-danger" type="button" onclick={() => deleteWorkout(w._id)}>
                      Löschen
                    </button>
                    <button
                      class="btn btn-outline-primary"
                      type="button"
                      onclick={() => (expandedWorkoutId = expandedWorkoutId === w._id ? "" : w._id)}
                    >
                      Details
                    </button>
                  </div>
                </div>

                {#if expandedWorkoutId === w._id}
                  <div class="mt-3">
                    {#if w.notes}
                      <div class="mb-2"><strong>Notizen:</strong> {w.notes}</div>
                    {/if}
                    <div class="vstack gap-2">
                      {#each w.exercises as ex}
                        <div class="border rounded p-2">
                          <div class="fw-semibold">{ex.name || ex.exerciseKey}</div>
                          <div class="text-muted small">
                            {#each ex.sets as s, idx}
                              <div>
                                Set {idx + 1}: {s.reps} Reps - {s.weight} kg
                                {#if s.rpe} - RPE {s.rpe}{/if}
                                {#if s.isWarmup} - Warm-up{/if}
                              </div>
                            {/each}
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>





