"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { calculateSM2 } from "@/modules/spaced-repetition/services/sm2-algorithm";
import { createSafeAction, ActionException } from "./safe-action";

// =============================================================================
// SCHEMAS & TYPES
// =============================================================================

export const reviewCardSchema = z.object({
  cardId: z.string().min(1, "ID карточки обязателен"),
  quality: z
    .number({ message: "Оценка качества обязательна" })
    .int("Оценка должна быть целым числом")
    .min(0, "Оценка не может быть меньше 0")
    .max(5, "Оценка не может быть больше 5"),
});

export type ReviewCardInput = z.infer<typeof reviewCardSchema>;

export interface ReviewCardOutput {
  cardId: string;
  nextReviewAt: Date;
  interval: number;
  xpEarned: number;
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Server Action: Submits a spaced repetition recall quality rating (0-5),
 * recalculates SM-2 interval and easiness factor, records review history,
 * and awards micro-XP (+5 XP).
 */
export const reviewCardAction = createSafeAction(
  reviewCardSchema,
  async (input, { session }): Promise<ReviewCardOutput> => {
    // 1. Auth Guard
    if (!session.user) {
      throw new ActionException(
        "UNAUTHORIZED",
        "Для повторения карточек требуется авторизация"
      );
    }

    // 2. Resolve User from Database
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
      throw new ActionException(
        "NOT_FOUND",
        "Учетная запись пользователя не найдена"
      );
    }

    // 3. Fetch UserQuestionReview card
    const card = await prisma.userQuestionReview.findUnique({
      where: { id: input.cardId },
    });

    if (!card) {
      throw new ActionException("NOT_FOUND", "Карточка повторения не найдена");
    }

    if (card.userId !== user.id) {
      throw new ActionException(
        "FORBIDDEN",
        "У вас нет прав для изменения этой карточки"
      );
    }

    // 4. Calculate SM-2 update
    const sm2Result = calculateSM2({
      quality: input.quality,
      repetitions: card.repetitionCount,
      interval: card.intervalDays,
      easinessFactor: card.easeFactor,
    });

    const now = new Date();
    const XP_EARNED = 5;

    // 5. Atomic Transaction: Card update + History record + XP increment
    await prisma.$transaction(async (tx) => {
      // 5.1 Update SM-2 parameters on card
      await tx.userQuestionReview.update({
        where: { id: input.cardId },
        data: {
          repetitionCount: sm2Result.repetitions,
          intervalDays: sm2Result.interval,
          easeFactor: sm2Result.easinessFactor,
          reviewDueAt: sm2Result.nextReviewAt,
          lastReviewedAt: now,
          ...(input.quality < 3 ? { lapseCount: { increment: 1 } } : {}),
        },
      });

      // 5.2 Record review attempt history in UserQuizAttempt
      await tx.userQuizAttempt.create({
        data: {
          userId: user.id,
          questionId: card.questionId,
          quality: input.quality,
          isCorrect: input.quality >= 3,
          selectedAnswer: {
            mode: "FLASHCARD",
            quality: input.quality,
            interval: sm2Result.interval,
          },
          gradedAt: now,
        },
      });

      // 5.3 Award micro-XP and update activity streak date
      await tx.user.update({
        where: { id: user.id },
        data: {
          xp: { increment: XP_EARNED },
          lastStudyAt: now,
        },
      });
    });

    // 6. Cache revalidation
    revalidatePath("/practice");

    return {
      cardId: input.cardId,
      nextReviewAt: sm2Result.nextReviewAt,
      interval: sm2Result.interval,
      xpEarned: XP_EARNED,
    };
  }
);
