export function calculateUserStats(trainings, profile) {
  const list = Array.isArray(trainings) ? trainings : [];

  const soloCount = list.filter((t) => !t.withBuddy).length;
  const buddyCount = list.filter((t) => t.withBuddy).length;

  let xp = soloCount * 10 + buddyCount * 20;

  const profileCompleted =
    profile &&
    profile.name &&
    profile.gym &&
    profile.level;

  if (profileCompleted) {
    xp += 30;
  }

  let level = 1;
  if (xp >= 50 && xp < 150) level = 2;
  else if (xp >= 150 && xp < 300) level = 3;
  else if (xp >= 300 && xp < 600) level = 4;
  else if (xp >= 600) level = 5;

  return { soloCount, buddyCount, xp, level };
}
