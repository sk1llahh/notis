import { prisma } from "@/server/db";
import { calculateUserLevel } from "./level-progression";
import { calculateStreakStatus } from "./streak-calculator";
import type {
  UserProfileDTO,
  UserStatsDTO,
  ActivityDayDTO,
  EnrolledCourseProgressDTO,
  FullUserProfileData,
} from "../types";

/**
 * Service for fetching and assembling the user's gamification profile,
 * including level progress, streak status, quick stats, 90-day activity heatmap,
 * and enrolled courses progress.
 */
export async function getUserProfileData(
  userId: string
): Promise<FullUserProfileData | null> {
  // 1. Resolve User (supporting lookup by primary id or authId)
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: userId }, { authId: userId }],
    },
  });

  if (!user) {
    return null;
  }

  // 2. Pure Level and Streak Calculations
  const levelInfo = calculateUserLevel(user.xp);
  const streakStatus = calculateStreakStatus(user.lastStudyAt, user.streakDays);

  const userProfile: UserProfileDTO = {
    id: user.id,
    name: user.name || user.email.split("@")[0] || "Пользователь",
    email: user.email,
    role: user.role,
    xp: user.xp,
    level: levelInfo.level,
    progressPercentage: levelInfo.progressPercentage,
    nextLevelXP: levelInfo.nextLevelXP,
    streak: streakStatus.streak,
    isStreakActiveToday: streakStatus.isActiveToday,
    isStreakExpiringSoon: streakStatus.isExpiringSoon,
  };

  // 3. Quick Stats (Topics, Quizzes, Cards)
  const [completedTopicsCount, passedQuizzesCount, reviewedCardsCount] =
    await Promise.all([
      prisma.userProgress.count({
        where: {
          userId: user.id,
          status: "COMPLETED",
        },
      }),
      prisma.userQuizAttempt.count({
        where: {
          userId: user.id,
          isCorrect: true,
        },
      }),
      prisma.userQuestionReview.count({
        where: {
          userId: user.id,
          repetitionCount: { gt: 0 },
        },
      }),
    ]);

  const stats: UserStatsDTO = {
    completedTopicsCount,
    passedQuizzesCount,
    reviewedCardsCount,
  };

  // 4. 90-Day Activity Heatmap Data
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000);
  ninetyDaysAgo.setUTCHours(0, 0, 0, 0);

  const [topicProgressActivity, quizActivity, reviewActivity] =
    await Promise.all([
      prisma.userProgress.findMany({
        where: {
          userId: user.id,
          completedAt: { gte: ninetyDaysAgo },
        },
        select: { completedAt: true },
      }),
      prisma.userQuizAttempt.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: ninetyDaysAgo },
        },
        select: { createdAt: true },
      }),
      prisma.userQuestionReview.findMany({
        where: {
          userId: user.id,
          lastReviewedAt: { gte: ninetyDaysAgo },
        },
        select: { lastReviewedAt: true },
      }),
    ]);

  const countByDay = new Map<string, number>();

  function recordActivity(date: Date | null) {
    if (!date) return;
    const dateKey = date.toISOString().slice(0, 10);
    countByDay.set(dateKey, (countByDay.get(dateKey) || 0) + 1);
  }

  topicProgressActivity.forEach((a) => recordActivity(a.completedAt));
  quizActivity.forEach((a) => recordActivity(a.createdAt));
  reviewActivity.forEach((a) => recordActivity(a.lastReviewedAt));

  const activity: ActivityDayDTO[] = [];
  for (let i = 89; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = day.toISOString().slice(0, 10);
    const count = countByDay.get(dateKey) || 0;

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count === 0) level = 0;
    else if (count <= 2) level = 1;
    else if (count <= 5) level = 2;
    else if (count <= 8) level = 3;
    else level = 4;

    activity.push({
      date: dateKey,
      count,
      level,
    });
  }

  // 5. Enrolled & Started Courses with Progress
  const relevantCourses = await prisma.course.findMany({
    where: {
      OR: [
        { enrollments: { some: { userId: user.id, status: "ACTIVE" } } },
        { topics: { some: { userProgress: { some: { userId: user.id } } } } },
        { collaborators: { some: { userId: user.id } } },
      ],
      isArchived: false,
    },
    include: {
      translations: true,
      topics: {
        where: { isPublished: true, isArchived: false },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const courses: EnrolledCourseProgressDTO[] = await Promise.all(
    relevantCourses.map(async (course) => {
      const totalTopics =
        course.publishedTopicsCount > 0
          ? course.publishedTopicsCount
          : course.topics.length;

      const completedTopics = await prisma.userProgress.count({
        where: {
          userId: user.id,
          status: "COMPLETED",
          topic: {
            courseId: course.id,
            isPublished: true,
            isArchived: false,
          },
        },
      });

      const progressPercent =
        totalTopics > 0
          ? Math.min(100, Math.round((completedTopics / totalTopics) * 100))
          : 0;

      const translation =
        course.translations.find((t) => t.locale === "ru") ||
        course.translations[0];
      const title = translation?.title || course.slug;

      return {
        id: course.id,
        title,
        slug: course.slug,
        completedTopics,
        totalTopics,
        progressPercent,
      };
    })
  );

  return {
    user: userProfile,
    stats,
    activity,
    courses,
  };
}
