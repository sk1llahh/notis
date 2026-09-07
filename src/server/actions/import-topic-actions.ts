"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { assertCourseAuthor } from "@/server/auth";
import { createSafeAction, ActionException } from "./safe-action";
import {
  importTopicSchema,
  type ImportTopicOutput,
} from "./import-topic-actions.schemas";
import {
  Prisma,
  Difficulty,
  QuestionType,
  GradingStrategy,
} from "@prisma/client";

/**
 * Server Action: Imports a complete topic (Markdown/KaTeX/Mermaid article,
 * polymorphic quiz questions, and SM-2 flashcards) from a JSON payload.
 *
 * Atomically creates Topic, TopicTranslation, DefaultGraphLayout,
 * and Question entities inside a single transaction.
 */
export const importTopicAction = createSafeAction(
  importTopicSchema,
  async (input, { session }): Promise<ImportTopicOutput> => {
    // 1. Authenticated session check
    if (!session?.user?.id) {
      throw new ActionException("UNAUTHORIZED", "Для импорта темы требуется авторизация");
    }

    // 2. Author / Admin permissions guard
    await assertCourseAuthor(input.courseSlug, session.user.id);

    // 3. Verify course exists
    const course = await prisma.course.findUnique({
      where: { slug: input.courseSlug },
      select: { id: true, defaultLocale: true },
    });

    if (!course) {
      throw new ActionException("NOT_FOUND", "Курс не найден");
    }

    // 4. Verify topic slug uniqueness within this course
    const existingTopic = await prisma.topic.findFirst({
      where: {
        courseId: course.id,
        slug: input.slug,
      },
      select: { id: true },
    });

    if (existingTopic) {
      throw new ActionException(
        "CONFLICT",
        `Тема со слагом "${input.slug}" уже существует в этом курсе`
      );
    }

    // 5. Verify tier belongs to this course
    const tier = await prisma.tier.findFirst({
      where: {
        id: input.tierId,
        courseId: course.id,
      },
      select: { id: true, order: true },
    });

    if (!tier) {
      throw new ActionException(
        "BAD_REQUEST",
        "Указанный тир не принадлежит данному курсу"
      );
    }

    // 6. Execute atomic creation in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Step A: Calculate layout coordinates
      const existingLayouts = await tx.defaultGraphLayout.findMany({
        where: {
          courseId: course.id,
          topic: {
            tierId: input.tierId,
          },
        },
        select: {
          positionX: true,
          positionY: true,
        },
      });

      let newX = tier.order * 300 + 80;
      let newY = 80;

      if (existingLayouts.length > 0) {
        newX = existingLayouts[0].positionX;
        const maxY = Math.max(...existingLayouts.map((l) => l.positionY));
        newY = maxY + 140;
      }

      // Step B: Create Topic and localized Russian translation
      const topic = await tx.topic.create({
        data: {
          courseId: course.id,
          tierId: input.tierId,
          slug: input.slug,
          difficulty: input.difficulty as Difficulty,
          estimatedMinutes: input.estimatedMinutes,
          isFreePreview: input.isFreePreview,
          isPublished: false,
          version: 1,
          createdById: session.user?.id,
          lastEditedById: session.user?.id,
          translations: {
            create: {
              locale: "ru",
              title: input.title,
              summary: input.summary || "",
              description: input.description,
              keyPoints: input.keyPoints,
              pitfalls: input.pitfalls,
            },
          },
        },
        select: {
          id: true,
          slug: true,
        },
      });

      // Step C: Record default graph layout coordinates
      await tx.defaultGraphLayout.create({
        data: {
          courseId: course.id,
          topicId: topic.id,
          positionX: newX,
          positionY: newY,
        },
      });

      // Step D: Create quiz questions
      let questionOrder = 1;
      for (const q of input.questions) {
        let gradingStrategy: GradingStrategy = GradingStrategy.EXACT_MATCH;
        let gradingConfig: Prisma.InputJsonValue | undefined = undefined;
        const options =
          q.options?.map((text, idx) => ({
            id: `opt-${idx}`,
            text,
          })) ?? [];

        if (q.type === "SHORT_ANSWER") {
          gradingStrategy = GradingStrategy.EXACT_MATCH;
          gradingConfig = {
            acceptedAnswers: q.acceptedAnswers ?? [],
          };
        } else if (q.type === "CODE") {
          gradingStrategy = GradingStrategy.CODE_TESTS;
          if (q.codeConfig) {
            const testCases = (q.codeConfig.testCases || []).map((tc) => ({
              name: tc.name,
              input: tc.input || [],
              expected: tc.expectedOutput ?? tc.expected,
              description: tc.description,
              isHidden: tc.isHidden ?? false,
              isPrivate: tc.isPrivate ?? false,
            }));
            gradingConfig = {
              codeTemplate:
                q.codeConfig.codeTemplate ??
                q.codeConfig.initialCode ??
                q.codeConfig.solutionTemplate,
              testCases,
            };
          }
        } else if (q.type === "FLASHCARD") {
          gradingStrategy = GradingStrategy.SELF_ASSESSED;
          gradingConfig = {
            prompt: q.prompt,
            explanation: q.explanation,
          };
        }

        await tx.question.create({
          data: {
            topicId: topic.id,
            type: q.type as QuestionType,
            gradingStrategy,
            order: questionOrder++,
            correctAnswerIndexes: q.correctAnswerIndexes ?? [],
            translations: {
              create: {
                locale: "ru",
                prompt: q.prompt,
                options: options.length > 0 ? options : undefined,
                explanation: q.explanation ?? null,
                gradingConfig: gradingConfig ?? undefined,
              },
            },
          },
        });
      }

      // Step E: Create SM-2 flashcards
      for (const card of input.flashcards) {
        await tx.question.create({
          data: {
            topicId: topic.id,
            type: QuestionType.FLASHCARD,
            gradingStrategy: GradingStrategy.SELF_ASSESSED,
            order: questionOrder++,
            translations: {
              create: {
                locale: "ru",
                prompt: card.front,
                explanation: card.back,
                gradingConfig: {
                  back: card.back,
                },
              },
            },
          },
        });
      }

      return {
        topicId: topic.id,
        slug: topic.slug,
        newX,
        newY,
      };
    });

    // 7. Invalidate Next.js cache for studio and student course views
    revalidatePath(`/courses/${input.courseSlug}`);
    revalidatePath(`/studio/${input.courseSlug}`);

    return {
      topicId: result.topicId,
      slug: result.slug,
      title: input.title,
      difficulty: input.difficulty,
      tierId: input.tierId,
      questionsCount: input.questions.length,
      flashcardsCount: input.flashcards.length,
      positionX: result.newX,
      positionY: result.newY,
    };
  }
);
