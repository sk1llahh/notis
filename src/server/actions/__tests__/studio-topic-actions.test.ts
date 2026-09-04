import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  updateTopicContentSchema,
  updateTopicContentAction,
  upsertQuizQuestionSchema,
  upsertQuizQuestionAction,
  deleteQuizQuestionSchema,
  publishTopicSchema,
} from "../studio-topic-actions";

describe("Studio Topic Actions: Schemas & Validation", () => {
  // ---------------------------------------------------------------------------
  // 1. updateTopicContentSchema
  // ---------------------------------------------------------------------------
  test("1. updateTopicContentSchema parses valid topic content with default isFreePreview and estimatedMinutes", () => {
    const valid = {
      courseSlug: "cs-foundations",
      topicId: "topic-1",
      title: "Архитектура памяти",
      summary: "Краткий обзор стек vs куча",
      difficulty: "BEGINNER",
      keyPoints: ["Стек быстрый", "Куча динамическая"],
      pitfalls: ["Утечка памяти"],
    };

    const parsed = updateTopicContentSchema.safeParse(valid);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.title, "Архитектура памяти");
      assert.equal(parsed.data.difficulty, "BEGINNER");
      assert.equal(parsed.data.keyPoints.length, 2);
      assert.equal(parsed.data.isFreePreview, false);
      assert.equal(parsed.data.estimatedMinutes, 15);
      assert.equal(parsed.data.description, undefined);
    }
  });

  test("1.1. updateTopicContentSchema parses full article description, custom isFreePreview and estimatedMinutes", () => {
    const validFull = {
      courseSlug: "cs-foundations",
      topicId: "topic-1",
      title: "Архитектура памяти",
      summary: "Краткий обзор стек vs куча",
      description: "## Устройство памяти\n\nПамять делится на **стек** и **кучу**.\n\n```c\nint x = 42;\n```",
      isFreePreview: true,
      estimatedMinutes: 45,
      difficulty: "ADVANCED",
      keyPoints: ["Стек быстрый", "Куча динамическая"],
      pitfalls: ["Утечка памяти"],
    };

    const parsed = updateTopicContentSchema.safeParse(validFull);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.isFreePreview, true);
      assert.equal(parsed.data.estimatedMinutes, 45);
      assert.ok(parsed.data.description?.includes("## Устройство памяти"));
    }
  });

  test("1.2. updateTopicContentSchema rejects invalid estimatedMinutes (< 1 or > 300 or non-integer)", () => {
    const base = {
      courseSlug: "cs-foundations",
      topicId: "topic-1",
      title: "Архитектура памяти",
      summary: "Описание",
      difficulty: "BEGINNER",
    };

    // Less than 1
    const resLow = updateTopicContentSchema.safeParse({ ...base, estimatedMinutes: 0 });
    assert.equal(resLow.success, false);
    if (!resLow.success) {
      assert.ok(resLow.error.flatten().fieldErrors.estimatedMinutes);
    }

    // Greater than 300
    const resHigh = updateTopicContentSchema.safeParse({ ...base, estimatedMinutes: 301 });
    assert.equal(resHigh.success, false);
    if (!resHigh.success) {
      assert.ok(resHigh.error.flatten().fieldErrors.estimatedMinutes);
    }

    // Floating point
    const resFloat = updateTopicContentSchema.safeParse({ ...base, estimatedMinutes: 12.5 });
    assert.equal(resFloat.success, false);
    if (!resFloat.success) {
      assert.ok(resFloat.error.flatten().fieldErrors.estimatedMinutes);
    }
  });

  test("2. updateTopicContentSchema rejects empty or short title (< 2 chars)", () => {
    const invalidShortTitle = {
      courseSlug: "cs-foundations",
      topicId: "topic-1",
      title: "А",
      summary: "Описание",
      difficulty: "BEGINNER",
    };

    const result = updateTopicContentSchema.safeParse(invalidShortTitle);
    assert.equal(result.success, false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      assert.ok(fieldErrors.title);
      assert.match(fieldErrors.title[0], /не менее 2 символов/);
    }
  });

  test("3. updateTopicContentAction returns BAD_REQUEST on invalid title", async () => {
    const result = await updateTopicContentAction({
      courseSlug: "cs-foundations",
      topicId: "topic-1",
      title: "",
      summary: "Описание",
      difficulty: "BEGINNER",
      keyPoints: [],
      pitfalls: [],
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "BAD_REQUEST");
      assert.ok(result.error.fieldErrors?.title);
    }
  });

  // ---------------------------------------------------------------------------
  // 2. upsertQuizQuestionSchema
  // ---------------------------------------------------------------------------
  test("4. upsertQuizQuestionSchema parses valid SINGLE_CHOICE question", () => {
    const validSingle = {
      courseSlug: "cs-foundations",
      topicId: "topic-1",
      question: "Что хранится в стеке вызовов?",
      type: "SINGLE_CHOICE",
      options: [
        { text: "Локальные переменные и фреймы функций" },
        { text: "Динамически выделенные объекты произвольного размера" },
      ],
      correctIndexes: [0],
      explanation: "Стек хранит стек-фреймы локальных вызовов",
    };

    const parsed = upsertQuizQuestionSchema.safeParse(validSingle);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.correctIndexes[0], 0);
      assert.equal(parsed.data.options.length, 2);
    }
  });

  test("5. upsertQuizQuestionSchema rejects quiz with less than 2 options", () => {
    const invalidOptions = {
      courseSlug: "cs-foundations",
      topicId: "topic-1",
      question: "Корректный длинный вопрос?",
      type: "SINGLE_CHOICE",
      options: [{ text: "Единственный вариант" }],
      correctIndexes: [0],
    };

    const result = upsertQuizQuestionSchema.safeParse(invalidOptions);
    assert.equal(result.success, false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      assert.ok(fieldErrors.options);
      assert.match(fieldErrors.options[0], /минимум 2 варианта/);
    }
  });

  test("6. upsertQuizQuestionSchema rejects correctIndexes out of options range", () => {
    const outOfRange = {
      courseSlug: "cs-foundations",
      topicId: "topic-1",
      question: "Какой-то вопрос для теста диапазонов?",
      type: "SINGLE_CHOICE",
      options: [
        { text: "Вариант 0" },
        { text: "Вариант 1" },
      ],
      correctIndexes: [5], // Index 5 does not exist (only 0 and 1)
    };

    const result = upsertQuizQuestionSchema.safeParse(outOfRange);
    assert.equal(result.success, false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      assert.ok(fieldErrors.correctIndexes);
      assert.match(fieldErrors.correctIndexes[0], /выходят за диапазон/);
    }
  });

  test("7. upsertQuizQuestionSchema rejects multiple correct answers for SINGLE_CHOICE", () => {
    const multipleInSingle = {
      courseSlug: "cs-foundations",
      topicId: "topic-1",
      question: "Вопрос с одиночным выбором?",
      type: "SINGLE_CHOICE",
      options: [
        { text: "Вариант 0" },
        { text: "Вариант 1" },
        { text: "Вариант 2" },
      ],
      correctIndexes: [0, 1], // Two correct answers not allowed for SINGLE_CHOICE
    };

    const result = upsertQuizQuestionSchema.safeParse(multipleInSingle);
    assert.equal(result.success, false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      assert.ok(fieldErrors.correctIndexes);
      assert.match(fieldErrors.correctIndexes[0], /строго один правильный ответ/);
    }
  });

  test("8. upsertQuizQuestionSchema accepts multiple correct answers for MULTIPLE_CHOICE", () => {
    const validMulti = {
      courseSlug: "cs-foundations",
      topicId: "topic-1",
      question: "Какие структуры данных являются линейными?",
      type: "MULTIPLE_CHOICE",
      options: [
        { text: "Массив" },
        { text: "Связный список" },
        { text: "Граф" },
      ],
      correctIndexes: [0, 1],
    };

    const result = upsertQuizQuestionSchema.safeParse(validMulti);
    assert.equal(result.success, true);
  });

  test("9. upsertQuizQuestionAction returns BAD_REQUEST on invalid question length (< 5 chars)", async () => {
    const result = await upsertQuizQuestionAction({
      courseSlug: "cs-foundations",
      topicId: "topic-1",
      question: "Кот",
      type: "SINGLE_CHOICE",
      options: [{ text: "А" }, { text: "Б" }],
      correctIndexes: [0],
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "BAD_REQUEST");
      assert.ok(result.error.fieldErrors?.question);
    }
  });

  // ---------------------------------------------------------------------------
  // 3. deleteQuizQuestionSchema & publishTopicSchema
  // ---------------------------------------------------------------------------
  test("10. deleteQuizQuestionSchema validates required identifiers", () => {
    assert.equal(
      deleteQuizQuestionSchema.safeParse({
        courseSlug: "cs",
        topicId: "t1",
        questionId: "q1",
      }).success,
      true
    );

    assert.equal(
      deleteQuizQuestionSchema.safeParse({
        courseSlug: "",
        topicId: "t1",
        questionId: "q1",
      }).success,
      false
    );
  });

  test("11. publishTopicSchema validates topic publication and bumpVersion flag", () => {
    const parsed = publishTopicSchema.safeParse({
      courseSlug: "cs-foundations",
      topicId: "topic-1",
      isPublished: true,
      bumpVersion: true,
    });

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.isPublished, true);
      assert.equal(parsed.data.bumpVersion, true);
    }
  });
});
