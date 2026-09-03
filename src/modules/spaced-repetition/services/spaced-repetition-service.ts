import { prisma } from "@/server/db";
import type { ReviewCardDTO } from "../types";

/**
 * Server Service: Fetches flashcards that are due for review for the user.
 * If user has no active review cards, automatically initializes cards
 * from topics marked as COMPLETED in UserProgress.
 */
export async function getDueFlashcards(
  userId: string,
  limit = 20
): Promise<ReviewCardDTO[]> {
  const now = new Date();

  // 1. Fetch existing due cards
  let reviews = await prisma.userQuestionReview.findMany({
    where: {
      userId,
      OR: [{ reviewDueAt: { lte: now } }, { reviewDueAt: null }],
    },
    include: {
      question: {
        include: {
          translations: true,
          topic: {
            include: {
              translations: true,
            },
          },
        },
      },
    },
    orderBy: {
      reviewDueAt: "asc",
    },
    take: limit,
  });

  // 2. If no due cards, check if user needs auto-initialization from completed topics
  if (reviews.length === 0) {
    const totalCount = await prisma.userQuestionReview.count({
      where: { userId },
    });

    if (totalCount === 0) {
      // Find all completed topics for the user
      const completedProgress = await prisma.userProgress.findMany({
        where: {
          userId,
          status: "COMPLETED",
        },
        select: { topicId: true },
      });

      let topicIds = completedProgress.map((p) => p.topicId);

      // Fallback in dev: if no completed topics, use topics of published courses with questions
      if (topicIds.length === 0) {
        const anyQuestions = await prisma.question.findMany({
          where: { isArchived: false },
          select: { topicId: true },
          take: 5,
        });
        topicIds = Array.from(new Set(anyQuestions.map((q) => q.topicId)));
      }

      if (topicIds.length > 0) {
        const questionsToSeed = await prisma.question.findMany({
          where: {
            topicId: { in: topicIds },
            isArchived: false,
          },
          select: { id: true },
        });

        if (questionsToSeed.length > 0) {
          await prisma.userQuestionReview.createMany({
            data: questionsToSeed.map((q) => ({
              userId,
              questionId: q.id,
              reviewDueAt: now,
              repetitionCount: 0,
              intervalDays: 0,
              easeFactor: 2.5,
            })),
            skipDuplicates: true,
          });

          // Re-fetch initialized reviews
          reviews = await prisma.userQuestionReview.findMany({
            where: {
              userId,
              OR: [{ reviewDueAt: { lte: now } }, { reviewDueAt: null }],
            },
            include: {
              question: {
                include: {
                  translations: true,
                  topic: {
                    include: {
                      translations: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              reviewDueAt: "asc",
            },
            take: limit,
          });
        }
      }
    }
  }

  // 3. Transform to client ReviewCardDTO
  return reviews.map((r) => {
    const q = r.question;
    const qTrans = q.translations[0];
    const topicTrans = q.topic.translations[0];

    const rawOpts = qTrans?.options;
    const options = Array.isArray(rawOpts) ? rawOpts : [];

    // Derive back content (explanation + correct options)
    let backText = qTrans?.explanation?.trim() || "";
    const correctOptions = options
      .filter((_, idx) => q.correctAnswerIndexes.includes(idx))
      .map((opt) => {
        if (typeof opt === "object" && opt !== null && "text" in opt) {
          return String((opt as { text: unknown }).text);
        }
        return String(opt);
      });

    if (correctOptions.length > 0) {
      const correctStr = correctOptions.join("; ");
      if (backText) {
        backText = `Правильный ответ: ${correctStr}\n\n${backText}`;
      } else {
        backText = correctStr;
      }
    }

    // Extract any codeSnippet from options
    let codeSnippet: string | undefined;
    for (const opt of options) {
      if (
        typeof opt === "object" &&
        opt !== null &&
        "codeSnippet" in opt &&
        typeof (opt as { codeSnippet: unknown }).codeSnippet === "string" &&
        (opt as { codeSnippet: string }).codeSnippet.trim() !== ""
      ) {
        codeSnippet = (opt as { codeSnippet: string }).codeSnippet;
        break;
      }
    }

    return {
      id: r.id,
      topicId: q.topicId,
      topicTitle: topicTrans?.title || "Тема курса",
      front: qTrans?.prompt || "Вопрос",
      back: backText || "Ответ не указан",
      codeSnippet,
      repetitions: r.repetitionCount,
      interval: r.intervalDays,
      easinessFactor: r.easeFactor,
    };
  });
}
