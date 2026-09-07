import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  importTopicSchema,
  importedTopicPayloadSchema,
  importedQuestionSchema,
  importedFlashcardSchema,
  importedCodeConfigSchema,
} from "../import-topic-actions.schemas";
import { importTopicAction } from "../import-topic-actions";
import { SAMPLE_TOPIC_JSON } from "@/modules/studio/components/ImportTopicModal";

describe("import-topic-actions: Schemas and Server Action", () => {
  describe("importedCodeConfigSchema", () => {
    test("1. parses valid code configuration with test cases and language", () => {
      const valid = {
        language: "typescript",
        initialCode: "function sum(a: number, b: number) { return 0; }",
        testCases: [
          {
            name: "Basic addition",
            input: [1, 2],
            expectedOutput: 3,
            description: "1 + 2 = 3",
          },
        ],
      };
      const result = importedCodeConfigSchema.safeParse(valid);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.language, "typescript");
        assert.equal(result.data.testCases.length, 1);
        assert.equal(result.data.testCases[0].name, "Basic addition");
      }
    });

    test("2. applies defaults when testCases is omitted", () => {
      const minimal = {
        initialCode: "console.log('hello');",
      };
      const result = importedCodeConfigSchema.safeParse(minimal);
      assert.equal(result.success, true);
      if (result.success) {
        assert.deepEqual(result.data.testCases, []);
      }
    });
  });

  describe("importedQuestionSchema", () => {
    test("1. parses SINGLE_CHOICE and maps correctOptionIndex to correctAnswerIndexes", () => {
      const q = {
        type: "SINGLE_CHOICE",
        prompt: "Что такое кубит?",
        options: ["Классический бит", "Квантовый бит", "Байт"],
        correctOptionIndex: 1,
        explanation: "Кубит — наименьший элемент квантовой информации.",
      };
      const result = importedQuestionSchema.safeParse(q);
      assert.equal(result.success, true);
      if (result.success) {
        assert.deepEqual(result.data.correctAnswerIndexes, [1]);
        assert.equal(result.data.type, "SINGLE_CHOICE");
      }
    });

    test("2. parses MULTIPLE_CHOICE and maps correctOptionIndices to correctAnswerIndexes", () => {
      const q = {
        type: "MULTIPLE_CHOICE",
        prompt: "Какие принципы квантовой механики верны?",
        options: ["Суперпозиция", "Квантовая запутанность", "Закон Ома"],
        correctOptionIndices: [0, 1],
      };
      const result = importedQuestionSchema.safeParse(q);
      assert.equal(result.success, true);
      if (result.success) {
        assert.deepEqual(result.data.correctAnswerIndexes, [0, 1]);
      }
    });

    test("3. preserves explicitly provided correctAnswerIndexes", () => {
      const q = {
        type: "SINGLE_CHOICE",
        prompt: "Базисное состояние",
        options: ["|0>", "|1>"],
        correctAnswerIndexes: [0],
      };
      const result = importedQuestionSchema.safeParse(q);
      assert.equal(result.success, true);
      if (result.success) {
        assert.deepEqual(result.data.correctAnswerIndexes, [0]);
      }
    });

    test("4. parses SHORT_ANSWER with acceptedAnswers", () => {
      const q = {
        type: "SHORT_ANSWER",
        prompt: "Назовите автора алгоритма квантового поиска",
        acceptedAnswers: ["Гровер", "Grover", "Лов Гровер"],
        explanation: "Лов Гровер предложил алгоритм в 1996 году.",
      };
      const result = importedQuestionSchema.safeParse(q);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.acceptedAnswers?.length, 3);
        assert.equal(result.data.type, "SHORT_ANSWER");
      }
    });

    test("5. parses CODE question with language and testCases", () => {
      const q = {
        type: "CODE",
        prompt: "Реализуйте функцию инверсии бита",
        codeConfig: {
          language: "python",
          initialCode: "def flip(bit: int) -> int:\n    pass",
          testCases: [
            {
              name: "Flip 0",
              input: [0],
              expectedOutput: 1,
            },
            {
              name: "Flip 1",
              input: [1],
              expectedOutput: 0,
            },
          ],
        },
      };
      const result = importedQuestionSchema.safeParse(q);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.type, "CODE");
        assert.equal(result.data.codeConfig?.testCases.length, 2);
      }
    });

    test("6. parses FLASHCARD self-assessed question", () => {
      const q = {
        type: "FLASHCARD",
        prompt: "Что гласит принцип неопределенности Гейзенберга?",
        explanation: "Невозможно одновременно точно измерить координату и импульс частицы.",
      };
      const result = importedQuestionSchema.safeParse(q);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.type, "FLASHCARD");
        assert.ok(result.data.explanation);
      }
    });

    test("7. rejects question with empty prompt", () => {
      const q = {
        type: "SINGLE_CHOICE",
        prompt: "",
      };
      const result = importedQuestionSchema.safeParse(q);
      assert.equal(result.success, false);
    });
  });

  describe("importedFlashcardSchema", () => {
    test("1. parses valid SM-2 flashcard", () => {
      const card = {
        front: "Что такое бра-вектор?",
        back: "Эрмитово-сопряженный вектор к кет-вектору: <psi| = (|psi>)^dagger",
      };
      const result = importedFlashcardSchema.safeParse(card);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.front, card.front);
        assert.equal(result.data.back, card.back);
      }
    });

    test("2. rejects flashcard with empty front or back", () => {
      assert.equal(
        importedFlashcardSchema.safeParse({ front: "", back: "answer" }).success,
        false
      );
      assert.equal(
        importedFlashcardSchema.safeParse({ front: "question", back: "" }).success,
        false
      );
    });
  });

  describe("importedTopicPayloadSchema & SAMPLE_TOPIC_JSON", () => {
    test("1. successfully parses SAMPLE_TOPIC_JSON template", () => {
      const raw = JSON.parse(SAMPLE_TOPIC_JSON);
      const result = importedTopicPayloadSchema.safeParse(raw);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.slug, "quantum-computing-intro");
        assert.equal(result.data.title, "Введение в квантовые вычисления");
        assert.equal(result.data.difficulty, "INTERMEDIATE");
        assert.equal(result.data.questions.length, 5);
        assert.equal(result.data.flashcards.length, 3);
        assert.ok(result.data.description.includes("## 1. Кубит"));
        assert.ok(result.data.description.includes("```mermaid"));
        assert.ok(result.data.description.includes("$$|\\psi\\rangle"));
      }
    });

    test("2. rejects empty description (Markdown body invariant)", () => {
      const invalid = {
        title: "Квантовые схемы",
        slug: "quantum-circuits",
        description: "",
      };
      const result = importedTopicPayloadSchema.safeParse(invalid);
      assert.equal(result.success, false);
    });

    test("3. rejects invalid slug characters (spaces, uppercase, cyrillic)", () => {
      const invalidSlugSpaces = {
        title: "Тема",
        slug: "invalid slug",
        description: "Текст",
      };
      const invalidSlugUpper = {
        title: "Тема",
        slug: "Invalid-Slug",
        description: "Текст",
      };
      const invalidSlugCyrillic = {
        title: "Тема",
        slug: "кванты",
        description: "Текст",
      };

      assert.equal(importedTopicPayloadSchema.safeParse(invalidSlugSpaces).success, false);
      assert.equal(importedTopicPayloadSchema.safeParse(invalidSlugUpper).success, false);
      assert.equal(importedTopicPayloadSchema.safeParse(invalidSlugCyrillic).success, false);
    });

    test("4. rejects estimatedMinutes outside [1, 600] range", () => {
      const zeroMinutes = {
        title: "Тема",
        slug: "valid-slug",
        description: "Описание",
        estimatedMinutes: 0,
      };
      const excessiveMinutes = {
        title: "Тема",
        slug: "valid-slug",
        description: "Описание",
        estimatedMinutes: 1000,
      };

      assert.equal(importedTopicPayloadSchema.safeParse(zeroMinutes).success, false);
      assert.equal(importedTopicPayloadSchema.safeParse(excessiveMinutes).success, false);
    });
  });

  describe("importTopicSchema", () => {
    test("1. requires courseSlug and tierId in addition to payload", () => {
      const raw = JSON.parse(SAMPLE_TOPIC_JSON);
      const missingCourseAndTier = { ...raw };
      assert.equal(importTopicSchema.safeParse(missingCourseAndTier).success, false);

      const withCourseAndTier = {
        ...raw,
        courseSlug: "quantum-course",
        tierId: "tier-lvl-1",
      };
      const result = importTopicSchema.safeParse(withCourseAndTier);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.courseSlug, "quantum-course");
        assert.equal(result.data.tierId, "tier-lvl-1");
      }
    });
  });

  describe("importTopicAction execution guards", () => {
    test("1. returns BAD_REQUEST when input fails validation", async () => {
      const result = await importTopicAction({
        courseSlug: "",
        tierId: "",
        title: "A",
        slug: "INVALID SLUG",
        description: "",
      } as any);

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
        assert.ok(result.error.fieldErrors?.courseSlug);
        assert.ok(result.error.fieldErrors?.tierId);
        assert.ok(result.error.fieldErrors?.slug);
        assert.ok(result.error.fieldErrors?.description);
      }
    });

    test("2. returns BAD_REQUEST when questions contain invalid prompts", async () => {
      const raw = JSON.parse(SAMPLE_TOPIC_JSON);
      const invalid = {
        ...raw,
        courseSlug: "valid-course",
        tierId: "tier-123",
        questions: [
          {
            type: "SINGLE_CHOICE",
            prompt: "",
          },
        ],
      };
      const result = await importTopicAction(invalid as any);

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
        assert.ok(result.error.fieldErrors?.["questions.0.prompt"]);
      }
    });

    test("3. returns BAD_REQUEST when flashcard front is empty", async () => {
      const raw = JSON.parse(SAMPLE_TOPIC_JSON);
      const invalid = {
        ...raw,
        courseSlug: "valid-course",
        tierId: "tier-123",
        flashcards: [
          {
            front: "",
            back: "Some answer",
          },
        ],
      };
      const result = await importTopicAction(invalid as any);

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
        assert.ok(result.error.fieldErrors?.["flashcards.0.front"]);
      }
    });
  });
});
