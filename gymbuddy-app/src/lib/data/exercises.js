// src/lib/data/exercises.js
// Built-in exercise catalog for quick selection in workouts/templates.

export const BUILT_IN_EXERCISES = [
  { key: "back_squat", name: "Back Squat", muscleGroup: "legs", equipment: "barbell", isBodyweight: false },
  { key: "front_squat", name: "Front Squat", muscleGroup: "legs", equipment: "barbell", isBodyweight: false },
  { key: "deadlift", name: "Conventional Deadlift", muscleGroup: "posterior_chain", equipment: "barbell", isBodyweight: false },
  { key: "romanian_deadlift", name: "Romanian Deadlift", muscleGroup: "posterior_chain", equipment: "barbell", isBodyweight: false },
  { key: "bench_press", name: "Bench Press", muscleGroup: "chest", equipment: "barbell", isBodyweight: false },
  { key: "incline_bench_press", name: "Incline Bench Press", muscleGroup: "chest", equipment: "barbell", isBodyweight: false },
  { key: "overhead_press", name: "Overhead Press", muscleGroup: "shoulders", equipment: "barbell", isBodyweight: false },
  { key: "push_up", name: "Push-Up", muscleGroup: "chest", equipment: "bodyweight", isBodyweight: true },
  { key: "pull_up", name: "Pull-Up", muscleGroup: "back", equipment: "bodyweight", isBodyweight: true },
  { key: "bent_over_row", name: "Bent-Over Row", muscleGroup: "back", equipment: "barbell", isBodyweight: false },
  { key: "dumbbell_row", name: "Single-Arm Dumbbell Row", muscleGroup: "back", equipment: "dumbbell", isBodyweight: false },
  { key: "lat_pulldown", name: "Lat Pulldown", muscleGroup: "back", equipment: "cable", isBodyweight: false },
  { key: "seated_cable_row", name: "Seated Cable Row", muscleGroup: "back", equipment: "cable", isBodyweight: false },
  { key: "hip_thrust", name: "Hip Thrust", muscleGroup: "glutes", equipment: "barbell", isBodyweight: false },
  { key: "leg_press", name: "Leg Press", muscleGroup: "legs", equipment: "machine", isBodyweight: false },
  { key: "lunge", name: "Dumbbell Lunge", muscleGroup: "legs", equipment: "dumbbell", isBodyweight: false },
  { key: "bulgarian_split_squat", name: "Bulgarian Split Squat", muscleGroup: "legs", equipment: "dumbbell", isBodyweight: false },
  { key: "calf_raise", name: "Calf Raise", muscleGroup: "calves", equipment: "machine", isBodyweight: false },
  { key: "biceps_curl", name: "Biceps Curl", muscleGroup: "arms", equipment: "dumbbell", isBodyweight: false },
  { key: "hammer_curl", name: "Hammer Curl", muscleGroup: "arms", equipment: "dumbbell", isBodyweight: false },
  { key: "triceps_pushdown", name: "Triceps Pushdown", muscleGroup: "arms", equipment: "cable", isBodyweight: false },
  { key: "triceps_dip", name: "Triceps Dip", muscleGroup: "arms", equipment: "bodyweight", isBodyweight: true },
  { key: "lateral_raise", name: "Lateral Raise", muscleGroup: "shoulders", equipment: "dumbbell", isBodyweight: false },
  { key: "face_pull", name: "Face Pull", muscleGroup: "rear_delts", equipment: "cable", isBodyweight: false },
  { key: "kettlebell_swing", name: "Kettlebell Swing", muscleGroup: "posterior_chain", equipment: "kettlebell", isBodyweight: false },
  { key: "farmers_carry", name: "Farmer's Carry", muscleGroup: "full_body", equipment: "dumbbell", isBodyweight: false },
  { key: "plank", name: "Plank", muscleGroup: "core", equipment: "bodyweight", isBodyweight: true },
  { key: "hanging_leg_raise", name: "Hanging Leg Raise", muscleGroup: "core", equipment: "bodyweight", isBodyweight: true },
  { key: "russian_twist", name: "Russian Twist", muscleGroup: "core", equipment: "dumbbell", isBodyweight: false },
  { key: "glute_bridge", name: "Glute Bridge", muscleGroup: "glutes", equipment: "bodyweight", isBodyweight: true }
];

export function findBuiltInExercise(key) {
  return BUILT_IN_EXERCISES.find((ex) => ex.key === key);
}
