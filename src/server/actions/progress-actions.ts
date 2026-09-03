"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { GAMIFICATION_RULES } from "@/shared/config";
import { createSafeAction, ActionException } from "./safe-action";

export const completeTopicSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicSlug: z.string().min(1, "Слаг темы обязателен"),
});

export type CompleteTopicInput = z.infer<typeof completeTopicSchema>;

export interface CompleteTopicOutput {
  topicId: string;
  status: "COMPLETED";
  xpEarned: number;
}

/**
 * Server Action: Marks a topic as completed by the current user,
 * awards XP according to gamification rules, and updates course enrollment.
 */
export const completeTopicAction = createSafeAction(
  completeTopicSchema,
  async (input, { session }): Promise<CompleteTopicOutput> => {
    // 1. Auth Guard
    if (!session.user) {
      throw new ActionException(
        "UNAUTHORIZED",
        "Для сохранения прогресса требуется авторизация"
      );
    }

    // 2. Fetch User from DB
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          { email: session.user.email },
          { authId: session.user.id },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new ActionException(
        "NOT_FOUND",
        "Учетная запись пользователя не найдена"
      );
    }

    // 3. Fetch Topic & verify course association
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
      },
    });

    if (!topic) {
      throw new ActionException(
        "NOT_FOUND",
        "Тема не найдена в указанном курсе"
      );
    }

    const now = new Date();
    let isFirstCompletion = true;

    // 4. Atomic Transaction: Progress + XP + Enrollment
    await prisma.$transaction(async (tx) => {
      // 4.1 Check existing progress to guarantee idempotency
      const existingProgress = await tx.userProgress.findUnique({
        where: {
          userId_topicId: {
            userId: user.id,
            topicId: topic.id,
          },
        },
        select: {
          status: true,
          completedVersion: true,
        },
      });

      isFirstCompletion = existingProgress?.status !== "COMPLETED";

      // 4.2 Upsert UserProgress
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

      // 4.3 Award XP and update lastStudyAt (XP awarded ONLY on first completion)
      await tx.user.update({
        where: { id: user.id },
        data: {
          ...(isFirstCompletion
            ? { xp: { increment: GAMIFICATION_RULES.XP_TOPIC_COMPLETION } }
            : {}),
          lastStudyAt: now,
        },
      });

      // 4.4 Increment completed topics in enrollment ONLY on first completion
      if (isFirstCompletion) {
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
      }
    });

    // 5. Invalidate Next.js cache for the course roadmap
    revalidatePath(`/courses/${input.courseSlug}`);

    return {
      topicId: topic.id,
      status: "COMPLETED",
      xpEarned: isFirstCompletion ? GAMIFICATION_RULES.XP_TOPIC_COMPLETION : 0,
    };
  }
);
