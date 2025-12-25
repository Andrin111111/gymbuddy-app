// src/lib/server/demoUsers.js

export const DEMO_USERS = [
  {
    _id: "demo-auto-1",
    email: "demo1@gymbuddy.demo",
    buddyCode: "900111",
    profile: {
      name: "Autoaccept Demo 1",
      gym: "Demo Gym",
      trainingLevel: "intermediate",
      goals: "Hypertrophie, Kraft",
      preferredTimes: "Abend",
      contact: "@demo1",
      visibility: "public",
      feedOptIn: false,
      allowCodeLookup: true,
      autoAccept: true
    }
  },
  {
    _id: "demo-auto-2",
    email: "demo2@gymbuddy.demo",
    buddyCode: "900222",
    profile: {
      name: "Autoaccept Demo 2",
      gym: "City Gym",
      trainingLevel: "advanced",
      goals: "Strength, Powerlifting",
      preferredTimes: "Morgen",
      contact: "@demo2",
      visibility: "public",
      feedOptIn: false,
      allowCodeLookup: true,
      autoAccept: true
    }
  },
  {
    _id: "demo-auto-3",
    email: "demo3@gymbuddy.demo",
    buddyCode: "900333",
    profile: {
      name: "Autoaccept Demo 3",
      gym: "Home Gym",
      trainingLevel: "beginner",
      goals: "Ausdauer, Fitness",
      preferredTimes: "Wochenende",
      contact: "@demo3",
      visibility: "public",
      feedOptIn: false,
      allowCodeLookup: true,
      autoAccept: true
    }
  }
];

export async function ensureDemoUsers(db) {
  const usersCol = db.collection("users");
  await Promise.all(
    DEMO_USERS.map((u) =>
      usersCol.updateOne(
        { _id: u._id },
        {
          $setOnInsert: {
            _id: u._id,
            email: u.email,
            buddyCode: u.buddyCode,
            profile: u.profile,
            visibility: u.profile.visibility,
            feedOptIn: u.profile.feedOptIn,
            allowCodeLookup: u.profile.allowCodeLookup,
            autoAccept: true,
            friends: []
          }
        },
        { upsert: true }
      )
    )
  );
}
