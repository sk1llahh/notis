import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  getDueFlashcards,
  type PrismaDbClient,
} from "../spaced-repetition-service";

describe("Spaced Repetition Service: getDueFlashcards", () => {
  test("1. Returns mapped ReviewCardDTOs with topic and course details", async () => {
    const mockDb: any = {
      userQuestionReview: {
        findMany: async (args: any) => {
          assert.equal(args.where.userId, "user-1");
          assert.equal(args.take, 15);
          return [
            {
              id: "review-1",
              userId: "user-1",
              questionId: "q-1",
              repetitionCount: 2,
              intervalDays: 6,
              easeFactor: 2.6,
              reviewDueAt: new Date("2026-09-01"),
              question: {
                id: "q-1",
                topicId: "topic-1",
                correctAnswerIndexes: [1],
                translations: [
                  {
                    locale: "ru",
                    prompt: "Что такое React hook?",
                    explanation: "Хуки позволяют использовать состояние без классов.",
                    options: [
                      { text: "Классовый компонент" },
                      { text: "Функция для работы с состоянием" },
                    ],
                  },
                ],
                topic: {
                  id: "topic-1",
                  courseId: "course-1",
                  translations: [{ locale: "ru", title: "Хуки React" }],
                  course: {
                    id: "course-1",
                    slug: "react-basics",
                    translations: [{ locale: "ru", title: "Основы React" }],
                  },
                },
              },
            },
          ];
        },
      },
    };

    const result = await getDueFlashcards(
      "user-1",
      { limit: 15 },
      mockDb as PrismaDbClient
    );

    assert.equal(result.length, 1);
    const card = result[0];
    assert.equal(card.id, "review-1");
    assert.equal(card.topicId, "topic-1");
    assert.equal(card.topicTitle, "Хуки React");
    assert.equal(card.courseId, "course-1");
    assert.equal(card.courseSlug, "react-basics");
    assert.equal(card.courseTitle, "Основы React");
    assert.equal(card.front, "Что такое React hook?");
    assert.match(card.back, /Правильный ответ: Функция для работы с состоянием/);
    assert.match(card.back, /Хуки позволяют использовать состояние/);
    assert.equal(card.repetitions, 2);
    assert.equal(card.interval, 6);
    assert.equal(card.easinessFactor, 2.6);
  });

  test("2. Filters query by courseSlug when provided in options", async () => {
    let capturedWhere: any = null;

    const mockDb: any = {
      userQuestionReview: {
        findMany: async (args: any) => {
          capturedWhere = args.where;
          return [];
        },
        count: async () => 5, // user already has reviews for this course, so no auto-seeding
      },
    };

    const result = await getDueFlashcards(
      "user-2",
      { courseSlug: "python-pro", limit: 20 },
      mockDb as PrismaDbClient
    );

    assert.equal(result.length, 0);
    assert.ok(capturedWhere);
    assert.equal(capturedWhere.userId, "user-2");
    assert.equal(
      capturedWhere.question?.topic?.course?.slug,
      "python-pro"
    );
  });

  test("3. Auto-initializes cards from completed topics when review queue is empty", async () => {
    let createdData: any[] = [];
    let findManyCalls = 0;

    const mockDb: any = {
      userQuestionReview: {
        findMany: async () => {
          findManyCalls++;
          if (findManyCalls === 1) {
            return []; // First call: no due reviews
          }
          // Second call: after seeding
          return [
            {
              id: "new-review-1",
              userId: "user-3",
              questionId: "q-10",
              repetitionCount: 0,
              intervalDays: 0,
              easeFactor: 2.5,
              reviewDueAt: new Date(),
              question: {
                id: "q-10",
                topicId: "topic-completed",
                correctAnswerIndexes: [0],
                translations: [
                  {
                    prompt: "Вопрос по завершенной теме",
                    options: ["Верный ответ"],
                  },
                ],
                topic: {
                  id: "topic-completed",
                  translations: [{ title: "Пройденная тема" }],
                  course: {
                    id: "c-1",
                    slug: "c-slug",
                    translations: [{ title: "Курс" }],
                  },
                },
              },
            },
          ];
        },
        count: async () => 0, // 0 reviews exist in DB for user
        createMany: async (args: any) => {
          createdData = args.data;
          return { count: args.data.length };
        },
      },
      userProgress: {
        findMany: async () => [{ topicId: "topic-completed" }],
      },
      question: {
        findMany: async () => [{ id: "q-10" }],
      },
    };

    const result = await getDueFlashcards(
      "user-3",
      { limit: 20 },
      mockDb as PrismaDbClient
    );

    assert.equal(createdData.length, 1);
    assert.equal(createdData[0].userId, "user-3");
    assert.equal(createdData[0].questionId, "q-10");
    assert.equal(result.length, 1);
    assert.equal(result[0].topicTitle, "Пройденная тема");
  });

  test("4. Does NOT auto-seed if user has 0 completed topics (returns empty array)", async () => {
    let createManyCalled = false;

    const mockDb: any = {
      userQuestionReview: {
        findMany: async () => [],
        count: async () => 0,
        createMany: async () => {
          createManyCalled = true;
          return { count: 0 };
        },
      },
      userProgress: {
        findMany: async () => [], // No completed topics
      },
    };

    const result = await getDueFlashcards(
      "new-user",
      { limit: 20 },
      mockDb as PrismaDbClient
    );

    assert.equal(createManyCalled, false);
    assert.equal(result.length, 0);
  });
});
