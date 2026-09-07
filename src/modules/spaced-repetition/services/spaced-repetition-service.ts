import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";
import type { ReviewCardDTO } from "../types";

export type PrismaDbClient = Prisma.TransactionClient | typeof prisma;

export interface GetDueFlashcardsOptions {
  limit?: number;
  courseSlug?: string;
}

/**
 * Server Service: Fetches flashcards that are due for review for the user.
 * If user has no active review cards, automatically initializes cards
 * from topics marked as COMPLETED in UserProgress.
 */
export async function getDueFlashcards(
  userId: string,
  options?: number | GetDueFlashcardsOptions,
  dbClient?: PrismaDbClient
): Promise<ReviewCardDTO[]> {
  const db = (dbClient ?? prisma) as Prisma.TransactionClient;
  const now = new Date();
  const limit = typeof options === "number" ? options : options?.limit ?? 20;
  const courseSlug = typeof options === "object" ? options?.courseSlug : undefined;

  // Resolve canonical user ID if authId or email was passed
  let canonicalUserId = userId;
  if ((db as any).user?.findFirst) {
    const user = await (db as any).user.findFirst({
      where: {
        OR: [{ id: userId }, { authId: userId }, { email: userId }],
      },
      select: { id: true },
    });
    if (user) {
      canonicalUserId = user.id;
    }
  }

  // Base where condition for due reviews
  const whereCondition: {
    userId: string;
    OR: ({ reviewDueAt: { lte: Date } } | { reviewDueAt: null })[];
    question?: {
      topic: {
        course: {
          slug: string;
        };
      };
    };
  } = {
    userId: canonicalUserId,
    OR: [{ reviewDueAt: { lte: now } }, { reviewDueAt: null }],
  };

  if (courseSlug) {
    whereCondition.question = {
      topic: {
        course: {
          slug: courseSlug,
        },
      },
    };
  }

  // 1. Fetch existing due cards
  let reviews = await db.userQuestionReview.findMany({
    where: whereCondition,
    include: {
      question: {
        include: {
          translations: true,
          topic: {
            include: {
              translations: true,
              course: {
                include: {
                  translations: true,
                },
              },
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
    const totalCount = await db.userQuestionReview.count({
      where: courseSlug
        ? {
            userId: canonicalUserId,
            question: {
              topic: {
                course: {
                  slug: courseSlug,
                },
              },
            },
          }
        : { userId: canonicalUserId },
    });

    if (totalCount === 0) {
      // Find completed topics for the user
      const completedProgress = await db.userProgress.findMany({
        where: {
          userId: canonicalUserId,
          status: "COMPLETED",
          ...(courseSlug
            ? {
                topic: {
                  course: {
                    slug: courseSlug,
                  },
                },
              }
            : {}),
        },
        select: { topicId: true },
      });

      const topicIds = completedProgress.map((p) => p.topicId);

      // Only seed if user actually has completed topics in their learning history
      if (topicIds.length > 0) {
        const questionsToSeed = await db.question.findMany({
          where: {
            topicId: { in: topicIds },
            isArchived: false,
          },
          select: { id: true },
        });

        if (questionsToSeed.length > 0) {
          await db.userQuestionReview.createMany({
            data: questionsToSeed.map((q) => ({
              userId: canonicalUserId,
              questionId: q.id,
              reviewDueAt: now,
              repetitionCount: 0,
              intervalDays: 0,
              easeFactor: 2.5,
            })),
            skipDuplicates: true,
          });

          // Re-fetch initialized reviews
          reviews = await db.userQuestionReview.findMany({
            where: whereCondition,
            include: {
              question: {
                include: {
                  translations: true,
                  topic: {
                    include: {
                      translations: true,
                      course: {
                        include: {
                          translations: true,
                        },
                      },
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
    const course = q.topic.course;
    const courseTrans = course?.translations[0];

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
      courseId: course?.id,
      courseSlug: course?.slug,
      courseTitle: courseTrans?.title || "Курс",
      front: qTrans?.prompt || "Вопрос",
      back: backText || "Ответ не указан",
      codeSnippet,
      repetitions: r.repetitionCount,
      interval: r.intervalDays,
      easinessFactor: r.easeFactor,
    };
  });
}
