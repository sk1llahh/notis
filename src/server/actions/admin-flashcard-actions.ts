"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { assertCourseAuthor } from "@/server/auth";
import { createSafeAction, ActionException } from "./safe-action";

// =============================================================================
// SCHEMAS & TYPES
// =============================================================================

export const createFlashcardSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicId: z.string().min(1, "ID темы обязателен"),
  front: z.string().trim().min(3, "Вопрос должен содержать от 3 символов"),
  back: z.string().trim().min(3, "Ответ должен содержать от 3 символов"),
});

export type CreateFlashcardInput = z.infer<typeof createFlashcardSchema>;

export const updateFlashcardSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  questionId: z.string().min(1, "ID карточки обязателен"),
  front: z.string().trim().min(3, "Вопрос должен содержать от 3 символов"),
  back: z.string().trim().min(3, "Ответ должен содержать от 3 символов"),
});

export type UpdateFlashcardInput = z.infer<typeof updateFlashcardSchema>;

export const deleteFlashcardSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  questionId: z.string().min(1, "ID карточки обязателен"),
});

export type DeleteFlashcardInput = z.infer<typeof deleteFlashcardSchema>;

export const getTopicFlashcardsSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicId: z.string().min(1, "ID темы обязателен"),
});

export type GetTopicFlashcardsInput = z.infer<typeof getTopicFlashcardsSchema>;

export interface FlashcardDTO {
  id: string;
  topicId: string;
  front: string;
  back: string;
  order: number;
}

// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Creates a new manual flashcard (Question type FLASHCARD) for a topic.
 * Automatically synchronizes with student SM-2 review queues for users who completed the topic.
 */
export const createFlashcardAction = createSafeAction(
  createFlashcardSchema,
  async (input, ctx): Promise<{ success: true; card: FlashcardDTO }> => {
    const authorAuth = await assertCourseAuthor(input.courseSlug, ctx.session.user?.id);

    // 1. Verify topic exists and belongs to this course
    const topic = await prisma.topic.findFirst({
      where: {
        id: input.topicId,
        courseId: authorAuth.courseId,
      },
      select: { id: true },
    });

    if (!topic) {
      throw new ActionException("NOT_FOUND", "Тема курса не найдена");
    }

    // 2. Resolve next order index
    const lastQuestion = await prisma.question.findFirst({
      where: { topicId: input.topicId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const nextOrder = (lastQuestion?.order ?? 0) + 1;

    // 3. Create Question with type FLASHCARD and translation
    const question = await prisma.question.create({
      data: {
        topicId: input.topicId,
        type: "FLASHCARD",
        gradingStrategy: "SELF_ASSESSED",
        isArchived: false,
        order: nextOrder,
        translations: {
          create: {
            locale: "ru",
            prompt: input.front,
            explanation: input.back,
          },
        },
      },
      include: {
        translations: true,
      },
    });

    // 4. SM-2 Synchronization: Auto-enroll card for students who already completed the topic
    const completedUsers = await prisma.userProgress.findMany({
      where: {
        topicId: input.topicId,
        status: "COMPLETED",
      },
      select: { userId: true },
    });

    if (completedUsers.length > 0) {
      await prisma.userQuestionReview.createMany({
        data: completedUsers.map((u) => ({
          userId: u.userId,
          questionId: question.id,
          reviewDueAt: new Date(),
          repetitionCount: 0,
          intervalDays: 0,
          easeFactor: 2.5,
        })),
        skipDuplicates: true,
      });
    }

    revalidatePath(`/studio/${input.courseSlug}`);
    revalidatePath("/practice");

    return {
      success: true,
      card: {
        id: question.id,
        topicId: question.topicId,
        front: input.front,
        back: input.back,
        order: question.order,
      },
    };
  }
);

/**
 * Updates front and back content of an existing flashcard.
 */
export const updateFlashcardAction = createSafeAction(
  updateFlashcardSchema,
  async (input, ctx): Promise<{ success: true; card: FlashcardDTO }> => {
    const authorAuth = await assertCourseAuthor(input.courseSlug, ctx.session.user?.id);

    // 1. Verify question exists and belongs to this course
    const question = await prisma.question.findFirst({
      where: {
        id: input.questionId,
        topic: { courseId: authorAuth.courseId },
      },
      select: { id: true, topicId: true, order: true },
    });

    if (!question) {
      throw new ActionException("NOT_FOUND", "Карточка не найдена");
    }

    // 2. Upsert Russian translation
    await prisma.questionTranslation.upsert({
      where: {
        questionId_locale: {
          questionId: input.questionId,
          locale: "ru",
        },
      },
      update: {
        prompt: input.front,
        explanation: input.back,
      },
      create: {
        questionId: input.questionId,
        locale: "ru",
        prompt: input.front,
        explanation: input.back,
      },
    });

    revalidatePath(`/studio/${input.courseSlug}`);
    revalidatePath("/practice");

    return {
      success: true,
      card: {
        id: question.id,
        topicId: question.topicId,
        front: input.front,
        back: input.back,
        order: question.order,
      },
    };
  }
);

/**
 * Safely deletes a flashcard:
 * In a transaction, removes student review queues (UserQuestionReview) and attempts (UserQuizAttempt)
 * to respect onDelete: Restrict constraints, then deletes translations and the Question record.
 */
export const deleteFlashcardAction = createSafeAction(
  deleteFlashcardSchema,
  async (input, ctx): Promise<{ success: true }> => {
    const authorAuth = await assertCourseAuthor(input.courseSlug, ctx.session.user?.id);

    const question = await prisma.question.findFirst({
      where: {
        id: input.questionId,
        topic: { courseId: authorAuth.courseId },
      },
      select: { id: true },
    });

    if (!question) {
      throw new ActionException("NOT_FOUND", "Карточка не найдена");
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete student review queues
      await tx.userQuestionReview.deleteMany({
        where: { questionId: input.questionId },
      });

      // 2. Delete student quiz attempts if any
      await tx.userQuizAttempt.deleteMany({
        where: { questionId: input.questionId },
      });

      // 3. Delete translations
      await tx.questionTranslation.deleteMany({
        where: { questionId: input.questionId },
      });

      // 4. Delete question record
      await tx.question.delete({
        where: { id: input.questionId },
      });
    });

    revalidatePath(`/studio/${input.courseSlug}`);
    revalidatePath("/practice");

    return {
      success: true,
    };
  }
);

/**
 * Fetches all manual flashcards (Question type FLASHCARD) for a topic.
 */
export const getTopicFlashcardsAction = createSafeAction(
  getTopicFlashcardsSchema,
  async (input, ctx): Promise<{ success: true; cards: FlashcardDTO[] }> => {
    const authorAuth = await assertCourseAuthor(input.courseSlug, ctx.session.user?.id);

    const questions = await prisma.question.findMany({
      where: {
        topicId: input.topicId,
        topic: { courseId: authorAuth.courseId },
        type: "FLASHCARD",
        isArchived: false,
      },
      include: {
        translations: true,
      },
      orderBy: { order: "asc" },
    });

    const cards: FlashcardDTO[] = questions.map((q) => {
      const trans = q.translations.find((t) => t.locale === "ru") ?? q.translations[0];
      return {
        id: q.id,
        topicId: q.topicId,
        front: trans?.prompt ?? "",
        back: trans?.explanation ?? "",
        order: q.order,
      };
    });

    return {
      success: true,
      cards,
    };
  }
);
