<script>
  import "../styles.css";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { readSession, onSessionChange, clearSession } from "$lib/session.js";

  let { children } = $props();

  let session = $state(null);
  let isAuthenticated = $state(false);

  onMount(() => {
    session = readSession();
    isAuthenticated = !!session?.userId;

    const unsub = onSessionChange((s) => {
      session = s;
      isAuthenticated = !!s?.userId;
    });

    return () => unsub();
  });

  function logout() {
    clearSession();
    goto("/");
  }
</script>

<nav class="navbar navbar-expand-lg bg-white shadow-sm">
  <div class="container">
    <a class="navbar-brand d-flex align-items-center gap-2" href="/">
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
      <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-3">
        <li class="nav-item"><a class="nav-link" href="/">Start</a></li>
        <li class="nav-item"><a class="nav-link" href="/buddies">Gymbuddies</a></li>
        <li class="nav-item"><a class="nav-link" href="/training">Trainings</a></li>
        <li class="nav-item"><a class="nav-link" href="/compare">Vergleich</a></li>
        <li class="nav-item"><a class="nav-link" href="/profile">Mein Profil</a></li>

        {#if isAuthenticated}
          <li class="nav-item">
            <button class="btn btn-outline-danger btn-sm" type="button" onclick={logout}>
              Abmelden
            </button>
          </li>
        {/if}
      </ul>
    </div>
  </div>
</nav>

<main class="container py-4">
  {@render children()}
</main>
