import { prisma } from "@/server/db";
import { SM2_CONFIG } from "@/shared/config";
import type { Prisma } from "@prisma/client";

export type PrismaDbClient = Prisma.TransactionClient | typeof prisma;

export interface EnrollTopicResult {
  enrolledCount: number;
  hasFlashcardFallback: boolean;
}

/**
 * Enrolls all active questions (or a fallback flashcard generated from keyPoints)
 * of a given topic into the user's SM-2 review queue.
 *
 * Idempotent: If a card already exists in the queue, its accumulated SM-2 interval,
 * repetition count, and easiness factor are preserved.
 *
 * @param userId User identifier
 * @param topicId Topic identifier
 * @param tx Optional Prisma transaction client
 * @returns Result with count of enrolled cards
 */
export async function enrollTopicIntoReviewQueue(
  userId: string,
  topicId: string,
  tx?: PrismaDbClient
): Promise<EnrollTopicResult> {
  const db = (tx ?? prisma) as Prisma.TransactionClient;
  const now = new Date();

  // 1. Fetch topic with translations
  const topic = await db.topic.findUnique({
    where: { id: topicId },
    include: {
      translations: true,
    },
  });

  if (!topic) {
    return { enrolledCount: 0, hasFlashcardFallback: false };
  }

  // 2. Fetch active questions for the topic
  const activeQuestions = await db.question.findMany({
    where: {
      topicId,
      isArchived: false,
    },
    select: { id: true, type: true },
  });

  // 3. Scenario A: Topic has quiz questions
  if (activeQuestions.length > 0) {
    for (const q of activeQuestions) {
      await db.userQuestionReview.upsert({
        where: {
          userId_questionId: {
            userId,
            questionId: q.id,
          },
        },
        create: {
          userId,
          questionId: q.id,
          intervalDays: 0,
          repetitionCount: 0,
          easeFactor: SM2_CONFIG.DEFAULT_EASINESS_FACTOR, // 2.5
          reviewDueAt: now,
        },
        update: {
          // Idempotent: preserve accumulated SM-2 progress
        },
      });
    }

    return {
      enrolledCount: activeQuestions.length,
      hasFlashcardFallback: false,
    };
  }

  // 4. Scenario B: Topic has no quiz questions -> Fallback to keyPoints flashcard
  const topicTrans = topic.translations[0];
  const keyPoints = Array.isArray(topicTrans?.keyPoints) ? topicTrans.keyPoints : [];

  if (keyPoints.length > 0) {
    // Check if fallback flashcard question already exists for this topic
    let flashcardQuestion = await db.question.findFirst({
      where: {
        topicId,
        type: "FLASHCARD",
        isArchived: false,
      },
      select: { id: true },
    });

    if (!flashcardQuestion) {
      const topicTitle = topicTrans?.title || topic.slug;
      const backContent = keyPoints.map((point) => `• ${point}`).join("\n\n");

      flashcardQuestion = await db.question.create({
        data: {
          topicId,
          type: "FLASHCARD",
          gradingStrategy: "SELF_ASSESSED",
          translations: {
            create: {
              locale: topicTrans?.locale || "ru",
              prompt: `Ключевые концепции темы: ${topicTitle}`,
              explanation: backContent,
            },
          },
        },
        select: { id: true },
      });
    }

    // Upsert the review card for the user
    await db.userQuestionReview.upsert({
      where: {
        userId_questionId: {
          userId,
          questionId: flashcardQuestion.id,
        },
      },
      create: {
        userId,
        questionId: flashcardQuestion.id,
        intervalDays: 0,
        repetitionCount: 0,
        easeFactor: SM2_CONFIG.DEFAULT_EASINESS_FACTOR,
        reviewDueAt: now,
      },
      update: {
        // Idempotent: preserve progress if already exists
      },
    });

    return {
      enrolledCount: 1,
      hasFlashcardFallback: true,
    };
  }

  return { enrolledCount: 0, hasFlashcardFallback: false };
}
