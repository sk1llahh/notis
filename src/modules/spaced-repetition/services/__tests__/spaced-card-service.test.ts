import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  enrollTopicIntoReviewQueue,
  type PrismaDbClient,
} from "../spaced-card-service";

describe("Spaced Repetition: Topic Enrollment into Review Queue (enrollTopicIntoReviewQueue)", () => {
  test("1. Enrolls all active questions of a topic into the review queue", async () => {
    const upsertedReviews: any[] = [];

    const mockDb: any = {
      topic: {
        findUnique: async () => ({
          id: "topic-1",
          slug: "memory-management",
          translations: [{ title: "Управление памятью", keyPoints: [] }],
        }),
      },
      question: {
        findMany: async () => [
          { id: "q-1", type: "SINGLE_CHOICE" },
          { id: "q-2", type: "MULTIPLE_CHOICE" },
        ],
      },
      userQuestionReview: {
        upsert: async (args: any) => {
          upsertedReviews.push(args);
          return args;
        },
      },
    };

    const result = await enrollTopicIntoReviewQueue(
      "user-100",
      "topic-1",
      mockDb as PrismaDbClient
    );

    assert.equal(result.enrolledCount, 2);
    assert.equal(result.hasFlashcardFallback, false);
    assert.equal(upsertedReviews.length, 2);

    assert.equal(upsertedReviews[0].create.userId, "user-100");
    assert.equal(upsertedReviews[0].create.questionId, "q-1");
    assert.equal(upsertedReviews[0].create.intervalDays, 0);
    assert.equal(upsertedReviews[0].create.repetitionCount, 0);
    assert.equal(upsertedReviews[0].create.easeFactor, 2.5);

    assert.equal(upsertedReviews[1].create.questionId, "q-2");
  });

  test("2. Generates fallback FLASHCARD question when topic has keyPoints but no quiz questions", async () => {
    let createdQuestionData: any = null;
    let upsertedReview: any = null;

    const mockDb: any = {
      topic: {
        findUnique: async () => ({
          id: "topic-overview",
          slug: "intro-systems",
          translations: [
            {
              locale: "ru",
              title: "Введение в системы",
              keyPoints: [
                "Процессы изолированы через виртуальную память",
                "Системные вызовы переключают режим в кольцо 0",
              ],
            },
          ],
        }),
      },
      question: {
        findMany: async () => [], // No quiz questions
        findFirst: async () => null, // No existing flashcard
        create: async (args: any) => {
          createdQuestionData = args.data;
          return { id: "generated-flashcard-id", type: "FLASHCARD" };
        },
      },
      userQuestionReview: {
        upsert: async (args: any) => {
          upsertedReview = args;
          return args;
        },
      },
    };

    const result = await enrollTopicIntoReviewQueue(
      "user-200",
      "topic-overview",
      mockDb as PrismaDbClient
    );

    assert.equal(result.enrolledCount, 1);
    assert.equal(result.hasFlashcardFallback, true);

    // Verify Question creation
    assert.ok(createdQuestionData);
    assert.equal(createdQuestionData.type, "FLASHCARD");
    assert.equal(createdQuestionData.gradingStrategy, "SELF_ASSESSED");
    assert.equal(
      createdQuestionData.translations.create.prompt,
      "Ключевые концепции темы: Введение в системы"
    );
    assert.ok(
      createdQuestionData.translations.create.explanation.includes(
        "Процессы изолированы через виртуальную память"
      )
    );

    // Verify UserQuestionReview creation
    assert.ok(upsertedReview);
    assert.equal(upsertedReview.create.userId, "user-200");
    assert.equal(upsertedReview.create.questionId, "generated-flashcard-id");
    assert.equal(upsertedReview.create.intervalDays, 0);
    assert.equal(upsertedReview.create.easeFactor, 2.5);
  });

  test("3. Reuses existing FLASHCARD question without re-creating it", async () => {
    let createCalled = false;
    let upsertedReview: any = null;

    const mockDb: any = {
      topic: {
        findUnique: async () => ({
          id: "topic-overview-2",
          slug: "advanced-concurrency",
          translations: [
            {
              locale: "ru",
              title: "Конкурентность",
              keyPoints: ["Deadlock требует 4 условия Коффмана"],
            },
          ],
        }),
      },
      question: {
        findMany: async () => [],
        findFirst: async () => ({
          id: "existing-flashcard-999",
          type: "FLASHCARD",
        }),
        create: async () => {
          createCalled = true;
          return { id: "should-not-be-called" };
        },
      },
      userQuestionReview: {
        upsert: async (args: any) => {
          upsertedReview = args;
          return args;
        },
      },
    };

    const result = await enrollTopicIntoReviewQueue(
      "user-300",
      "topic-overview-2",
      mockDb as PrismaDbClient
    );

    assert.equal(result.enrolledCount, 1);
    assert.equal(result.hasFlashcardFallback, true);
    assert.equal(createCalled, false, "Should not call question.create if flashcard already exists");
    assert.equal(upsertedReview.create.questionId, "existing-flashcard-999");
  });

  test("4. Returns 0 enrolled cards if topic is not found", async () => {
    const mockDb: any = {
      topic: {
        findUnique: async () => null,
      },
    };

    const result = await enrollTopicIntoReviewQueue(
      "user-400",
      "non-existent-topic",
      mockDb as PrismaDbClient
    );

    assert.equal(result.enrolledCount, 0);
    assert.equal(result.hasFlashcardFallback, false);
  });

  test("5. Returns 0 enrolled cards if topic has no questions and no keyPoints", async () => {
    const mockDb: any = {
      topic: {
        findUnique: async () => ({
          id: "empty-topic",
          slug: "empty-slug",
          translations: [{ title: "Пустая тема", keyPoints: [] }],
        }),
      },
      question: {
        findMany: async () => [],
      },
    };

    const result = await enrollTopicIntoReviewQueue(
      "user-500",
      "empty-topic",
      mockDb as PrismaDbClient
    );

    assert.equal(result.enrolledCount, 0);
    assert.equal(result.hasFlashcardFallback, false);
  });
});
