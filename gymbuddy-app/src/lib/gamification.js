// src/lib/gamification.js

export const XP_PROFILE_COMPLETE_BONUS = 30;
export const XP_PROFILE_BONUS = XP_PROFILE_COMPLETE_BONUS;

export const XP_TRAINING_SOLO = 10;
export const XP_TRAINING_WITH_BUDDY = 20;

export const XP_PER_TRAINING_ALONE = XP_TRAINING_SOLO;
export const XP_PER_TRAINING_WITH_BUDDY = XP_TRAINING_WITH_BUDDY;

export function calculateLevel(xp) {
  const safeXp = Number.isFinite(Number(xp)) ? Number(xp) : 0;
  return Math.max(1, Math.floor(safeXp / 100) + 1);
}

export function isProfileComplete(profile) {
  if (!profile) return false;

  const name = String(profile.name ?? "").trim();
  const gym = String(profile.gym ?? "").trim();

  const level = String(profile.level ?? profile.trainingLevel ?? "").trim();
  const goals = String(profile.goals ?? "").trim();
  const times = String(profile.trainingTimes ?? profile.preferredTimes ?? "").trim();
  const contact = String(profile.contact ?? "").trim();

  return !!(name && gym && level && goals && times && contact);
}

export function calculateUserStats(trainings = [], profile = {}, options = {}) {
  const list = Array.isArray(trainings) ? trainings : [];
  const { profileBonusGranted = false, baseXp = 0 } = options ?? {};

  let soloCount = 0;
  let buddyCount = 0;

  const trainingsXp = list.reduce((sum, t) => {
    const withBuddy = !!t?.withBuddy;
    if (withBuddy) buddyCount += 1;
    else soloCount += 1;

    const xpAwarded = Number(t?.xpAwarded ?? t?.xpGain);
    if (Number.isFinite(xpAwarded)) return sum + xpAwarded;

    return sum + (withBuddy ? XP_TRAINING_WITH_BUDDY : XP_TRAINING_SOLO);
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
    soloCount,
    buddyCount,
    profileComplete
  };
}
