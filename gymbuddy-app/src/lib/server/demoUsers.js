// src/lib/server/demoUsers.js

export const DEMO_USERS = [
  {
    _id: "demo-auto-1",
    email: "demo1@gymbuddy.demo",
    buddyCode: "900111",
    profile: {
      name: "Autoaccept Demo 1",
      gym: "Demo Gym Winterthur",
      trainingLevel: "intermediate",
      goals: "Hypertrophie, Kraft",
      preferredTimes: "Abend",
      contact: "@demo1",
      visibility: "public",
      allowCodeLookup: true,
      postalCode: "8400",
      city: "Winterthur",
      country: "CH",
      autoAccept: true
    }
  },
  {
    _id: "demo-auto-2",
    email: "demo2@gymbuddy.demo",
    buddyCode: "900222",
    profile: {
      name: "Autoaccept Demo 2",
      gym: "City Gym Zürich",
      trainingLevel: "advanced",
      goals: "Strength, Powerlifting",
      preferredTimes: "Morgen",
      contact: "@demo2",
      visibility: "public",
      allowCodeLookup: true,
      postalCode: "8000",
      city: "Zürich",
      country: "CH",
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
      allowCodeLookup: true,
      postalCode: "8404",
      city: "Winterthur",
      country: "CH",
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
            allowCodeLookup: u.profile.allowCodeLookup,
            autoAccept: true,
            friends: [],
            trainingsCount: 5,
            xp: 1200,
            lifetimeXp: 1200,
            seasonXp: 800,
            geo: u.profile.city
              ? {
                  type: "Point",
                  coordinates:
                    u.profile.city === "Winterthur"
                      ? [8.724, 47.498]
                      : u.profile.city === "Zürich"
                      ? [8.5417, 47.3769]
                      : [8.55, 47.38]
                }
              : undefined,
            geoUpdatedAt: new Date(),
            geoSource: "seed",
            geoPrecision: "approx"
          },
          $set: {
            profile: u.profile,
            visibility: u.profile.visibility,
            allowCodeLookup: u.profile.allowCodeLookup
          }
        },
        { upsert: true }
      )
    )
  );
}




