
export const XP_PER_TRAINING_ALONE = 10;
export const XP_PER_TRAINING_WITH_BUDDY = 20;
export const XP_PROFILE_BONUS = 30;


export function isProfileComplete(profile) {
  return (
    profile &&
    profile.name &&
    profile.gym &&
    profile.level &&
    profile.goals &&
    profile.preferredTimes &&
    profile.contact
  );
}
