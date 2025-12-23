<script>
  import "../styles.css";
  import { onMount } from "svelte";

  import { readSession, clearSession } from "$lib/session.js";

  let { children } = $props();
  let isAuthenticated = $state(false);

  function refreshAuth() {
    const s = readSession();
    isAuthenticated = !!s?.userId;
  }

  onMount(() => {
    refreshAuth();

    const onChanged = () => refreshAuth();
    window.addEventListener("gymbuddy-session-changed", onChanged);
    window.addEventListener("storage", onChanged);

    return () => {
      window.removeEventListener("gymbuddy-session-changed", onChanged);
      window.removeEventListener("storage", onChanged);
    };
  });

  function logout() {
    clearSession();
    isAuthenticated = false;
    window.location.href = "/profile";
  }
</script>

<div class="container py-3">
  <nav class="navbar navbar-expand-lg navbar-light bg-light mb-4 rounded shadow-sm">
    <div class="container-fluid">
      <a class="navbar-brand d-flex align-items-center" href="/">
        <img src="/img1.png" alt="GymBuddy Logo" width="96" height="96" />
      </a>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto gap-2">
          <li class="nav-item">
            <a class="nav-link" href="/">Start</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/buddies">Gymbuddies</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/training">Trainings</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/compare">Vergleich</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/profile">Mein Profil</a>
          </li>

          {#if isAuthenticated}
            <li class="nav-item">
              <button type="button" class="btn btn-outline-danger btn-sm ms-2" onclick={logout}>
                Abmelden
              </button>
            </li>
          {:else}
            <li class="nav-item">
              <a class="btn btn-primary btn-sm ms-2" href="/profile">
                Anmelden
              </a>
            </li>
          {/if}
        </ul>
      </div>
    </div>
  </nav>

  {@render children()}
</div>
