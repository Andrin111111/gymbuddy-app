// src/lib/buddies.js
export const staticBuddies = [
  {
    id: "demo1",
    name: "Lena",
    gym: "Activ Fitness Winterthur",
    level: 3,
    focus: "Powerlifting",
    trainingTimes: "Mo, Mi, Fr ab 18:00",
    contact: "@lena-lifts",
    code: "111111",
    distanceKm: 2
  },
  {
    id: "demo2",
    name: "Markus",
    gym: "Fitnesspark Zürich",
    level: 2,
    focus: "Muskelaufbau",
    trainingTimes: "Di, Do 19:00",
    contact: "@markus-gym",
    code: "222222",
    distanceKm: 15
  }
];

// Diese Funktion wird von src/routes/buddies/[id]/+page.js benutzt
export function getBuddyById(id) {
  // aktuell: einfach in der Demo-Liste suchen
  return staticBuddies.find((buddy) => buddy.id === id) ?? null;
}
