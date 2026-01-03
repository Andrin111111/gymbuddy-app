export async function load({ fetch, locals }) {
  // 1. Prüfen ob eingeloggt
  if (!locals.userId) {
    return {
      isAuthenticated: false,
      stats: { xp: 0, level: 1, trainingsCount: 0 },
      suggestions: []
    };
  }

  // 2. Parallel Daten laden (schneller als nacheinander)
  const [profileRes, suggestionsRes] = await Promise.all([
    fetch("/api/profile"),
    fetch("/api/buddies/suggestions")
  ]);

  let stats = { xp: 0, level: 1, trainingsCount: 0 };
  let suggestions = [];

  if (profileRes.ok) {
    const pData = await profileRes.json();
    stats.xp = Number(pData?.xp ?? 0);
    stats.trainingsCount = Number(pData?.trainingsCount ?? 0);
    stats.level = Number(pData?.level ?? 1);
  }

  if (suggestionsRes.ok) {
    const sData = await suggestionsRes.json();
    suggestions = Array.isArray(sData?.suggestions) ? sData.suggestions : [];
  }

  return { isAuthenticated: true, stats, suggestions };
}