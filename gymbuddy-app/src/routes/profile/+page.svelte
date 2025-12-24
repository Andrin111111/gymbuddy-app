<script>
  import { onMount } from "svelte";
  import { readSession, writeSession, clearSession, subscribeSession } from "$lib/session.js";

  let session = $state(readSession());
  let isAuthenticated = $derived(!!session?.userId);

  let mode = $state("login");
  let loading = $state(false);
  let error = $state("");

  let email = $state("");
  let password = $state("");
  let password2 = $state("");

  let buddyCode = $state("");
  let name = $state("");
  let gym = $state("");
  let trainingLevel = $state("beginner");
  let goals = $state("");
  let preferredTimes = $state("");
  let contact = $state("");

  let xp = $state(0);
  let level = $state(1);
  let trainingsCount = $state(0);
  let profileBonusApplied = $state(false);

  function setError(msg) {
    error = msg || "";
  }

  async function loadProfile() {
    if (!session?.userId) return;
    setError("");
    loading = true;
    try {
      const res = await fetch(`/api/profile?userId=${encodeURIComponent(session.userId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Profil konnte nicht geladen werden.");

      buddyCode = data?.buddyCode ?? "";
      name = data?.name ?? "";
      gym = data?.gym ?? "";
      trainingLevel = data?.trainingLevel ?? "beginner";
      goals = data?.goals ?? "";
      preferredTimes = data?.preferredTimes ?? "";
      contact = data?.contact ?? "";

      xp = data?.xp ?? 0;
      level = data?.level ?? 1;
      trainingsCount = data?.trainingsCount ?? 0;
      profileBonusApplied = !!data?.profileBonusApplied;
    } catch (e) {
      setError(e?.message || "Profil konnte nicht geladen werden.");
    } finally {
      loading = false;
    }
  }

  async function doRegister() {
    setError("");

    if (!email.trim() || !password) return setError("Bitte E-Mail und Passwort ausfüllen.");
    if (password.length < 6) return setError("Passwort muss mindestens 6 Zeichen haben.");
    if (password !== password2) return setError("Passwörter stimmen nicht überein.");

    loading = true;
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Registrierung fehlgeschlagen.");

      writeSession({ userId: data.userId, email: data.email, buddyCode: data.buddyCode });
      session = readSession();
      mode = "profile";
      await loadProfile();
    } catch (e) {
      setError(e?.message || "Registrierung fehlgeschlagen.");
    } finally {
      loading = false;
    }
  }

  async function doLogin() {
    setError("");

    if (!email.trim() || !password) return setError("Bitte E-Mail und Passwort ausfüllen.");

    loading = true;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Login fehlgeschlagen.");

      writeSession({ userId: data.userId, email: data.email, buddyCode: data.buddyCode });
      session = readSession();
      mode = "profile";
      await loadProfile();
    } catch (e) {
      setError(e?.message || "Login fehlgeschlagen.");
    } finally {
      loading = false;
    }
  }

  async function saveProfile() {
    if (!session?.userId) return;

    setError("");
    loading = true;
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.userId,
          name,
          gym,
          trainingLevel,
          goals,
          preferredTimes,
          contact
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Profil konnte nicht gespeichert werden.");

      xp = data?.xp ?? xp;
      level = data?.level ?? level;
      trainingsCount = data?.trainingsCount ?? trainingsCount;
      profileBonusApplied = !!data?.profileBonusApplied;
    } catch (e) {
      setError(e?.message || "Profil konnte nicht gespeichert werden.");
    } finally {
      loading = false;
    }
  }

  async function deleteAccount() {
    if (!session?.userId) return;

    const ok = confirm("Account wirklich löschen?");
    if (!ok) return;

    setError("");
    loading = true;
    try {
      const res = await fetch("/api/auth/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.userId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Account konnte nicht gelöscht werden.");

      clearSession();
      session = readSession();
      mode = "login";
    } catch (e) {
      setError(e?.message || "Account konnte nicht gelöscht werden.");
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const unsubscribe = subscribeSession((s) => {
      session = s;
      if (s?.userId) {
        mode = "profile";
        loadProfile();
      } else {
        mode = "login";
      }
    });

    if (session?.userId) {
      mode = "profile";
      loadProfile();
    }

    return unsubscribe;
  });
</script>

<div class="container py-4">
  <h1 class="mb-1">Mein GymBuddy-Profil</h1>

  {#if isAuthenticated}
    <div class="text-muted mb-4">
      Angemeldet als <strong>{session?.email}</strong>
      {#if buddyCode}
        <span class="ms-3">ID: <strong>{buddyCode}</strong></span>
      {/if}
    </div>
  {/if}

  {#if error}
    <div class="alert alert-danger">{error}</div>
  {/if}

  {#if loading}
    <div class="alert alert-info">Lade...</div>
  {/if}

  {#if !isAuthenticated}
    <div class="card mb-3">
      <div class="card-body">
        <div class="d-flex gap-2 mb-3">
          <button
            class={"btn " + (mode === "login" ? "btn-primary" : "btn-outline-primary")}
            type="button"
            onclick={() => (mode = "login")}
          >
            Login
          </button>
          <button
            class={"btn " + (mode === "register" ? "btn-primary" : "btn-outline-primary")}
            type="button"
            onclick={() => (mode = "register")}
          >
            Registrieren
          </button>
        </div>

        <div class="mb-3">
          <label class="form-label" for="email">E-Mail</label>
          <input id="email" class="form-control" type="email" bind:value={email} />
        </div>

        <div class="mb-3">
          <label class="form-label" for="pw">Passwort</label>
          <input id="pw" class="form-control" type="password" bind:value={password} />
        </div>

        {#if mode === "register"}
          <div class="mb-3">
            <label class="form-label" for="pw2">Passwort wiederholen</label>
            <input id="pw2" class="form-control" type="password" bind:value={password2} />
          </div>

          <button class="btn btn-success" type="button" onclick={doRegister} disabled={loading}>
            Account erstellen
          </button>
        {:else}
          <button class="btn btn-success" type="button" onclick={doLogin} disabled={loading}>
            Einloggen
          </button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="card">
      <div class="card-body">
        <label class="form-label" for="name">Name / Nickname</label>
        <input id="name" class="form-control mb-3" bind:value={name} />

        <label class="form-label" for="gym">Gym / Standort</label>
        <input id="gym" class="form-control mb-3" bind:value={gym} />

        <label class="form-label" for="levelSelect">Trainingslevel</label>
        <select id="levelSelect" class="form-select mb-3" bind:value={trainingLevel}>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        <label class="form-label" for="goals">Trainingsziele</label>
        <textarea id="goals" class="form-control mb-3" rows="2" bind:value={goals}></textarea>

        <label class="form-label" for="times">Bevorzugte Zeiten</label>
        <input id="times" class="form-control mb-3" bind:value={preferredTimes} />

        <label class="form-label" for="contact">Kontakt</label>
        <input id="contact" class="form-control mb-3" bind:value={contact} />

        <div class="d-flex gap-2 mt-3">
          <button class="btn btn-primary" type="button" onclick={saveProfile} disabled={loading}>
            Profil speichern
          </button>
          <button class="btn btn-outline-danger" type="button" onclick={deleteAccount} disabled={loading}>
            Account löschen
          </button>
        </div>

        <div class="alert alert-info mt-4">
          Für ein vollständig ausgefülltes Profil erhältst du einmalig 30 XP.
          {#if profileBonusApplied}
            <div class="mt-2"><strong>Bonus wurde bereits gutgeschrieben.</strong></div>
          {/if}
        </div>

        <div class="text-muted">
          <strong>Dein Fortschritt:</strong> Level {level} · XP {xp} · Trainings {trainingsCount}
        </div>
      </div>
    </div>
  {/if}
</div>

