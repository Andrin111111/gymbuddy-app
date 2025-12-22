// src/lib/gamification.js
// Zentrale Gamification-Logik (XP, Level, Bonus-Regeln)

export const XP_PROFILE_COMPLETE_BONUS = 30;
export const XP_TRAINING_SOLO = 10;
export const XP_TRAINING_WITH_BUDDY = 20;

// Sehr einfache Level-Formel: alle 100 XP ein Level-Up
export function calculateLevel(xp) {
  const safeXp = Number.isFinite(Number(xp)) ? Number(xp) : 0;
  return Math.max(1, Math.floor(safeXp / 100) + 1);
}

export function isProfileComplete(profile) {
  if (!profile) return false;

  const required = ["name", "gym", "trainingLevel", "goals", "preferredTimes", "contact"];
  return required.every((key) => String(profile[key] ?? "").trim().length > 0);
}

/**
 * Berechnet XP + Level aus Trainings + Profil.
 *
 * Signatur passt zu deinem Frontend:
 *   calculateUserStats(trainings, profile, options)
 *
 * trainings: Array von Trainingsobjekten. Falls ein Training das Feld xpAwarded hat, wird das verwendet.
 *            Sonst wird mit withBuddy -> 20 oder ohne -> 10 gerechnet.
 *
 * options.profileBonusGranted:
 *   - true: Bonus ist bereits vergeben, wird immer addiert, auch wenn Profil später wieder unvollständig wird
 *   - false: Bonus wird nur addiert, wenn Profil aktuell vollständig ist
 *
 * options.baseXp:
 *   - Falls du XP bereits in der DB persistierst und nur noch Level rechnen willst,
 *     kannst du baseXp übergeben. Standard ist 0, dann wird XP komplett berechnet.
 */
export function calculateUserStats(trainings = [], profile = {}, options = {}) {
  const list = Array.isArray(trainings) ? trainings : [];

  const {
    profileBonusGranted = false,
    baseXp = 0
  } = options ?? {};

  const trainingsXp = list.reduce((sum, t) => {
    const xpAwarded = Number(t?.xpAwarded);
    if (Number.isFinite(xpAwarded)) return sum + xpAwarded;

    return sum + (t?.withBuddy ? XP_TRAINING_WITH_BUDDY : XP_TRAINING_SOLO);
  }, 0);

  const profileComplete = isProfileComplete(profile);

  const profileXp = profileBonusGranted
    ? XP_PROFILE_COMPLETE_BONUS
    : (profileComplete ? XP_PROFILE_COMPLETE_BONUS : 0);

  const totalXp = Math.max(0, Number(baseXp) + trainingsXp + profileXp);
  const level = calculateLevel(totalXp);

  return {
    xp: totalXp,
    level,
    trainingsCount: list.length,
    profileComplete
  };
}

