<script>
  import { onMount } from "svelte";

  let { data } = $props();
  const { buddy } = data;

  const CONNECTIONS_KEY = "gymbuddy-connections";
  const AUTH_KEY = "gymbuddy-auth";

  let connections = $state([]);
  let isConnected = $state(false);
  let isAuthenticated = $state(false);

  onMount(() => {
    const savedAuth = localStorage.getItem(AUTH_KEY);
    isAuthenticated = !!savedAuth;

    if (!isAuthenticated) {
      connections = [];
      isConnected = false;
      return;
    }

    const saved = localStorage.getItem(CONNECTIONS_KEY);
    connections = saved ? JSON.parse(saved) : [];
    isConnected = connections.includes(buddy.id);
  });

  function saveConnections(list) {
    connections = list;
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
    isConnected = connections.includes(buddy.id);
  }

  function toggleConnection() {
    const newList = connections.includes(buddy.id)
      ? connections.filter((id) => id !== buddy.id)
      : [...connections, buddy.id];

    saveConnections(newList);
  }
</script>

<h1>{buddy.name}</h1>

{#if !isAuthenticated}
  <div class="alert alert-warning mt-3">
    Bitte melde dich an, um Details von Gymbuddies zu sehen und Verbindungen zu verwalten.
  </div>
  <a href="/profile" class="btn btn-primary mt-2">Zur Anmeldung</a>
{:else}
  <div class="card mt-3 shadow-sm">
    <div class="card-body">
      <h5 class="card-title">{buddy.gym}</h5>

      <p class="card-text mb-1">
        <strong>Level:</strong> {buddy.level}
      </p>

      <p class="card-text mb-1">
        <strong>Fokus:</strong> {buddy.focus}
      </p>

      {#if buddy.trainingTimes}
        <p class="card-text mb-1">
          <strong>Bevorzugte Zeiten:</strong> {buddy.trainingTimes}
        </p>
      {/if}

      {#if buddy.contact}
        <p class="card-text mb-1">
          <strong>Kontakt:</strong> {buddy.contact}
        </p>
      {/if}

      {#if buddy.code}
        <p class="card-text mb-1">
          <strong>GymBuddy ID:</strong> {buddy.code}
        </p>
      {/if}

      <p class="card-text mb-0">
        <strong>XP:</strong> {buddy.xp}
      </p>
    </div>
  </div>

  <div class="mt-3 d-flex align-items-center gap-3">
    <button type="button" class="btn btn-primary" onclick={toggleConnection}>
      {#if isConnected}
        Verbindung entfernen
      {:else}
        Mit diesem Buddy verknüpfen
      {/if}
    </button>

    {#if isConnected}
      <span class="text-success">Du bist mit diesem Buddy verknüpft ✔️</span>
    {/if}
  </div>

  <a href="/buddies" class="btn btn-link mt-3">&laquo; Zurück zur Übersicht</a>
{/if}
