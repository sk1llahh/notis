import { GAMIFICATION_RULES } from "@/shared/config";

export interface StreakStatus {
  streak: number;
  isActiveToday: boolean;
  isExpiringSoon: boolean;
}

/**
 * Checks whether two dates belong to the same calendar day
 * (evaluated in both UTC and local timezone for consistency).
 */
export function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

/**
 * Calculates current streak status, expiration warnings, and today's activity status.
 *
 * @param lastStudyAt Date of user's last learning activity (null for new users)
 * @param currentStreak Current streak day count from database
 * @param currentDate Reference date (defaults to new Date())
 * @returns StreakStatus object
 */
export function calculateStreakStatus(
  lastStudyAt: Date | null,
  currentStreak: number,
  currentDate: Date = new Date()
): StreakStatus {
  if (!lastStudyAt) {
    return {
      streak: 0,
      isActiveToday: false,
      isExpiringSoon: false,
    };
  }

  const safeStreak = Math.max(0, currentStreak || 0);
  const diffMs = currentDate.getTime() - lastStudyAt.getTime();
  const diffHours = Math.max(0, diffMs / (1000 * 60 * 60));

  // 1. Streak expired: more than STREAK_EXPIRATION_HOURS (36h) have passed
  if (diffHours > GAMIFICATION_RULES.STREAK_EXPIRATION_HOURS) {
    return {
      streak: 0,
      isActiveToday: false,
      isExpiringSoon: false,
    };
  }

  // 2. Active today: within 24h and falls on the same calendar day
  const isToday = diffHours <= 24 && isSameCalendarDay(lastStudyAt, currentDate);
  if (isToday) {
    return {
      streak: safeStreak,
      isActiveToday: true,
      isExpiringSoon: false,
    };
  }

  // 3. Expiring soon: between 24 and 36 hours since last activity
  const isExpiringSoon =
    diffHours > 24 &&
    diffHours <= GAMIFICATION_RULES.STREAK_EXPIRATION_HOURS &&
    safeStreak > 0;

  return {
    streak: safeStreak,
    isActiveToday: false,
    isExpiringSoon,
  };
}
