<script>
  import { onMount } from "svelte";
  import { readSession, writeSession, clearSession, subscribeSession, refreshSession, csrfHeader } from "$lib/session.js";
  import { RANK_ICONS } from "$lib/ranks.config.js";
  import { rankNameFromXp } from "$lib/rank-utils.js";
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

  let xp = $state(0);
  let lifetimeXp = $state(0);
  let seasonXp = $state(0);
  let trainingsCount = $state(0);
  let profileBonusApplied = $state(false);
  let rankInfo = $state(null);
  let achievements = $state([]);
  let achievementsLoading = $state(false);
  let achievementsError = $state("");
  let achievementsUnlocked = $derived(achievements.filter((a) => a.unlockedAt).length);
  let rankLabel = $derived(rankInfo?.name || rankNameFromXp(lifetimeXp || xp));
  let notifications = $state([]);
  let notificationsLoading = $state(false);
  let notificationsError = $state("");
  const DEMO_NAME_MAP = {
    "demo-auto-1": "Autoaccept Demo 1",
    "demo-auto-2": "Autoaccept Demo 2",
    "demo-auto-3": "Autoaccept Demo 3"
  };
  const NOTIFICATION_LABELS = {
    friend_request_received: "Neue Freundschaftsanfrage",
    friend_request_accepted: "Freundschaft akzeptiert",
    achievement_unlocked: "Achievement freigeschaltet"
  };
  const preferredOptions = ["Morgen", "Mittag", "Abend", "Wochenende", "Flexibel"];

  async function parseJsonSafe(res) {
    try {
      return await res.json();
    } catch {
      try {
        const txt = await res.text();
        return { error: txt };
      } catch {
        return {};
      }
    }
  }

  async function handleUnauthorized(res) {
    if (res?.status === 401) {
      clearSession();
      await refreshSession();
      session = readSession();
      mode = "login";
      return true;
    }
    return false;
  }

  function setError(msg) {
    error = msg || "";
  }

  function rankIcon(key) {
    return RANK_ICONS[key] || RANK_ICONS.apex;
  }

  function resolveName(id, fallback = "") {
    if (!id) return fallback;
    const raw = String(id);
    if (DEMO_NAME_MAP[raw]) return DEMO_NAME_MAP[raw];
    if (/^[a-f0-9]{24}$/i.test(raw)) return fallback;
    return raw;
  }

  function notificationTitle(n) {
    return NOTIFICATION_LABELS[n.type] || n.type;
  }

  function notificationBody(n) {
    const p = n?.payload || {};
    if (n.type === "friend_request_received") {
      const fromId = p.fromUserId || p.byUserId;
      return fromId ? `Von ${resolveName(fromId, "Buddy")}` : "Neue Anfrage erhalten.";
    }
    if (n.type === "friend_request_accepted" && p.byUserId) {
      return `${resolveName(p.byUserId, "Buddy")} hat angenommen`;
    }
    if (n.type === "achievement_unlocked" && p.key) {
      const a = achievements.find((x) => x.key === p.key);
      return a ? `${a.name} - ${a.description || ""}` : `Achievement: ${p.key}`;
    }
    if (p.message) return String(p.message);
    if (p.text) return String(p.text);
    if (Object.keys(p).length === 0) return "Keine weiteren Details.";
    return "Details verfuegbar.";
  }

  function achievementIcon(key) {
    const path = `/src/lib/assets/achievements/${key}.svg`;
    return ACHIEVEMENT_ICONS[path] || Object.values(ACHIEVEMENT_ICONS)[0] || "";
  }

  async function loadRank() {
    try {
      const res = await fetch("/api/ranks/me");
      if (await handleUnauthorized(res)) return;
      const data = await parseJsonSafe(res);
      if (!res.ok) return;
      rankInfo = data?.rank
        ? {
            ...data.rank,
            lifetimeXp: data.lifetimeXp ?? data.rank.lifetimeXp,
            seasonXp: data.seasonXp ?? 0,
            seasonId: data.seasonId ?? ""
          }
        : null;
      if (rankInfo) {
        lifetimeXp = Math.max(lifetimeXp, Number(rankInfo.lifetimeXp ?? 0));
        seasonXp = Math.max(seasonXp, Number(rankInfo.seasonXp ?? seasonXp));
        xp = Math.max(xp, Number(rankInfo.lifetimeXp ?? xp));
      }
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
      if (await handleUnauthorized(res)) return;
      const data = await parseJsonSafe(res);
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
      if (await handleUnauthorized(res)) return;
      const data = await parseJsonSafe(res);
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

  async function loadProfile(withExtras = true) {
    setError("");
    loading = true;
    try {
      const res = await fetch("/api/profile");
      if (await handleUnauthorized(res)) return;
      const data = await parseJsonSafe(res);
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

      xp = profile?.xp ?? 0;
      lifetimeXp = profile?.lifetimeXp ?? xp;
      seasonXp = profile?.seasonXp ?? 0;
      trainingsCount = profile?.trainingsCount ?? 0;
      profileBonusApplied = !!profile?.profileBonusApplied;

      if (withExtras) {
        loadRank();
        loadAchievements();
        loadNotifications();
      }
    } catch (e) {
      setError(e?.message || "Profil konnte nicht geladen werden.");
    } finally {
      loading = false;
    }
  }

  async function doRegister() {
    setError("");

    if (password !== password2) return setError("Passwörter stimmen nicht überein.");

    loading = true;
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || "Registrierung fehlgeschlagen.");

      const newSession = { userId: data.userId, email: data.email, buddyCode: data.buddyCode };
      writeSession(newSession);
      session = newSession;
      await refreshSession();
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
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || "Login fehlgeschlagen.");

      const newSession = { userId: data.userId, email: data.email, buddyCode: data.buddyCode };
      writeSession(newSession);
      session = newSession;
      await refreshSession();
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
      const safeContact = (contact || "").trim();
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({
          name,
          gym,
          trainingLevel,
          goals,
          preferredTimes,
          contact: safeContact,
          visibility,
          allowCodeLookup: true
        })
      });

      if (await handleUnauthorized(res)) return;
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || "Profil konnte nicht gespeichert werden.");

      const profile = data?.profile ?? data;

      xp = data?.xp ?? profile?.xp ?? xp;
      lifetimeXp = data?.lifetimeXp ?? xp;
      seasonXp = data?.seasonXp ?? seasonXp;
      trainingsCount = data?.trainingsCount ?? profile?.trainingsCount ?? trainingsCount;
      profileBonusApplied = !!(data?.profileBonusApplied ?? profile?.profileBonusApplied);
      await loadRank();
    } catch (e) {
      setError(e?.message || "Profil konnte nicht gespeichert werden.");
    } finally {
      loading = false;
    }
  }

  async function deleteAccount() {
    const ok = confirm("Account wirklich löschen?");
    if (!ok) return;

    setError("");
    loading = true;
    try {
      const res = await fetch("/api/auth/delete", { method: "POST", headers: { ...csrfHeader() } });

      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || "Account konnte nicht gelöscht werden.");

      clearSession();
      await refreshSession();
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
        loadProfile(true);
      } else {
        mode = "login";
      }
    });

    if (session?.userId) {
      mode = "profile";
      loadProfile(true);
    }

    return unsubscribe;
  });
</script>

<div class="page-shell py-4 px-3">
  <div class="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-3">
    <div>
      <h1 class="mb-1">Mein GymBuddy-Profil</h1>
      <p class="muted-subtitle mb-0">Login, Privatsphäre und Fortschritt im modernen Look.</p>
    </div>
    {#if isAuthenticated}
      <div class="pill">
        <span>{session?.email}</span>
        {#if buddyCode}
          <span class="badge text-bg-light">Buddy-ID {buddyCode}</span>
        {/if}
      </div>
    {/if}
  </div>

  {#if error}
    <div class="error-banner mb-3">{error}</div>
  {/if}

  {#if loading}
    <div class="success-banner mb-3">Lade ...</div>
  {/if}

  {#if !isAuthenticated}
    <div class="card shadow-soft">
      <div class="card-body p-4">
        <div class="d-flex gap-2 mb-4">
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

        <div class="row g-3">
          <div class="col-12">
            <label class="form-label" for="email">E-Mail</label>
            <input id="email" class="form-control" type="email" bind:value={email} placeholder="name@mail.ch" />
          </div>

          <div class="col-12">
            <label class="form-label" for="pw">Passwort</label>
            <input id="pw" class="form-control" type="password" bind:value={password} />
          </div>

          {#if mode === "register"}
            <div class="col-12">
              <label class="form-label" for="pw2">Passwort wiederholen</label>
              <input id="pw2" class="form-control" type="password" bind:value={password2} />
            </div>

            <div class="col-12 d-flex gap-2">
              <button class="btn btn-primary" type="button" onclick={doRegister} disabled={loading}>
                Account erstellen
              </button>
            </div>
          {:else}
            <div class="col-12 d-flex gap-2">
              <button class="btn btn-primary" type="button" onclick={doLogin} disabled={loading}>
                Einloggen
              </button>
            </div>
          {/if}
        </div>

        <div class="text-muted small mt-3">
          Passwortanforderungen: mindestens 8 Zeichen und eine Zahl.
        </div>
      </div>
    </div>
  {:else}
    {#if rankInfo}
      <div class="card card-gamification mb-3">
        <div class="card-body d-flex align-items-center gap-3 flex-wrap">
          <img src={rankIcon(rankInfo.key)} alt={rankInfo.name} width="56" height="56" />
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <div class="fw-semibold">
                  {rankInfo.name} {rankInfo.stars > 0 ? `(Apex ${rankInfo.stars}*)` : ""}
                </div>
                <div class="text-muted small">Lifetime XP: {rankInfo.lifetimeXp} - Season XP: {rankInfo.seasonXp}</div>
              </div>
              {#if rankInfo.seasonId}
                <span class="badge text-bg-info">Season {rankInfo.seasonId}</span>
              {/if}
            </div>
            <div class="progress mt-2">
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

    <div class="card shadow-soft mb-4">
      <div class="card-body p-4">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 class="mb-1">Profil &amp; Sichtbarkeit</h5>
            <div class="text-muted small">Stammdaten, Ziele und Erreichbarkeit.</div>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <span class="badge text-bg-light">Rank {rankLabel}</span>
            <span class="badge text-bg-light">Trainings {trainingsCount}</span>
          </div>
        </div>

        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label" for="name">Name / Nickname</label>
            <input id="name" class="form-control" bind:value={name} placeholder="Dein Anzeigename" />
          </div>

          <div class="col-md-6">
            <label class="form-label" for="gym">Gym / Standort</label>
            <input id="gym" class="form-control" bind:value={gym} placeholder="z.B. Basefit Zürich" />
          </div>

          <div class="col-md-6">
            <label class="form-label" for="levelSelect">Trainingslevel</label>
            <select id="levelSelect" class="form-select" bind:value={trainingLevel}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label" for="times">Bevorzugte Zeiten</label>
            <select id="times" class="form-select" bind:value={preferredTimes}>
              <option value="">Bitte wählen</option>
              {#each preferredOptions as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>
          </div>

          <div class="col-12">
            <label class="form-label" for="goals">Trainingsziele</label>
            <textarea
              id="goals"
              class="form-control"
              rows="2"
              bind:value={goals}
              placeholder="z.B. Hypertrophie, Ausdauer, Gewichtsreduktion"
            ></textarea>
          </div>

          <div class="col-md-6">
            <label class="form-label" for="contact">Kontakt</label>
            <input
              id="contact"
              class="form-control"
              inputmode="email"
              bind:value={contact}
              placeholder="@handle oder E-Mail"
            />
            <div class="text-muted small mt-1">
              Kontakt ist für andere sichtbar, wenn deine Sichtbarkeit dies erlaubt.
            </div>
          </div>


          <div class="col-md-6">
            <label class="form-label" for="visibility">Sichtbarkeit</label>
            <select id="visibility" class="form-select" bind:value={visibility}>
              <option value="public">Öffentlich</option>
              <option value="friends">Nur Freunde</option>
              <option value="private">Privat</option>
            </select>
            <div class="text-muted small mt-1">
              Steuert, wer dich in der Suche sieht.
            </div>
          </div>

        </div>

        <div class="d-flex gap-2 flex-wrap mt-4">
          <button class="btn btn-primary" type="button" onclick={saveProfile} disabled={loading}>
            Profil speichern
          </button>
          <button class="btn btn-outline-danger" type="button" onclick={deleteAccount} disabled={loading}>
            Account löschen
          </button>
        </div>

        <div class="success-banner mt-3">
          Für ein vollständig ausgefülltes Profil erhältst du einmalig 30 XP.
          {#if profileBonusApplied}
            <div class="mt-2"><strong>Bonus wurde bereits gutgeschrieben.</strong></div>
          {/if}
        </div>
      </div>
    </div>

    <div class="card shadow-soft mb-4">
      <div class="card-body p-4">
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
          <div class="error-banner mb-3">{achievementsError}</div>
        {/if}
        {#if achievementsLoading && achievements.length === 0}
          <div class="text-muted">Achievements werden geladen...</div>
        {:else if achievements.length === 0}
          <div class="empty-state">Noch keine Achievements vorhanden.</div>
        {:else}
              <div class="card-grid">
                {#each achievements as ach (ach.key)}
                  <div class="rounded-12 border p-3 h-100" style={`background:${ach.unlockedAt ? 'var(--surface-alt)' : 'var(--surface)'}`}>
                    <div class="d-flex gap-3 align-items-center">
                      <img src={achievementIcon(ach.key)} alt={ach.name} width="44" height="44" class="flex-shrink-0 rounded" />
                      <div class="w-100">
                        <div class="fw-semibold">{ach.name}</div>
                        <div class="text-muted small text-uppercase">{ach.category}</div>
                        {#if ach.unlockedAt}
                          <div class="text-success small">Freigeschaltet: {new Date(ach.unlockedAt).toLocaleDateString()}</div>
                        {:else}
                          <div class="text-muted small">Gesperrt</div>
                        {/if}
                        <details class="small mt-1">
                          <summary class="text-primary">Was tun?</summary>
                          <div class="text-muted">{ach.description || "Schalte dieses Achievement durch Fortschritt frei."}</div>
                        </details>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

    <div class="card shadow-soft">
      <div class="card-body p-4">
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
          <div class="error-banner mb-3">{notificationsError}</div>
        {/if}
        {#if notificationsLoading && notifications.length === 0}
          <div class="text-muted">Notifications werden geladen...</div>
        {:else if notifications.length === 0}
          <div class="empty-state">Keine Notifications.</div>
        {:else}
          <div class="list-group">
            {#each notifications as n (n._id)}
              <div class={"list-group-item d-flex justify-content-between align-items-start gap-3 " + (n.read ? "" : "bg-light")}>
                <div>
                  <div class="fw-semibold">{notificationTitle(n)}</div>
                  <div class="text-muted small">{notificationBody(n)}</div>
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
