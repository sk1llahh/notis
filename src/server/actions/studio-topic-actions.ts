"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { assertCourseAuthor } from "@/server/auth";
import { createSafeAction, ActionException } from "./safe-action";
import { getTopicStudioDetails } from "@/modules/studio/services/studio-service";
import type { TopicStudioDetailsDTO } from "@/modules/studio/types";


// =============================================================================
// SCHEMAS & TYPES
// =============================================================================

export const updateTopicContentSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicId: z.string().min(1, "ID темы обязателен"),
  title: z.string().min(2, "Заголовок должен содержать не менее 2 символов"),
  summary: z.string().default(""),
  description: z.string().optional(),
  isFreePreview: z.boolean().default(false),
  estimatedMinutes: z.number().int().min(1, "Минимум 1 минута").max(300, "Максимум 300 минут").default(15),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  keyPoints: z.array(z.string()).default([]),
  pitfalls: z.array(z.string()).default([]),
});

export type UpdateTopicContentInput = z.infer<typeof updateTopicContentSchema>;

export interface UpdateTopicContentOutput {
  topicId: string;
  title: string;
  difficulty: string;
  isFreePreview?: boolean;
  estimatedMinutes?: number;
}

export const quizOptionSchema = z.object({
  text: z.string().min(1, "Текст варианта ответа обязателен"),
  codeSnippet: z.string().optional(),
});

export const upsertQuizQuestionSchema = z
  .object({
    courseSlug: z.string().min(1, "Слаг курса обязателен"),
    topicId: z.string().min(1, "ID темы обязателен"),
    questionId: z.string().optional(),
    question: z.string().min(5, "Текст вопроса должен содержать не менее 5 символов"),
    type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "SHORT_ANSWER", "CODE"]).default("SINGLE_CHOICE"),
    options: z.array(quizOptionSchema).optional().default([]),
    correctIndexes: z.array(z.number()).optional().default([]),
    acceptedAnswers: z.array(z.string()).optional().default([]),
    codeTemplate: z.string().optional(),
    testCases: z.array(z.any()).optional().default([]),
    explanation: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "SINGLE_CHOICE" || data.type === "MULTIPLE_CHOICE") {
        return data.options.length >= 2;
      }
      return true;
    },
    {
      message: "Требуется минимум 2 варианта ответа для вопроса с выбором",
      path: ["options"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "SINGLE_CHOICE" || data.type === "MULTIPLE_CHOICE") {
        return (
          data.correctIndexes.length >= 1 &&
          data.correctIndexes.every(
            (idx) => Number.isInteger(idx) && idx >= 0 && idx < data.options.length
          )
        );
      }
      return true;
    },
    {
      message: "Индексы правильных ответов выходят за диапазон вариантов",
      path: ["correctIndexes"],
    }
  )
  .refine(
    (data) =>
      data.type !== "SINGLE_CHOICE" || data.correctIndexes.length === 1,
    {
      message: "Для одиночного выбора допускается строго один правильный ответ",
      path: ["correctIndexes"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "SHORT_ANSWER") {
        return data.acceptedAnswers.length > 0 && data.acceptedAnswers.some((a) => a.trim().length > 0);
      }
      return true;
    },
    {
      message: "Укажите хотя бы один правильный текстовый ответ",
      path: ["acceptedAnswers"],
    }
  );

export type UpsertQuizQuestionInput = z.infer<typeof upsertQuizQuestionSchema>;

export interface UpsertQuizQuestionOutput {
  id: string;
  topicId: string;
}

export const deleteQuizQuestionSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicId: z.string().min(1, "ID темы обязателен"),
  questionId: z.string().min(1, "ID вопроса обязателен"),
});

export type DeleteQuizQuestionInput = z.infer<typeof deleteQuizQuestionSchema>;

export interface DeleteQuizQuestionOutput {
  questionId: string;
  topicId: string;
}

export const publishTopicSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicId: z.string().min(1, "ID темы обязателен"),
  isPublished: z.boolean(),
  bumpVersion: z.boolean(),
});

export type PublishTopicInput = z.infer<typeof publishTopicSchema>;

export interface PublishTopicOutput {
  topicId: string;
  isPublished: boolean;
  version: number;
}

export const getTopicStudioDetailsSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicId: z.string().min(1, "ID темы обязателен"),
});

export type GetTopicStudioDetailsInput = z.infer<typeof getTopicStudioDetailsSchema>;

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Server Action: Updates topic difficulty, title, summary, keyPoints, and pitfalls.
 */
export const updateTopicContentAction = createSafeAction(
  updateTopicContentSchema,
  async (input, { session }): Promise<UpdateTopicContentOutput> => {
    // 1. RBAC Guard
    await assertCourseAuthor(input.courseSlug, session.user?.id);

    // 2. Fetch Topic to obtain default locale
    const topic = await prisma.topic.findUnique({
      where: { id: input.topicId },
      include: {
        course: { select: { defaultLocale: true } },
      },
    });

    if (!topic) {
      throw new ActionException("NOT_FOUND", "Тема не найдена");
    }

    const locale = topic.course.defaultLocale || "ru";

    // Filter empty lines in keyPoints and pitfalls
    const cleanedKeyPoints = input.keyPoints
      .map((p) => p.trim())
      .filter(Boolean);
    const cleanedPitfalls = input.pitfalls
      .map((p) => p.trim())
      .filter(Boolean);

    // 3. Update topic and translation
    await prisma.topic.update({
      where: { id: input.topicId },
      data: {
        difficulty: input.difficulty,
        isFreePreview: input.isFreePreview,
        estimatedMinutes: input.estimatedMinutes,
        translations: {
          upsert: {
            where: {
              topicId_locale: {
                topicId: input.topicId,
                locale,
              },
            },
            create: {
              locale,
              title: input.title,
              summary: input.summary,
              description: input.description ?? null,
              keyPoints: cleanedKeyPoints,
              pitfalls: cleanedPitfalls,
            },
            update: {
              title: input.title,
              summary: input.summary,
              description: input.description ?? null,
              keyPoints: cleanedKeyPoints,
              pitfalls: cleanedPitfalls,
            },
          },
        },
      },
    });

    // 4. Cache revalidation
    revalidatePath(`/courses/${input.courseSlug}`);
    revalidatePath(`/studio/${input.courseSlug}`);
    revalidatePath(`/courses/${input.courseSlug}/topics/${topic.slug}`);

    return {
      topicId: input.topicId,
      title: input.title,
      difficulty: input.difficulty,
      isFreePreview: input.isFreePreview,
      estimatedMinutes: input.estimatedMinutes,
    };
  }
);

/**
 * Server Action: Creates or updates a quiz question for a topic.
 */
export const upsertQuizQuestionAction = createSafeAction(
  upsertQuizQuestionSchema,
  async (input, { session }): Promise<UpsertQuizQuestionOutput> => {
    // 1. RBAC Guard
    await assertCourseAuthor(input.courseSlug, session.user?.id);

    // 2. Fetch Topic
    const topic = await prisma.topic.findUnique({
      where: { id: input.topicId },
      include: {
        course: { select: { defaultLocale: true } },
      },
    });

    if (!topic) {
      throw new ActionException("NOT_FOUND", "Тема не найдена");
    }

    const locale = topic.course.defaultLocale || "ru";

    let questionId = input.questionId;

    const gradingConfig = {
      acceptedAnswers: input.acceptedAnswers,
      codeTemplate: input.codeTemplate,
      testCases: input.testCases,
    };

    if (questionId) {
      // Update existing question
      await prisma.question.update({
        where: { id: questionId },
        data: {
          type: input.type as any,
          correctAnswerIndexes: input.correctIndexes,
          translations: {
            upsert: {
              where: {
                questionId_locale: {
                  questionId,
                  locale,
                },
              },
              create: {
                locale,
                prompt: input.question,
                options: input.options,
                explanation: input.explanation,
                gradingConfig: gradingConfig as any,
              },
              update: {
                prompt: input.question,
                options: input.options,
                explanation: input.explanation,
                gradingConfig: gradingConfig as any,
              },
            },
          },
        },
      });
    } else {
      // Determine question order
      const count = await prisma.question.count({
        where: { topicId: input.topicId, isArchived: false },
      });

      // Create new question
      const newQuestion = await prisma.question.create({
        data: {
          topicId: input.topicId,
          type: input.type as any,
          order: count + 1,
          correctAnswerIndexes: input.correctIndexes,
          translations: {
            create: {
              locale,
              prompt: input.question,
              options: input.options,
              explanation: input.explanation,
              gradingConfig: gradingConfig as any,
            },
          },
        },
      });

      questionId = newQuestion.id;
    }

    // 3. Cache revalidation
    revalidatePath(`/courses/${input.courseSlug}`);
    revalidatePath(`/studio/${input.courseSlug}`);

    return {
      id: questionId,
      topicId: input.topicId,
    };
  }
);

/**
 * Server Action: Deletes a quiz question.
 */
export const deleteQuizQuestionAction = createSafeAction(
  deleteQuizQuestionSchema,
  async (input, { session }): Promise<DeleteQuizQuestionOutput> => {
    // 1. RBAC Guard
    await assertCourseAuthor(input.courseSlug, session.user?.id);

    // 2. Delete question
    await prisma.question.delete({
      where: { id: input.questionId },
    });

    // 3. Cache revalidation
    revalidatePath(`/courses/${input.courseSlug}`);
    revalidatePath(`/studio/${input.courseSlug}`);

    return {
      questionId: input.questionId,
      topicId: input.topicId,
    };
  }
);

/**
 * Server Action: Updates topic publication status and optionally increments version.
 */
export const publishTopicAction = createSafeAction(
  publishTopicSchema,
  async (input, { session }): Promise<PublishTopicOutput> => {
    // 1. RBAC Guard
    await assertCourseAuthor(input.courseSlug, session.user?.id);

    // 2. Update publication & version
    const updated = await prisma.topic.update({
      where: { id: input.topicId },
      data: {
        isPublished: input.isPublished,
        ...(input.bumpVersion ? { version: { increment: 1 } } : {}),
      },
      select: {
        id: true,
        isPublished: true,
        version: true,
      },
    });

    // 3. Cache revalidation
    revalidatePath(`/courses/${input.courseSlug}`);
    revalidatePath(`/studio/${input.courseSlug}`);

    return {
      topicId: updated.id,
      isPublished: updated.isPublished,
      version: updated.version,
    };
  }
);

/**
 * Server Action: Fetches full topic details (including quiz with correct answers) for the Author Studio.
 */
export const getTopicStudioDetailsAction = createSafeAction(
  getTopicStudioDetailsSchema,
  async (input, { session }): Promise<TopicStudioDetailsDTO> => {
    // 1. RBAC Guard
    await assertCourseAuthor(input.courseSlug, session.user?.id);

    // 2. Domain Service
    const details = await getTopicStudioDetails(input.topicId);
    if (!details) {
      throw new ActionException("NOT_FOUND", "Тема не найдена");
    }

    return details;
  }
);
