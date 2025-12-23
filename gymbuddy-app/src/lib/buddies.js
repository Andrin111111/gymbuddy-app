// src/lib/buddies.js
export const staticBuddies = [
  {
    id: "demo1",
    name: "Lena",
    gym: "Activ Fitness Winterthur",
    level: "intermediate",
    goals: "Powerlifting",
    trainingTimes: "Mo, Mi, Fr ab 18:00",
    contact: "@lena-lifts",
    code: "111111",
    distanceKm: 2
  },
  {
    id: "demo2",
    name: "Markus",
    gym: "Fitnesspark Zürich",
    level: "beginner",
    goals: "Muskelaufbau",
    trainingTimes: "Di, Do 19:00",
    contact: "@markus-gym",
    code: "222222",
    distanceKm: 15
  }
];

export function getBuddyById(id) {
  return staticBuddies.find((buddy) => buddy.id === id) ?? null;
}
