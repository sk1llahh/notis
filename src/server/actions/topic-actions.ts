"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { GAMIFICATION_RULES } from "@/shared/config";
import { calculateStreakStatus } from "@/modules/gamification/services/streak-calculator";
import { enrollTopicIntoReviewQueue } from "@/modules/spaced-repetition/services/spaced-card-service";
import { createSafeAction, ActionException } from "./safe-action";
import {
  completeTopicSchema,
  type CompleteTopicOutput,
} from "./topic-actions.schemas";

/**
 * Server Action: Marks a topic as completed by the current user ("Mark as Read").
 * Validates authentication, course association, and prerequisite unlock state (Fog of War).
 * Awards XP and updates the user's study streak on first completion.
 */
export const completeTopicAction = createSafeAction(
  completeTopicSchema,
  async (input, { session }): Promise<CompleteTopicOutput> => {
    // 1. Auth Guard
    if (!session.user?.id) {
      throw new ActionException(
        "UNAUTHORIZED",
        "Для сохранения прогресса требуется авторизация"
      );
    }

    // 2. Fetch User from DB to resolve canonical ID and streak status
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          { email: session.user.email ?? "" },
          { authId: session.user.id },
        ],
      },
      select: {
        id: true,
        streakDays: true,
        lastStudyAt: true,
      },
    });

    if (!user) {
      throw new ActionException(
        "NOT_FOUND",
        "Учетная запись пользователя не найдена"
      );
    }

    // 3. Fetch Topic with course association and REQUIRED prerequisites
    const topic = await prisma.topic.findFirst({
      where: {
        slug: input.topicSlug,
        course: {
          slug: input.courseSlug,
        },
      },
      select: {
        id: true,
        version: true,
        courseId: true,
        prerequisites: {
          where: {
            type: "REQUIRED",
          },
          select: {
            prerequisiteId: true,
          },
        },
      },
    });

    if (!topic) {
      throw new ActionException(
        "NOT_FOUND",
        "Тема не найдена в указанном курсе"
      );
    }

    // 4. Prerequisite Check (Fog of War Engine)
    // A topic cannot be completed if it is LOCKED (i.e. has incomplete REQUIRED prerequisites)
    if (topic.prerequisites.length > 0) {
      const requiredPrereqIds = topic.prerequisites.map((p) => p.prerequisiteId);
      const completedPrereqsCount = await prisma.userProgress.count({
        where: {
          userId: user.id,
          topicId: { in: requiredPrereqIds },
          status: "COMPLETED",
        },
      });

      if (completedPrereqsCount < requiredPrereqIds.length) {
        throw new ActionException(
          "FORBIDDEN",
          "Невозможно завершить тему: сначала освойте необходимые пререквизиты"
        );
      }
    }

    // 5. Existing Progress Check (Idempotency)
    const existingProgress = await prisma.userProgress.findUnique({
      where: {
        userId_topicId: {
          userId: user.id,
          topicId: topic.id,
        },
      },
      select: {
        status: true,
      },
    });

    const isFirstCompletion = existingProgress?.status !== "COMPLETED";

    // If already COMPLETED, idempotently return success with 0 XP earned
    if (!isFirstCompletion) {
      return {
        success: true,
        topicId: topic.id,
        status: "COMPLETED",
        xpEarned: 0,
      };
    }

    // 6. Calculate Streak update on first completion
    const now = new Date();
    const streakStatus = calculateStreakStatus(user.lastStudyAt, user.streakDays, now);
    let newStreak = user.streakDays;
    if (!streakStatus.isActiveToday) {
      newStreak = streakStatus.streak > 0 ? streakStatus.streak + 1 : 1;
    }

    // 7. Atomic Transaction: Progress + XP + Streak + Enrollment
    await prisma.$transaction(async (tx) => {
      // 7.1 Upsert UserProgress
      await tx.userProgress.upsert({
        where: {
          userId_topicId: {
            userId: user.id,
            topicId: topic.id,
          },
        },
        create: {
          userId: user.id,
          topicId: topic.id,
          status: "COMPLETED",
          completedVersion: topic.version,
          completedAt: now,
          startedAt: now,
        },
        update: {
          status: "COMPLETED",
          completedVersion: topic.version,
          completedAt: now,
        },
      });

      // 7.2 Award XP and update streak
      await tx.user.update({
        where: { id: user.id },
        data: {
          xp: { increment: GAMIFICATION_RULES.XP_TOPIC_COMPLETION },
          streakDays: newStreak,
          lastStudyAt: now,
        },
      });

      // 7.3 Increment completed topics in course enrollment
      const enrollment = await tx.courseEnrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: topic.courseId,
          },
        },
        select: { id: true },
      });

      if (enrollment) {
        await tx.courseEnrollment.update({
          where: { id: enrollment.id },
          data: {
            completedTopicsCount: { increment: 1 },
          },
        });
      }

      // 7.4 Enroll topic into SM-2 review queue
      await enrollTopicIntoReviewQueue(user.id, topic.id, tx);
    });

    // 8. Invalidate Next.js cache
    revalidatePath(`/courses/${input.courseSlug}`);
    revalidatePath(`/courses/${input.courseSlug}/topics/${input.topicSlug}`);
    revalidatePath(`/profile`);
    revalidatePath(`/practice`);

    return {
      success: true,
      topicId: topic.id,
      status: "COMPLETED",
      xpEarned: GAMIFICATION_RULES.XP_TOPIC_COMPLETION,
    };
  }
);
