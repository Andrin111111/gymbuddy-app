<script>
  import "../styles.css";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { readSession, subscribeSession, clearSession, refreshSession, csrfHeader } from "$lib/session.js";

  let { children } = $props();

  let session = $state(null);
  let sessionReady = $state(false);
  let isAuthenticated = $derived(sessionReady && !!session?.userId);

  onMount(() => {
    session = readSession();
    sessionReady = false;

    const unsub = subscribeSession((s, ready) => {
      session = s;
      sessionReady = !!ready;
    });

    return () => unsub();
  });

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: { ...csrfHeader() } });
    } catch {}
    clearSession();
    session = null;
    sessionReady = true;
    await refreshSession();
    goto("/", { replaceState: true });
  }
</script>

<nav class="navbar navbar-expand-lg app-navbar" data-sveltekit-preload-data="hover" data-sveltekit-preload-code="hover">
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
        <li class="nav-item"><a class={"nav-link " + ($page.url.pathname === "/" ? "active" : "")} href="/">Start</a></li>
        <li class="nav-item"><a class={"nav-link " + ($page.url.pathname.startsWith("/buddies") ? "active" : "")} href="/buddies">Gymbuddies</a></li>
        <li class="nav-item"><a class={"nav-link " + ($page.url.pathname.startsWith("/training") ? "active" : "")} href="/training">Trainings</a></li>
        <li class="nav-item"><a class={"nav-link " + ($page.url.pathname.startsWith("/compare") ? "active" : "")} href="/compare">Vergleich</a></li>
        <li class="nav-item"><a class={"nav-link " + ($page.url.pathname.startsWith("/profile") ? "active" : "")} href="/profile">Mein Profil</a></li>

        {#if sessionReady && isAuthenticated}
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

<main class="container py-4 page-shell">
  {@render children()}
</main>
