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

    // 5. Atomic transaction: Record attempt & advance progress if passed
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 5.1 Record attempts for each question in this quiz
      for (const item of quizResult.breakdown) {
        await tx.userQuizAttempt.create({
          data: {
            userId: user.id,
            questionId: item.questionId,
            selectedAnswer: item.selectedOptionIds,
            isCorrect: item.isCorrect,
            gradedAt: now,
          },
        });
      }

      // 5.2 If passed (>=80%), advance topic progress & award XP
      if (quizResult.passed) {
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

        // XP Anti-Exploit: Award XP only on first completion of the topic
        const awardedXp = isFirstCompletion
          ? GAMIFICATION_RULES.XP_TOPIC_COMPLETION + quizResult.xpEarned
          : 0;

        if (!isFirstCompletion) {
          quizResult.xpEarned = 0;
        }

        await tx.user.update({
          where: { id: user.id },
          data: {
            ...(awardedXp > 0 ? { xp: { increment: awardedXp } } : {}),
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
      }
    });

    if (quizResult.passed) {
      // Revalidate course roadmap and topic reader caches
      revalidatePath(`/courses/${input.courseSlug}`);
      revalidatePath(`/courses/${input.courseSlug}/topics/${input.topicSlug}`);
      revalidatePath(`/profile`);
    }

    return quizResult;
  }
);

export const retakeQuizSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicSlug: z.string().min(1, "Слаг темы обязателен"),
});

export type RetakeQuizInput = z.infer<typeof retakeQuizSchema>;

/**
 * Server Action: Clears previous quiz attempts for a topic,
 * allowing the student to cleanly retake the quiz for review.
 * Enforces authentication and course relation checks.
 */
export const retakeQuizAction = createSafeAction(
  retakeQuizSchema,
  async (input, { session }) => {
    // 1. Auth Guard
    if (!session.user?.id) {
      throw new ActionException(
        "UNAUTHORIZED",
        "Для пересдачи теста требуется авторизация"
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
      },
    });

    if (!topic) {
      throw new ActionException(
        "NOT_FOUND",
        "Тема не найдена в указанном курсе"
      );
    }

    // 4. Transactionally clean up previous attempts for this topic's questions
    await prisma.$transaction(async (tx) => {
      await tx.userQuizAttempt.deleteMany({
        where: {
          userId: user.id,
          question: {
            topicId: topic.id,
          },
        },
      });
    });

    // 5. Revalidate cache
    revalidatePath(`/courses/${input.courseSlug}`);
    revalidatePath(`/courses/${input.courseSlug}/topics/${input.topicSlug}`);
    revalidatePath(`/profile`);

    return { success: true };
  }
);

