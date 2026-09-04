"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { createSafeAction, ActionException } from "./safe-action";
import {
  leaveCourseSchema,
  resetCourseProgressSchema,
  type LeaveCourseOutput,
  type ResetCourseProgressOutput,
} from "./course-enrollment-actions.schemas";

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Leaves (disenrolls from) a course by removing the user's CourseEnrollment record.
 */
export const leaveCourseAction = createSafeAction(
  leaveCourseSchema,
  async (input, ctx): Promise<LeaveCourseOutput> => {
    const userId = ctx.session.user?.id;
    if (!userId) {
      throw new ActionException("UNAUTHORIZED", "Требуется авторизация");
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userId }, { authId: userId }],
      },
      select: { id: true },
    });

    if (!user) {
      throw new ActionException("NOT_FOUND", "Пользователь не найден");
    }

    const course = await prisma.course.findUnique({
      where: { slug: input.courseSlug },
      select: { id: true },
    });

    if (!course) {
      throw new ActionException("NOT_FOUND", "Курс не найден");
    }

    // Remove enrollment
    await prisma.courseEnrollment.deleteMany({
      where: {
        userId: user.id,
        courseId: course.id,
      },
    });

    revalidatePath("/courses");
    revalidatePath(`/courses/${input.courseSlug}`);
    revalidatePath("/profile");

    return {
      success: true,
      courseSlug: input.courseSlug,
    };
  }
);

/**
 * Resets the student's progress for a specific course:
 * Clears UserProgress on course topics, UserQuizAttempt on course questions,
 * and resets CourseEnrollment.completedTopicsCount to 0.
 */
export const resetCourseProgressAction = createSafeAction(
  resetCourseProgressSchema,
  async (input, ctx): Promise<ResetCourseProgressOutput> => {
    const userId = ctx.session.user?.id;
    if (!userId) {
      throw new ActionException("UNAUTHORIZED", "Требуется авторизация");
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userId }, { authId: userId }],
      },
      select: { id: true },
    });

    if (!user) {
      throw new ActionException("NOT_FOUND", "Пользователь не найден");
    }

    const course = await prisma.course.findUnique({
      where: { slug: input.courseSlug },
      select: { id: true },
    });

    if (!course) {
      throw new ActionException("NOT_FOUND", "Курс не найден");
    }

    const topics = await prisma.topic.findMany({
      where: { courseId: course.id },
      select: { id: true },
    });

    const topicIds = topics.map((t) => t.id);

    await prisma.$transaction(async (tx) => {
      if (topicIds.length > 0) {
        // 1. Delete user progress on topics of this course
        await tx.userProgress.deleteMany({
          where: {
            userId: user.id,
            topicId: { in: topicIds },
          },
        });

        // 2. Find and delete quiz attempts for this course's topics
        const questions = await tx.question.findMany({
          where: {
            topicId: { in: topicIds },
          },
          select: { id: true },
        });

        const questionIds = questions.map((q) => q.id);

        if (questionIds.length > 0) {
          await tx.userQuizAttempt.deleteMany({
            where: {
              userId: user.id,
              questionId: { in: questionIds },
            },
          });
        }
      }

      // 3. Reset completed topics count in enrollment
      await tx.courseEnrollment.updateMany({
        where: {
          userId: user.id,
          courseId: course.id,
        },
        data: {
          completedTopicsCount: 0,
        },
      });
    });

    revalidatePath("/courses");
    revalidatePath(`/courses/${input.courseSlug}`);
    revalidatePath("/profile");
    revalidatePath("/practice");

    return {
      success: true,
      courseSlug: input.courseSlug,
    };
  }
);
