// src/lib/gamification.js
// Zentrale Gamification Logik

export const XP_PROFILE_BONUS = 30;
export const XP_PROFILE_COMPLETE_BONUS = XP_PROFILE_BONUS;

export const XP_TRAINING_SOLO = 10;
export const XP_TRAINING_WITH_BUDDY = 20;

// Aliases fuer alte Imports
export const XP_TRAINING_ALONE = XP_TRAINING_SOLO;
export const XP_PER_TRAINING = XP_TRAINING_SOLO;
export const XP_PER_TRAINING_ALONE = XP_TRAINING_SOLO;
export const XP_PER_TRAINING_WITH_BUDDY = XP_TRAINING_WITH_BUDDY;

export function calculateTrainingXp(withBuddy) {
  return withBuddy ? XP_TRAINING_WITH_BUDDY : XP_TRAINING_SOLO;
}

export function calculateLevel(xp) {
  const safeXp = Number.isFinite(Number(xp)) ? Number(xp) : 0;
  return Math.max(1, Math.floor(safeXp / 100) + 1);
}

export function isProfileComplete(profile) {
  if (!profile) return false;

  const name = String(profile.name ?? "").trim();
  const gym = String(profile.gym ?? "").trim();

  const trainingLevel = String(
    profile.trainingLevel ?? profile.level ?? ""
  ).trim();

  const goals = String(profile.goals ?? "").trim();

  const preferredTimes = String(
    profile.preferredTimes ?? profile.trainingTimes ?? ""
  ).trim();

  const contact = String(profile.contact ?? "").trim();

  return Boolean(
    name &&
      gym &&
      trainingLevel &&
      goals &&
      preferredTimes &&
      contact
  );
}

// Optional fuer alte Startseite
export function calculateUserStats(trainings, profile, options = {}) {
  const list = Array.isArray(trainings) ? trainings : [];

  const baseXp = Number.isFinite(Number(options.baseXp)) ? Number(options.baseXp) : 0;

  const trainingsXp = list.reduce((sum, t) => {
    const gain =
      Number.isFinite(Number(t?.xpGain))
        ? Number(t.xpGain)
        : calculateTrainingXp(Boolean(t?.withBuddy));
    return sum + gain;
  }, 0);

  const profileComplete = isProfileComplete(profile);

  const profileBonusApplied = Boolean(options.profileBonusApplied);
  const profileXp = profileBonusApplied ? XP_PROFILE_BONUS : (profileComplete ? XP_PROFILE_BONUS : 0);

  const totalXp = Math.max(0, baseXp + trainingsXp + profileXp);
  const level = calculateLevel(totalXp);

  return {
    xp: totalXp,
    level,
    trainingsCount: list.length,
    profileComplete
  };
}
