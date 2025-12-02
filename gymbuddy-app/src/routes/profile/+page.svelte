<script>
  import { onMount } from "svelte";

  const SESSION_KEY = "gymbuddy-session";

  let mode = $state("register"); // 'register' | 'login' | 'profile'

  let session = $state({ userId: "", email: "" });

  let registerForm = $state({
    email: "",
    password: "",
    confirmPassword: ""
  });

  let loginForm = $state({
    email: "",
    password: ""
  });

  let profile = $state({
    name: "",
    gym: "",
    level: "beginner",
    goals: "",
    trainingTimes: "",
    contact: "",
    code: ""
  });

  let authError = $state("");
  let passwordError = $state("");
  let saved = $state(false);
  let loadingProfile = $state(false);
  let deleting = $state(false);

  let showLoginPassword = $state(false);
  let showRegisterPassword = $state(false);
  let showRegisterPassword2 = $state(false);

  function validatePassword(pw) {
    if (pw.length < 8) {
      return "Passwort muss mindestens 8 Zeichen lang sein.";
    }
    if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
      return "Passwort braucht mindestens einen Buchstaben und eine Zahl.";
    }
    if (/\s/.test(pw)) {
      return "Passwort darf keine Leerzeichen enthalten.";
    }
    return "";
  }

  async function loadProfile() {
    if (!session.userId) return;
    loadingProfile = true;
    authError = "";

    try {
      const res = await fetch(`/api/profile?userId=${session.userId}`);
      if (!res.ok) {
        throw new Error("Profil konnte nicht geladen werden.");
      }
      const data = await res.json();
      profile = data.profile || profile;
    } catch (err) {
      console.error(err);
      authError = err.message || "Fehler beim Laden des Profils.";
    } finally {
      loadingProfile = false;
    }
  }

  onMount(() => {
    const s = localStorage.getItem(SESSION_KEY);
    if (s) {
      try {
        const parsed = JSON.parse(s);
        if (parsed.userId && parsed.email) {
          session = parsed;
          mode = "profile";
          loadProfile();
          return;
        }
      } catch {
        // ignore
      }
    }
    mode = "register";
  });

  async function handleRegister(event) {
    event.preventDefault();
    authError = "";
    passwordError = "";

    const email = registerForm.email.trim().toLowerCase();

    if (!email) {
      authError = "Bitte E-Mail eingeben.";
      return;
    }

    const pwError = validatePassword(registerForm.password);
    if (pwError) {
      passwordError = pwError;
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      passwordError = "Passwörter stimmen nicht überein.";
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: registerForm.password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registrierung fehlgeschlagen.");
      }

      session = { userId: data.userId, email: data.email };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      profile = data.profile;
      mode = "profile";
      window.location.href = "/profile";
    } catch (err) {
      console.error(err);
      authError = err.message || "Fehler bei der Registrierung.";
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    authError = "";
    passwordError = "";

    const email = loginForm.email.trim().toLowerCase();
    if (!email) {
      authError = "Bitte E-Mail eingeben.";
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: loginForm.password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login fehlgeschlagen.");
      }

      session = { userId: data.userId, email: data.email };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      profile = data.profile;
      mode = "profile";
      window.location.href = "/profile";
    } catch (err) {
      console.error(err);
      authError = err.message || "Fehler beim Login.";
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    authError = "";

    if (!session.userId) {
      authError = "Keine aktive Sitzung. Bitte erneut anmelden.";
      mode = "login";
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.userId,
          profileUpdates: {
            name: profile.name,
            gym: profile.gym,
            level: profile.level,
            goals: profile.goals,
            trainingTimes: profile.trainingTimes,
            contact: profile.contact
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Profil konnte nicht gespeichert werden.");
      }

      profile = data.profile;
      saved = true;
      setTimeout(() => {
        saved = false;
      }, 2000);
    } catch (err) {
      console.error(err);
      authError = err.message || "Fehler beim Speichern des Profils.";
    }
  }

  async function deleteAccount() {
    if (!session.userId) return;
    if (!confirm("Möchtest du deinen Account wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      return;
    }

    deleting = true;
    authError = "";

    try {
      const res = await fetch("/api/auth/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.userId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Account konnte nicht gelöscht werden.");
      }

      localStorage.removeItem(SESSION_KEY);
      session = { userId: "", email: "" };
      profile = {
        name: "",
        gym: "",
        level: "beginner",
        goals: "",
        trainingTimes: "",
        contact: "",
        code: ""
      };
      mode = "register";
      window.location.href = "/profile";
    } catch (err) {
      console.error(err);
      authError = err.message || "Fehler beim Löschen des Accounts.";
    } finally {
      deleting = false;
    }
  }
</script>

<h1>Mein GymBuddy-Profil</h1>

{#if mode === "register"}
  <div class="mt-3">
    <h2 class="h5">Konto erstellen</h2>
    <p class="text-muted">
      Lege einmalig ein Konto mit E-Mail und Passwort an. Danach meldest du dich
      immer mit diesen Daten an.
    </p>

    <form class="mt-2" onsubmit={handleRegister}>
      <div class="mb-3">
        <label class="form-label" for="regEmail">E-Mail</label>
        <input
          id="regEmail"
          type="email"
          class="form-control"
          bind:value={registerForm.email}
          required
        />
      </div>

      <div class="mb-3">
        <label class="form-label" for="regPassword">Passwort</label>
        <div class="input-group">
          <input
            id="regPassword"
            type={showRegisterPassword ? "text" : "password"}
            class="form-control"
            bind:value={registerForm.password}
            required
          />
          <button
            type="button"
            class="btn btn-outline-secondary"
            onclick={() => (showRegisterPassword = !showRegisterPassword)}
          >
            {showRegisterPassword ? "Verbergen" : "Anzeigen"}
          </button>
        </div>
        <div class="form-text">
          Mindestens 8 Zeichen, mindestens ein Buchstabe und eine Zahl, keine Leerzeichen.
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label" for="regPassword2">Passwort wiederholen</label>
        <div class="input-group">
          <input
            id="regPassword2"
            type={showRegisterPassword2 ? "text" : "password"}
            class="form-control"
            bind:value={registerForm.confirmPassword}
            required
          />
          <button
            type="button"
            class="btn btn-outline-secondary"
            onclick={() => (showRegisterPassword2 = !showRegisterPassword2)}
          >
            {showRegisterPassword2 ? "Verbergen" : "Anzeigen"}
          </button>
        </div>
      </div>

      {#if passwordError}
        <div class="alert alert-danger py-2">{passwordError}</div>
      {/if}

      {#if authError}
        <div class="alert alert-danger py-2">{authError}</div>
      {/if}

      <button type="submit" class="btn btn-primary">
        Konto erstellen
      </button>

      <button
        type="button"
        class="btn btn-link"
        onclick={() => {
          mode = "login";
          authError = "";
          passwordError = "";
        }}
      >
        Ich habe bereits ein Konto
      </button>
    </form>
  </div>
{:else if mode === "login"}
  <div class="mt-3">
    <h2 class="h5">Anmelden</h2>
    <p class="text-muted">
      Melde dich mit deiner registrierten E-Mail und deinem Passwort an.
    </p>

    <form class="mt-2" onsubmit={handleLogin}>
      <div class="mb-3">
        <label class="form-label" for="loginEmail">E-Mail</label>
        <input
          id="loginEmail"
          type="email"
          class="form-control"
          bind:value={loginForm.email}
          required
        />
      </div>

      <div class="mb-3">
        <label class="form-label" for="loginPassword">Passwort</label>
        <div class="input-group">
          <input
            id="loginPassword"
            type={showLoginPassword ? "text" : "password"}
            class="form-control"
            bind:value={loginForm.password}
            required
          />
          <button
            type="button"
            class="btn btn-outline-secondary"
            onclick={() => (showLoginPassword = !showLoginPassword)}
          >
            {showLoginPassword ? "Verbergen" : "Anzeigen"}
          </button>
        </div>
      </div>

      {#if authError}
        <div class="alert alert-danger py-2">{authError}</div>
      {/if}

      <button type="submit" class="btn btn-primary">
        Anmelden
      </button>

      <button
        type="button"
        class="btn btn-link"
        onclick={() => {
          mode = "register";
          authError = "";
          passwordError = "";
        }}
      >
        Ich brauche noch ein Konto
      </button>
    </form>
  </div>
{:else}
  <p class="text-muted mt-2">
    Angemeldet als <strong>{session.email}</strong>
  </p>

  {#if loadingProfile}
    <p>Profil wird geladen...</p>
  {:else}
    <form class="mt-3" onsubmit={handleProfileSubmit}>
      <div class="mb-3">
        <label for="name" class="form-label">Name / Nickname</label>
        <input
          id="name"
          type="text"
          class="form-control"
          bind:value={profile.name}
          required
        />
      </div>

      <div class="mb-3">
        <label for="gym" class="form-label">Gym / Standort</label>
        <input
          id="gym"
          type="text"
          class="form-control"
          placeholder="z.B. Activ Fitness Winterthur"
          bind:value={profile.gym}
          required
        />
      </div>

      <div class="mb-3">
        <label for="level" class="form-label">Trainingslevel</label>
        <select
          id="level"
          class="form-select"
          bind:value={profile.level}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div class="mb-3">
        <label for="goals" class="form-label">Trainingsziele</label>
        <textarea
          id="goals"
          class="form-control"
          rows="3"
          placeholder="z.B. Muskelaufbau, Technik verbessern..."
          bind:value={profile.goals}
        ></textarea>
      </div>

      <div class="mb-3">
        <label for="times" class="form-label">Bevorzugte Zeiten</label>
        <input
          id="times"
          type="text"
          class="form-control"
          placeholder="z.B. Mo, Mi, Fr ab 18:00"
          bind:value={profile.trainingTimes}
        />
      </div>

      <div class="mb-3">
        <label for="contact" class="form-label">Kontakt (Instagram, E-Mail ...)</label>
        <input
          id="contact"
          type="text"
          class="form-control"
          placeholder="@deininsta oder deine Mail"
          bind:value={profile.contact}
        />
      </div>

      {#if profile.code}
        <div class="mb-3">
          <label class="form-label" for="profileCode">Deine GymBuddy ID</label>
          <input
            id="profileCode"
            type="text"
            class="form-control"
            value={profile.code}
            readonly
          />
          <div class="form-text">
            Diese ID wird automatisch vergeben und kann nicht geändert werden.
          </div>
        </div>
      {/if}

      {#if authError}
        <div class="alert alert-danger py-2">{authError}</div>
      {/if}

      <button type="submit" class="btn btn-primary">
        Profil speichern
      </button>

      {#if saved}
        <span class="ms-2 text-success">Gespeichert ✅</span>
      {/if}
    </form>

    <div class="mt-4">
      <button
        type="button"
        class="btn btn-outline-danger"
        onclick={deleteAccount}
        disabled={deleting}
      >
        {deleting ? "Account wird gelöscht..." : "Account löschen"}
      </button>
    </div>

    <div class="alert alert-info mt-4">
      Für ein vollständig ausgefülltes Profil erhältst du einmalig 30 XP (in deinem
      Gamification-System).
    </div>
  {/if}
{/if}

