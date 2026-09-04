/**
 * Gamification domain types and Data Transfer Objects (DTOs).
 */

export interface UserProfileDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  xp: number;
  level: number;
  progressPercentage: number;
  nextLevelXP: number;
  streak: number;
  isStreakActiveToday: boolean;
  isStreakExpiringSoon: boolean;
}

export interface UserStatsDTO {
  completedTopicsCount: number;
  passedQuizzesCount: number;
  reviewedCardsCount: number;
}

export interface ActivityDayDTO {
  date: string; // ISO format "YYYY-MM-DD"
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface EnrolledCourseProgressDTO {
  id: string;
  title: string;
  slug: string;
  completedTopics: number;
  totalTopics: number;
  progressPercent: number;
}

export interface FullUserProfileData {
  user: UserProfileDTO;
  stats: UserStatsDTO;
  activity: ActivityDayDTO[];
  courses: EnrolledCourseProgressDTO[];
}
