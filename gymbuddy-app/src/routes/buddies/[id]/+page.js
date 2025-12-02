import { getBuddyById } from "$lib/buddies";

export function load({ params }) {
  const buddy = getBuddyById(params.id);

  if (!buddy) {
    return {
      status: 404,
      error: new Error("GymBuddy nicht gefunden")
    };
  }

  return { buddy };
}
