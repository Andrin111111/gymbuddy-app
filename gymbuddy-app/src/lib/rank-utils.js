import { RANKS } from "$lib/ranks.config.js";

export function rankNameFromXp(xp) {
  const safeXp = Number.isFinite(Number(xp)) ? Number(xp) : 0;
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (safeXp >= rank.xp) current = rank;
  }
  return current?.name || "Starter";
}
