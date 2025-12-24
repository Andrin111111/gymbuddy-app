<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { readSession, subscribeSession } from "$lib/session.js";

  let session = $state(readSession());
  let isAuthenticated = $derived(!!session?.userId);

  let loading = $state(false);
  let error = $state("");

  let me = $state(null);
  let friends = $state([]);

  function setError(msg) {
    error = msg || "";
  }

  async function loadCompareData() {
    if (!session?.userId) return;

    setError("");
    loading = true;

    try {
      const res = await fetch(`/api/buddies?userId=${encodeURIComponent(session.userId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Vergleichsdaten konnten nicht geladen werden.");

      const myUser = data?.me || data?.user || null;
      const allUsers = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];

      me = myUser;

      const friendIds = Array.isArray(myUser?.friends) ? myUser.friends.map(String) : [];
      friends = allUsers.filter((u) => friendIds.includes(String(u._id || u.id)));

      friends = friends.map((u) => ({
        ...u,
        xp: typeof u.xp === "number" ? u.xp : 0,
        trainingsCount: typeof u.trainingsCount === "number" ? u.trainingsCount : 0,
        level: typeof u.level === "number" ? u.level : 1
      }));

      if (me) {
        me = {
          ...me,
          xp: typeof me.xp === "number" ? me.xp : 0,
          trainingsCount: typeof me.trainingsCount === "number" ? me.trainingsCount : 0,
          level: typeof me.level === "number" ? me.level : 1
        };
      }
    } catch (e) {
      setError(e?.message || "Vergleichsdaten konnten nicht geladen werden.");
      me = null;
      friends = [];
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const unsub = subscribeSession((s) => {
      session = s;
      if (s?.userId) loadCompareData();
      else {
        me = null;
        friends = [];
        error = "";
      }
    });

    if (session?.userId) loadCompareData();

    return unsub;
  });
</script>

<div class="container py-4">
  <h1 class="mb-3">Vergleich mit deinen Gymbuddies</h1>

  {#if !isAuthenticated}
    <div class="alert alert-warning">
      Bitte melde dich an, um deinen Fortschritt mit anderen Gymbuddies zu vergleichen.
    </div>
    <button class="btn btn-primary" type="button" onclick={() => goto("/profile")}>
      Zur Anmeldung
    </button>
  {:else}
    {#if error}
      <div class="alert alert-danger">{error}</div>
    {/if}

    <div class="d-flex gap-2 mb-3">
      <button class="btn btn-outline-primary" type="button" onclick={loadCompareData} disabled={loading}>
        Aktualisieren
      </button>
    </div>

    {#if loading && !me}
      <div class="text-muted">Lade...</div>
    {:else if !me}
      <div class="alert alert-danger">Dein Profil konnte nicht geladen werden.</div>
    {:else}
      <div class="card mb-4">
        <div class="card-body">
          <h5 class="card-title mb-2">Du</h5>
          <div class="row g-2">
            <div class="col-md-4"><strong>XP:</strong> {me.xp}</div>
            <div class="col-md-4"><strong>Level:</strong> {me.level}</div>
            <div class="col-md-4"><strong>Trainings:</strong> {me.trainingsCount}</div>
          </div>
          <div class="text-muted mt-2">
            {#if me.gym}Gym: {me.gym}{/if}
            {#if me.trainingLevel} · Trainingslevel: {me.trainingLevel}{/if}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <h5 class="card-title mb-3">Deine Freunde</h5>

          {#if friends.length === 0}
            <div class="text-muted">Du hast noch keine Gymbuddies als Freunde.</div>
          {:else}
            <div class="table-responsive">
              <table class="table align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Gym</th>
                    <th>Trainingslevel</th>
                    <th>XP</th>
                    <th>Level</th>
                    <th>Trainings</th>
                  </tr>
                </thead>
                <tbody>
                  {#each friends as f (f._id || f.id)}
                    <tr>
                      <td class="fw-semibold">{f.name || "Unbekannt"}</td>
                      <td>{f.gym || "—"}</td>
                      <td>{f.trainingLevel || f.level || "beginner"}</td>
                      <td>{f.xp}</td>
                      <td>{f.level}</td>
                      <td>{f.trainingsCount}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>
