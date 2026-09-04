/**
 * Level progression mathematical engine.
 * Calculates user level and progress using a quadratic XP formula:
 * Total XP for level L: totalXP = 100 * (L - 1)^2
 */

export interface UserLevelProgress {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercentage: number;
}

/**
 * Calculates the total cumulative XP required to reach a specific level.
 * Level 1 starts at 0 XP.
 * Level 2 requires 100 XP.
 * Level 3 requires 400 XP.
 * Level 4 requires 900 XP, etc.
 */
export function getLevelBaseXP(level: number): number {
  if (level <= 1) return 0;
  return 100 * Math.pow(level - 1, 2);
}

/**
 * Calculates user level, progress within current level, and percentage to next level.
 *
 * @param xp Total cumulative experience points
 * @returns UserLevelProgress object
 */
export function calculateUserLevel(xp: number): UserLevelProgress {
  const safeXP = Math.max(0, Math.floor(xp || 0));

  // Inverted quadratic formula: L = 1 + floor(sqrt(XP / 100))
  const level = Math.max(1, 1 + Math.floor(Math.sqrt(safeXP / 100)));

  const currentLevelBaseXP = getLevelBaseXP(level);
  const nextLevelBaseXP = getLevelBaseXP(level + 1);

  const currentLevelXP = safeXP - currentLevelBaseXP;
  const tierSpan = nextLevelBaseXP - currentLevelBaseXP;

  const progressPercentage =
    tierSpan > 0
      ? Math.min(100, Math.max(0, Math.round((currentLevelXP / tierSpan) * 100)))
      : 0;

  return {
    level,
    currentLevelXP,
    nextLevelXP: nextLevelBaseXP,
    progressPercentage,
  };
}
