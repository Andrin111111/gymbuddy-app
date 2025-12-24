<script>
  import { onMount } from "svelte";
  import { readSession, onSessionChange } from "$lib/session.js";

  let session = $state(null);
  let isAuthenticated = $state(false);

  let loading = $state(false);
  let errorMsg = $state("");
  let rows = $state([]);

  async function loadCompare(userId) {
    loading = true;
    errorMsg = "";

    try {
      const res = await fetch(`/api/compare?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Fehler beim Laden.");
      }
      const data = await res.json();
      rows = Array.isArray(data?.rows) ? data.rows : [];
    } catch (e) {
      errorMsg = e?.message ?? "Fehler beim Laden.";
      rows = [];
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    session = readSession();
    isAuthenticated = !!session?.userId;

    if (session?.userId) loadCompare(session.userId);

    const unsub = onSessionChange((s) => {
      session = s;
      isAuthenticated = !!s?.userId;
      if (s?.userId) loadCompare(s.userId);
      else rows = [];
    });

    return () => unsub();
  });
</script>

<h1 class="mb-3">Vergleich mit deinen Gymbuddies</h1>

{#if !isAuthenticated}
  <div class="alert alert-warning">
    Bitte melde dich an, um deinen Fortschritt mit anderen Gymbuddies zu vergleichen.
  </div>
  <a class="btn btn-primary" href="/profile">Zur Anmeldung</a>
{:else}
  {#if errorMsg}
    <div class="alert alert-danger">{errorMsg}</div>
  {/if}

  {#if loading}
    <div class="text-muted">Laedt...</div>
  {:else}
    {#if rows.length === 0}
      <div class="alert alert-info">Noch keine Freunde zum Vergleichen.</div>
    {:else}
      <div class="table-responsive">
        <table class="table align-middle">
          <thead>
            <tr>
              <th>Name</th>
              <th class="text-end">Level</th>
              <th class="text-end">XP</th>
              <th class="text-end">Trainings</th>
            </tr>
          </thead>
          <tbody>
            {#each rows as r}
              <tr class={r.isMe ? "table-primary" : ""}>
                <td>{r.name}{r.isMe ? " (Du)" : ""}</td>
                <td class="text-end">{r.level}</td>
                <td class="text-end">{r.xp}</td>
                <td class="text-end">{r.trainingsCount}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
{/if}
