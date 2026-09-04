/**
 * Gamification domain module facade.
 * Manages XP calculation, streak counters, leveling, and skill-tree achievements.
 */

export const GAMIFICATION_MODULE_NAME = "gamification" as const;

// Types
export * from "./types";

// Mathematical Engines and Algorithms
export {
  calculateUserLevel,
  getLevelBaseXP,
  type UserLevelProgress,
} from "./services/level-progression";

export {
  calculateStreakStatus,
  isSameCalendarDay,
  type StreakStatus,
} from "./services/streak-calculator";

// Profile Service
export { getUserProfileData } from "./services/profile-service";

// UI Components
export { ProfileHeader, type ProfileHeaderProps } from "./components/ProfileHeader";
export { StreakCard, type StreakCardProps } from "./components/StreakCard";
export { ActivityHeatmap, type ActivityHeatmapProps } from "./components/ActivityHeatmap";
export {
  CourseProgressCard,
  type CourseProgressCardProps,
} from "./components/CourseProgressCard";
