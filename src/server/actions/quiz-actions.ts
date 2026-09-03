"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { GAMIFICATION_RULES } from "@/shared/config";
import { evaluateQuizSubmission, type QuizResultDTO } from "@/modules/quiz";
import { createSafeAction, ActionException } from "./safe-action";

export const submitQuizSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicSlug: z.string().min(1, "Слаг темы обязателен"),
  answers: z.record(z.string(), z.array(z.string())),
});

export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;

/**
 * Server Action: Securely grades a topic quiz on the server,
 * prevents answer leakages, and updates user progress/XP upon passing (score >= 80%).
 */
export const submitQuizAction = createSafeAction(
  submitQuizSchema,
  async (input, { session }): Promise<QuizResultDTO> => {
    // 1. Auth Guard
    if (!session.user) {
      throw new ActionException(
        "UNAUTHORIZED",
        "Для прохождения теста требуется авторизация"
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
      select: { id: true },
    });

    if (!user) {
      throw new ActionException("NOT_FOUND", "Пользователь не найден");
    }

    // 3. Fetch Topic & verify course
    const topic = await prisma.topic.findFirst({
      where: {
        slug: input.topicSlug,
        course: { slug: input.courseSlug },
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

    // 4. Pure Server-side evaluation against DB questions
    const quizResult = await evaluateQuizSubmission(topic.id, {
      answers: input.answers,
    });

    // 5. If passed (>=80%), atomically advance topic progress & award XP
    if (quizResult.passed) {
      const now = new Date();

      await prisma.$transaction(async (tx) => {
        // Check existing progress to prevent duplicate XP on repeat attempts
        const existingProgress = await tx.userProgress.findUnique({
          where: {
            userId_topicId: {
              userId: user.id,
              topicId: topic.id,
            },
          },
          select: { status: true },
        });

        const isFirstCompletion = existingProgress?.status !== "COMPLETED";

        // Mark topic completed
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

        // Calculate XP: topic completion (50 XP on first pass) + quiz perfect bonus (25 XP on 100%)
        const totalXp =
          (isFirstCompletion ? GAMIFICATION_RULES.XP_TOPIC_COMPLETION : 0) +
          quizResult.xpEarned;

        await tx.user.update({
          where: { id: user.id },
          data: {
            ...(totalXp > 0 ? { xp: { increment: totalXp } } : {}),
            lastStudyAt: now,
          },
        });

        // Increment enrollment completed count if first completion
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

      // Revalidate course roadmap cache
      revalidatePath(`/courses/${input.courseSlug}`);
    }

    return quizResult;
  }
);
