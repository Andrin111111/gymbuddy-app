<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { readSession, writeSession, clearSession, subscribeSession, refreshSession, csrfHeader } from "$lib/session.js";
  import { RANK_ICONS } from "$lib/ranks.config.js";
  const ACHIEVEMENT_ICONS = import.meta.glob("$lib/assets/achievements/*.svg", { as: "url", eager: true });

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
  let visibility = $state("friends");
  let allowCodeLookup = $state(true);
  let feedOptIn = $state(false);
  let addressLine1 = $state("");
  let addressLine2 = $state("");
  let postalCode = $state("");
  let city = $state("");
  let country = $state("CH");
  let geoUpdatedAt = $state(null);
  let geoStatus = $state("");

  let xp = $state(0);
  let lifetimeXp = $state(0);
  let seasonXp = $state(0);
  let level = $state(1);
  let trainingsCount = $state(0);
  let profileBonusApplied = $state(false);
  let rankInfo = $state(null);
  let achievements = $state([]);
  let achievementsLoading = $state(false);
  let achievementsError = $state("");
  let achievementsUnlocked = $derived(achievements.filter((a) => a.unlockedAt).length);
  let notifications = $state([]);
  let notificationsLoading = $state(false);
  let notificationsError = $state("");

  function setError(msg) {
    error = msg || "";
  }

  function rankIcon(key) {
    return RANK_ICONS[key] || RANK_ICONS.apex;
  }

  function achievementIcon(key) {
    const path = `/src/lib/assets/achievements/${key}.svg`;
    return ACHIEVEMENT_ICONS[path] || Object.values(ACHIEVEMENT_ICONS)[0] || "";
  }

  async function loadRank() {
    try {
      const res = await fetch("/api/ranks/me");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      rankInfo = data?.rank
        ? {
            ...data.rank,
            lifetimeXp: data.lifetimeXp ?? data.rank.lifetimeXp,
            seasonXp: data.seasonXp ?? 0,
            seasonId: data.seasonId ?? ""
          }
        : null;
    } catch {
      rankInfo = null;
    }
  }

  async function loadAchievements() {
    if (!session?.userId) {
      achievements = [];
      achievementsError = "";
      return;
    }
    achievementsError = "";
    achievementsLoading = true;
    try {
      const res = await fetch("/api/achievements/me");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Achievements konnten nicht geladen werden.");
      achievements = Array.isArray(data?.all) ? data.all : [];
    } catch (e) {
      achievementsError = e?.message || "Achievements konnten nicht geladen werden.";
      achievements = [];
    } finally {
      achievementsLoading = false;
    }
  }

  async function loadNotifications() {
    if (!session?.userId) {
      notifications = [];
      notificationsError = "";
      return;
    }
    notificationsError = "";
    notificationsLoading = true;
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Notifications konnten nicht geladen werden.");
      notifications = Array.isArray(data?.notifications) ? data.notifications : [];
    } catch (e) {
      notificationsError = e?.message || "Notifications konnten nicht geladen werden.";
      notifications = [];
    } finally {
      notificationsLoading = false;
    }
  }

  async function markRead(id) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST", headers: { ...csrfHeader() } });
      notifications = notifications.map((n) => (n._id === id ? { ...n, read: true } : n));
    } catch {
      // ignore
    }
  }

  async function loadProfile() {
    setError("");
    loading = true;
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Profil konnte nicht geladen werden.");

      const profile = data?.profile ?? data;

      buddyCode = data?.buddyCode ?? profile?.buddyCode ?? "";
      name = profile?.name ?? "";
      gym = profile?.gym ?? "";
      trainingLevel = profile?.trainingLevel ?? "beginner";
      goals = profile?.goals ?? "";
      preferredTimes = profile?.preferredTimes ?? "";
      contact = profile?.contact ?? "";
      visibility = profile?.visibility ?? "friends";
      allowCodeLookup = profile?.allowCodeLookup ?? true;
      feedOptIn = profile?.feedOptIn ?? false;
      addressLine1 = profile?.addressLine1 ?? "";
      addressLine2 = profile?.addressLine2 ?? "";
      postalCode = profile?.postalCode ?? "";
      city = profile?.city ?? "";
      country = profile?.country ?? "CH";
      geoUpdatedAt = data?.geoUpdatedAt ?? null;
      geoStatus = "";

      xp = data?.xp ?? profile?.xp ?? 0;
      lifetimeXp = data?.lifetimeXp ?? xp;
      seasonXp = data?.seasonXp ?? 0;
      level = data?.level ?? profile?.level ?? 1;
      trainingsCount = data?.trainingsCount ?? profile?.trainingsCount ?? 0;
      profileBonusApplied = !!(data?.profileBonusApplied ?? profile?.profileBonusApplied);
      await loadRank();
      await loadAchievements();
      await loadNotifications();
    } catch (e) {
      setError(e?.message || "Profil konnte nicht geladen werden.");
    } finally {
      loading = false;
    }
  }

  async function doRegister() {
    setError("");

    if (!email.trim() || !password) return setError("Bitte E-Mail und Passwort ausfuellen.");
    if (password.length < 6) return setError("Passwort muss mindestens 6 Zeichen haben.");
    if (password !== password2) return setError("Passwoerter stimmen nicht ueberein.");

    loading = true;
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Registrierung fehlgeschlagen.");

      writeSession({ userId: data.userId, email: data.email, buddyCode: data.buddyCode });
      await refreshSession();
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

    if (!email.trim() || !password) return setError("Bitte E-Mail und Passwort ausfuellen.");

    loading = true;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Login fehlgeschlagen.");

      writeSession({ userId: data.userId, email: data.email, buddyCode: data.buddyCode });
      await refreshSession();
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
    setError("");
    loading = true;
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({
          name,
          gym,
          trainingLevel,
          goals,
          preferredTimes,
          contact,
          visibility,
          feedOptIn,
          allowCodeLookup,
          addressLine1,
          addressLine2,
          postalCode,
          city,
          country
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Profil konnte nicht gespeichert werden.");

      const profile = data?.profile ?? data;

      xp = data?.xp ?? profile?.xp ?? xp;
      lifetimeXp = data?.lifetimeXp ?? xp;
      seasonXp = data?.seasonXp ?? seasonXp;
      level = data?.level ?? profile?.level ?? level;
      trainingsCount = data?.trainingsCount ?? profile?.trainingsCount ?? trainingsCount;
      profileBonusApplied = !!(data?.profileBonusApplied ?? profile?.profileBonusApplied);
      await loadRank();
      geoStatus = data?.geoMessage || "";
      geoUpdatedAt = data?.geoUpdatedAt ?? geoUpdatedAt;
    } catch (e) {
      setError(e?.message || "Profil konnte nicht gespeichert werden.");
    } finally {
      loading = false;
    }
  }

  async function deleteAccount() {
    const ok = confirm("Account wirklich loeschen?");
    if (!ok) return;

    setError("");
    loading = true;
    try {
      const res = await fetch("/api/auth/delete", { method: "POST", headers: { ...csrfHeader() } });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Account konnte nicht geloescht werden.");

      clearSession();
      await refreshSession();
      session = readSession();
      mode = "login";
    } catch (e) {
      setError(e?.message || "Account konnte nicht geloescht werden.");
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
        loadRank();
        loadAchievements();
        loadNotifications();
      } else {
        mode = "login";
      }
    });

    if (session?.userId) {
      mode = "profile";
      loadProfile();
      loadRank();
      loadAchievements();
      loadNotifications();
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
    {#if rankInfo}
      <div class="card mb-3">
        <div class="card-body d-flex align-items-center gap-3 flex-wrap">
          <img src={rankIcon(rankInfo.key)} alt={rankInfo.name} width="56" height="56" />
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <div class="fw-semibold">
                  {rankInfo.name} {rankInfo.stars > 0 ? `(Apex ${rankInfo.stars}*)` : ""}
                </div>
                <div class="text-muted small">Lifetime XP: {rankInfo.lifetimeXp} / Season XP: {rankInfo.seasonXp}</div>
              </div>
              {#if rankInfo.seasonId}
                <span class="badge text-bg-secondary">Season {rankInfo.seasonId}</span>
              {/if}
            </div>
            <div class="progress mt-2" style="height: 8px;">
              <div
                class="progress-bar"
                role="progressbar"
                style={`width: ${Math.round((rankInfo.progress || 0) * 100)}%`}
                aria-valuenow={Math.round((rankInfo.progress || 0) * 100)}
                aria-valuemin="0"
                aria-valuemax="100"
              ></div>
            </div>
            {#if rankInfo.nextThreshold}
              <div class="text-muted small mt-1">
                Noch {rankInfo.nextThreshold - rankInfo.lifetimeXp} XP bis {rankInfo.nextName}
              </div>
            {:else}
              <div class="text-muted small mt-1">Apex erreicht</div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

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

        <div class="border rounded p-3 mb-3">
          <h6 class="mb-2">Adresse (für Distanz)</h6>
          <p class="text-muted small mb-2">
            Deine Adresse wird nur zur Distanzberechnung verwendet. Andere Nutzer sehen nur PLZ, Stadt und eine ungefähre Distanz.
          </p>
          <label class="form-label" for="addr1">Adresszeile 1</label>
          <input id="addr1" class="form-control mb-2" bind:value={addressLine1} maxlength="80" />
          <label class="form-label" for="addr2">Adresszeile 2 (optional)</label>
          <input id="addr2" class="form-control mb-2" bind:value={addressLine2} maxlength="80" />
          <div class="row g-2">
            <div class="col-4">
              <label class="form-label" for="postal">PLZ</label>
              <input id="postal" class="form-control mb-2" bind:value={postalCode} maxlength="12" />
            </div>
            <div class="col-8">
              <label class="form-label" for="city">Ort</label>
              <input id="city" class="form-control mb-2" bind:value={city} maxlength="50" />
            </div>
          </div>
          <label class="form-label" for="country">Land</label>
          <input id="country" class="form-control mb-2" bind:value={country} maxlength="50" />
          {#if geoStatus}
            <div class="alert alert-info py-2 my-2">{geoStatus}</div>
          {/if}
          {#if geoUpdatedAt}
            <div class="text-muted small">Letzte Geolokalisierung: {new Date(geoUpdatedAt).toLocaleString()}</div>
          {/if}
        </div>

        <label class="form-label" for="visibility">Sichtbarkeit</label>
        <select id="visibility" class="form-select mb-3" bind:value={visibility}>
          <option value="public">Public</option>
          <option value="friends">Friends Only</option>
          <option value="private">Private</option>
        </select>

        <div class="form-check mb-2">
          <input id="allowCode" class="form-check-input" type="checkbox" bind:checked={allowCodeLookup} />
          <label class="form-check-label" for="allowCode">Suche per Code erlauben (bei Private)</label>
        </div>

        <div class="form-check mb-3">
          <input id="feedOptIn" class="form-check-input" type="checkbox" bind:checked={feedOptIn} />
          <label class="form-check-label" for="feedOptIn">Feed Opt-in</label>
        </div>

        <div class="d-flex gap-2 mt-3">
          <button class="btn btn-primary" type="button" onclick={saveProfile} disabled={loading}>
            Profil speichern
          </button>
          <button class="btn btn-outline-danger" type="button" onclick={deleteAccount} disabled={loading}>
            Account loeschen
          </button>
        </div>

        <div class="alert alert-info mt-4">
          Fuer ein vollstaendig ausgefuelltes Profil erhaeltst du einmalig 30 XP.
          {#if profileBonusApplied}
            <div class="mt-2"><strong>Bonus wurde bereits gutgeschrieben.</strong></div>
          {/if}
        </div>

        <div class="text-muted">
          <strong>Dein Fortschritt:</strong> Level {level} / XP {lifetimeXp} / Trainings {trainingsCount}
        </div>
      </div>
    </div>

    <div class="card mt-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 class="mb-1">Achievements</h5>
            <div class="text-muted small">{achievementsUnlocked} / {achievements.length} freigeschaltet</div>
          </div>
          <button class="btn btn-outline-primary" type="button" onclick={loadAchievements} disabled={achievementsLoading}>
            Aktualisieren
          </button>
        </div>

        {#if achievementsError}
          <div class="alert alert-danger">{achievementsError}</div>
        {/if}
        {#if achievementsLoading && achievements.length === 0}
          <div class="text-muted">Achievements werden geladen...</div>
        {:else if achievements.length === 0}
          <div class="alert alert-info">Noch keine Achievements vorhanden.</div>
        {:else}
          <div class="row row-cols-2 row-cols-md-3 g-3">
            {#each achievements as ach (ach.key)}
              <div class="col">
                <div class={"border rounded p-2 h-100 " + (ach.unlockedAt ? "bg-light" : "bg-body")}>
                  <div class="d-flex gap-2 align-items-center">
                    <img src={achievementIcon(ach.key)} alt={ach.name} width="40" height="40" class="flex-shrink-0 rounded" />
                    <div>
                      <div class="fw-semibold">{ach.name}</div>
                      <div class="text-muted small text-uppercase">{ach.category}</div>
                      {#if ach.unlockedAt}
                        <div class="text-success small">Unlockt: {new Date(ach.unlockedAt).toLocaleDateString()}</div>
                      {:else}
                        <div class="text-muted small">Locked</div>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <div class="card mt-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 class="mb-1">Notifications</h5>
            <div class="text-muted small">{notifications.filter((n) => !n.read).length} ungelesen</div>
          </div>
          <button class="btn btn-outline-primary btn-sm" type="button" onclick={loadNotifications} disabled={notificationsLoading}>
            Aktualisieren
          </button>
        </div>
        {#if notificationsError}
          <div class="alert alert-danger">{notificationsError}</div>
        {/if}
        {#if notificationsLoading && notifications.length === 0}
          <div class="text-muted">Notifications werden geladen...</div>
        {:else if notifications.length === 0}
          <div class="alert alert-info">Keine Notifications.</div>
        {:else}
          <div class="list-group">
            {#each notifications as n (n._id)}
              <div class={"list-group-item d-flex justify-content-between align-items-start " + (n.read ? "" : "bg-light")}>
                <div>
                  <div class="fw-semibold">{n.type}</div>
                  <div class="text-muted small">{n.payload?.message || JSON.stringify(n.payload || {})}</div>
                  <div class="text-muted small">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                {#if !n.read}
                  <button class="btn btn-outline-secondary btn-sm" type="button" onclick={() => markRead(n._id)} disabled={notificationsLoading}>
                    Gelesen
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>







