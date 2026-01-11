export async function load({ fetch, locals }) {
  if (!locals.userId) {
    return {
      isAuthenticated: false,
      stats: { xp: 0, trainingsCount: 0 }
    };
  }

  const profileRes = await fetch("/api/profile");

  let stats = { xp: 0, trainingsCount: 0 };

  if (profileRes.ok) {
    const pData = await profileRes.json();
    stats.xp = Number(pData?.xp ?? 0);
    stats.trainingsCount = Number(pData?.trainingsCount ?? 0);
  }

  return { isAuthenticated: true, stats };
}
