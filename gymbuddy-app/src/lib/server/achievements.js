// src/lib/server/achievements.js
import { getDb } from "./mongo.js";
import { getRankFromXp } from "./ranks.js";

export const ACHIEVEMENTS_CATALOG = [
  // Streak
  { key: "streak_3", name: "Streak 3", category: "streak", description: "Logge Workouts an 3 Tagen in Folge." },
  { key: "streak_7", name: "Streak 7", category: "streak", description: "Logge Workouts an 7 Tagen in Folge." },
  { key: "streak_14", name: "Streak 14", category: "streak", description: "Logge Workouts an 14 Tagen in Folge." },
  { key: "streak_30", name: "Streak 30", category: "streak", description: "Logge Workouts an 30 Tagen in Folge." },
  { key: "streak_100", name: "Streak 100", category: "streak", description: "Logge Workouts an 100 Tagen in Folge." },
  // Total workouts
  { key: "workouts_10", name: "Workouts 10", category: "workouts", description: "Erfasse 10 Workouts insgesamt." },
  { key: "workouts_25", name: "Workouts 25", category: "workouts", description: "Erfasse 25 Workouts insgesamt." },
  { key: "workouts_50", name: "Workouts 50", category: "workouts", description: "Erfasse 50 Workouts insgesamt." },
  { key: "workouts_100", name: "Workouts 100", category: "workouts", description: "Erfasse 100 Workouts insgesamt." },
  { key: "workouts_250", name: "Workouts 250", category: "workouts", description: "Erfasse 250 Workouts insgesamt." },
  { key: "workouts_500", name: "Workouts 500", category: "workouts", description: "Erfasse 500 Workouts insgesamt." },
  // PR count
  { key: "prs_10", name: "PRs 10", category: "prs", description: "Erreiche 10 neue Bestleistungen (Gewicht pro Übung)." },
  { key: "prs_25", name: "PRs 25", category: "prs", description: "Erreiche 25 neue Bestleistungen (Gewicht pro Übung)." },
  { key: "prs_50", name: "PRs 50", category: "prs", description: "Erreiche 50 neue Bestleistungen (Gewicht pro Übung)." },
  { key: "prs_100", name: "PRs 100", category: "prs", description: "Erreiche 100 neue Bestleistungen (Gewicht pro Übung)." },
  { key: "prs_250", name: "PRs 250", category: "prs", description: "Erreiche 250 neue Bestleistungen (Gewicht pro Übung)." },
  // Social
  { key: "friends_1", name: "Friends 1", category: "social", description: "1 Freundschaft bestätigt." },
  { key: "friends_5", name: "Friends 5", category: "social", description: "5 Freundschaften bestätigt." },
  { key: "friends_10", name: "Friends 10", category: "social", description: "10 Freundschaften bestätigt." },
  { key: "friends_25", name: "Friends 25", category: "social", description: "25 Freundschaften bestätigt." },
  { key: "train_with_buddy_5", name: "Buddy Sessions 5", category: "social", description: "5 Workouts mit einem Buddy geloggt." },
  { key: "train_with_buddy_25", name: "Buddy Sessions 25", category: "social", description: "25 Workouts mit einem Buddy geloggt." },
  { key: "train_with_buddy_100", name: "Buddy Sessions 100", category: "social", description: "100 Workouts mit einem Buddy geloggt." },
  // Consistency
  { key: "weeks_active_4", name: "Weeks Active 4", category: "consistency", description: "In 4 Wochen mindestens 1 Workout pro Woche." },
  { key: "weeks_active_12", name: "Weeks Active 12", category: "consistency", description: "In 12 Wochen mindestens 1 Workout pro Woche." },
  { key: "weeks_active_24", name: "Weeks Active 24", category: "consistency", description: "In 24 Wochen mindestens 1 Workout pro Woche." },
  // Season
  { key: "season_top_10_friends", name: "Season Top 10", category: "season", description: "Top 10 im Friends-Season-Leaderboard." },
  { key: "season_top_3_friends", name: "Season Top 3", category: "season", description: "Top 3 im Friends-Season-Leaderboard." },
  { key: "season_top_1_friends", name: "Season Winner", category: "season", description: "Platz 1 im Friends-Season-Leaderboard." }
];

export async function ensureAchievementIndexes(db) {
  const catalogCol = db.collection("achievementsCatalog");
  const userCol = db.collection("userAchievements");
  await Promise.all([
    catalogCol.createIndex({ key: 1 }, { unique: true }),
    userCol.createIndex({ userId: 1, key: 1 }, { unique: true })
  ]);
}

export async function seedAchievementsCatalog() {
  const db = await getDb();
  const catalogCol = db.collection("achievementsCatalog");
  await ensureAchievementIndexes(db);
  await Promise.all(
    ACHIEVEMENTS_CATALOG.map((a) =>
      catalogCol.updateOne({ key: a.key }, { $set: a }, { upsert: true })
    )
  );
}

export async function getAchievementsCatalog() {
  await seedAchievementsCatalog();
  return ACHIEVEMENTS_CATALOG;
}

export async function getUserAchievements(userId) {
  const db = await getDb();
  await ensureAchievementIndexes(db);
  const col = db.collection("userAchievements");
  const docs = await col.find({ userId: String(userId) }).toArray();
  return docs.map((d) => ({ key: d.key, unlockedAt: d.unlockedAt }));
}

async function unlockKeys(userId, keys) {
  if (!keys || keys.length === 0) return [];
  const db = await getDb();
  await ensureAchievementIndexes(db);
  const col = db.collection("userAchievements");
  const now = new Date();
  const ops = keys.map((key) => ({
    updateOne: {
      filter: { userId: String(userId), key },
      update: { $setOnInsert: { userId: String(userId), key, unlockedAt: now } },
      upsert: true
    }
  }));
  const res = await col.bulkWrite(ops, { ordered: false });
  const upserted = res?.upsertedIds ? Object.values(res.upsertedIds).map((idx) => ops[idx]?.updateOne?.filter?.key).filter(Boolean) : [];
  return upserted;
}

export async function unlockFromStats(userId, stats = {}, friendsCount = 0) {
  const toUnlock = [];
  const streak = Number(stats.streakDays || 0);
  const totalWorkouts = Number(stats.totalWorkouts || 0);
  const prTotal = Number(stats.prTotal || 0);
  const buddyWorkouts = Number(stats.buddyWorkouts || 0);
  const weeksActive = Number(stats.weeksActiveCount || 0);

  const thresholds = [
    { key: "streak_3", value: streak, need: 3 },
    { key: "streak_7", value: streak, need: 7 },
    { key: "streak_14", value: streak, need: 14 },
    { key: "streak_30", value: streak, need: 30 },
    { key: "streak_100", value: streak, need: 100 },
    { key: "workouts_10", value: totalWorkouts, need: 10 },
    { key: "workouts_25", value: totalWorkouts, need: 25 },
    { key: "workouts_50", value: totalWorkouts, need: 50 },
    { key: "workouts_100", value: totalWorkouts, need: 100 },
    { key: "workouts_250", value: totalWorkouts, need: 250 },
    { key: "workouts_500", value: totalWorkouts, need: 500 },
    { key: "prs_10", value: prTotal, need: 10 },
    { key: "prs_25", value: prTotal, need: 25 },
    { key: "prs_50", value: prTotal, need: 50 },
    { key: "prs_100", value: prTotal, need: 100 },
    { key: "prs_250", value: prTotal, need: 250 },
    { key: "train_with_buddy_5", value: buddyWorkouts, need: 5 },
    { key: "train_with_buddy_25", value: buddyWorkouts, need: 25 },
    { key: "train_with_buddy_100", value: buddyWorkouts, need: 100 },
    { key: "weeks_active_4", value: weeksActive, need: 4 },
    { key: "weeks_active_12", value: weeksActive, need: 12 },
    { key: "weeks_active_24", value: weeksActive, need: 24 },
    { key: "friends_1", value: friendsCount, need: 1 },
    { key: "friends_5", value: friendsCount, need: 5 },
    { key: "friends_10", value: friendsCount, need: 10 },
    { key: "friends_25", value: friendsCount, need: 25 }
  ];

  for (const t of thresholds) {
    if (t.value >= t.need) toUnlock.push(t.key);
  }

  return unlockKeys(userId, toUnlock);
}

export async function unlockSeasonPlacement(userId, placement) {
  const unlocks = [];
  if (placement <= 1) unlocks.push("season_top_1_friends");
  if (placement <= 3) unlocks.push("season_top_3_friends");
  if (placement <= 10) unlocks.push("season_top_10_friends");
  return unlockKeys(userId, unlocks);
}

export async function getAchievementsForUser(userId) {
  const catalog = await getAchievementsCatalog();
  const unlocked = await getUserAchievements(userId);
  const unlockedSet = new Set(unlocked.map((a) => a.key));
  const combined = catalog.map((c) => ({
    ...c,
    unlockedAt: unlocked.find((u) => u.key === c.key)?.unlockedAt || null
  }));
  return { catalog, unlocked: combined.filter((c) => unlockedSet.has(c.key)), all: combined };
}

export async function unlockSeasonRanksForUsers(users = []) {
  const ops = [];
  for (let i = 0; i < users.length; i++) {
    const entry = users[i];
    if (!entry?.userId) continue;
    ops.push(unlockSeasonPlacement(entry.userId, i + 1));
  }
  await Promise.all(ops);
}

export async function unlockRankMilestones(userId, lifetimeXp) {
  const rank = getRankFromXp(lifetimeXp);
  const unlocks = [];
  if (rank.stars >= 1) {
    // no separate achievement keys defined; placeholder for future
  }
  if (unlocks.length) await unlockKeys(userId, unlocks);
  return rank;
}
