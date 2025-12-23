// src/lib/gamification.js
// Zentrale Gamification-Logik (XP, Level, Bonus-Regeln)

export const XP_PROFILE_BONUS = 30;
export const XP_PER_TRAINING_ALONE = 10;
export const XP_PER_TRAINING_WITH_BUDDY = 20;

// Backwards compatible aliases (older imports)
export const XP_PROFILE_COMPLETE_BONUS = XP_PROFILE_BONUS;
export const XP_TRAINING_SOLO = XP_PER_TRAINING_ALONE;
export const XP_TRAINING_WITH_BUDDY = XP_PER_TRAINING_WITH_BUDDY;
export const XP_PROFILE_COMPLETE_BONUS_OLD = XP_PROFILE_BONUS;
export const XP_TRAINING_SOLO_OLD = XP_PER_TRAINING_ALONE;
export const XP_TRAINING_WITH_BUDDY_OLD = XP_PER_TRAINING_WITH_BUDDY;

export function calculateLevel(xp) {
  const safeXp = Number.isFinite(Number(xp)) ? Number(xp) : 0;
  return Math.max(1, Math.floor(safeXp / 100) + 1);
}

export function isProfileComplete(profile) {
  if (!profile) return false;

  const required = [
    "name",
    "gym",
    "level",
    "goals",
    "trainingTimes",
    "contact"
  ];

  return required.every((key) => String(profile?.[key] ?? "").trim().length > 0);
}

export function calculateUserStats(trainings = [], profile = {}, options = {}) {
  const list = Array.isArray(trainings) ? trainings : [];

  const { profileBonusApplied = false, baseXp = 0 } = options ?? {};

  const trainingsXp = list.reduce((sum, t) => {
    const xpAwarded = Number(t?.xpGain ?? t?.xpAwarded);
    if (Number.isFinite(xpAwarded)) return sum + xpAwarded;
    return sum + (t?.withBuddy ? XP_PER_TRAINING_WITH_BUDDY : XP_PER_TRAINING_ALONE);
  }, 0);

  const profileComplete = isProfileComplete(profile);

  const profileXp = profileBonusApplied
    ? XP_PROFILE_BONUS
    : profileComplete
      ? XP_PROFILE_BONUS
      : 0;

  const totalXp = Math.max(0, Number(baseXp) + trainingsXp + profileXp);
  const level = calculateLevel(totalXp);

  const buddyCount = list.filter((t) => !!t?.withBuddy).length;
  const soloCount = list.length - buddyCount;

  return {
    xp: totalXp,
    level,
    trainingsCount: list.length,
    soloCount,
    buddyCount,
    profileComplete
  };
}
