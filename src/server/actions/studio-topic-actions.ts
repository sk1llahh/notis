"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { assertCourseAuthor } from "@/server/auth";
import { createSafeAction, ActionException } from "./safe-action";
import { getTopicStudioDetails } from "@/modules/studio/services/studio-service";
import type { TopicStudioDetailsDTO } from "@/modules/studio/types";
import {
  updateTopicContentSchema,
  upsertQuizQuestionSchema,
  deleteQuizQuestionSchema,
  publishTopicSchema,
  getTopicStudioDetailsSchema,
  type UpdateTopicContentOutput,
  type UpsertQuizQuestionOutput,
  type DeleteQuizQuestionOutput,
  type PublishTopicOutput,
} from "./studio-topic-actions.schemas";

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
