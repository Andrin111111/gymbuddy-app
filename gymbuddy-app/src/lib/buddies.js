// Static buddy lookup used by the buddies/[id] route
const BUDDIES = [
  {
    id: "buddy-1",
    name: "Alex Müller",
    gym: "Basefit Zürich",
    level: "Intermediate",
    focus: "Hypertrophie & Kraft",
    trainingTimes: "Abends, Wochenende",
    contact: "@alexmueller",
    code: "GB-AX1",
    xp: 1240
  },
  {
    id: "buddy-2",
    name: "Sara Baumann",
    gym: "John Reed Basel",
    level: "Advanced",
    focus: "Powerlifting",
    trainingTimes: "Morgen, Mittag",
    contact: "@saralifts",
    code: "GB-SB2",
    xp: 1980
  },
  {
    id: "buddy-3",
    name: "Luca Steiner",
    gym: "Anytime Fitness Bern",
    level: "Beginner",
    focus: "Ausdauer & Mobility",
    trainingTimes: "Flexibel",
    contact: "luca@example.com",
    code: "GB-LS3",
    xp: 620
  },
  {
    id: "buddy-4",
    name: "Mara Keller",
    gym: "LetziFit ZǬrich",
    level: "Intermediate",
    focus: "Functional & HIIT",
    trainingTimes: "Morgen",
    contact: "@marak",
    code: "GB-MK4",
    xp: 880
  },
  {
    id: "buddy-5",
    name: "Jonas Frei",
    gym: "NonStop Gym Bern",
    level: "Advanced",
    focus: "Hypertrophie",
    trainingTimes: "Abend",
    contact: "jonas.frei@mail.ch",
    code: "GB-JF5",
    xp: 1540
  },
  {
    id: "buddy-6",
    name: "Lea Schmid",
    gym: "FitOne Basel",
    level: "Beginner",
    focus: "Allgemeine Fitness",
    trainingTimes: "Wochenende",
    contact: "@lea_s",
    code: "GB-LS6",
    xp: 410
  }
];

export function getBuddyById(id) {
  return BUDDIES.find((b) => b.id === id) || null;
}

export function listBuddies() {
  return BUDDIES;
}
