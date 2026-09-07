import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  generateTopicInputSchema,
  type GenerateTopicInput,
} from "../ai-topic-actions.schemas";
import { generateTopicDraftAction } from "../ai-topic-actions";
import {
  SYSTEM_CURRICULUM_PROMPT,
  buildTopicGenerationPrompt,
} from "@/server/ai/prompts";

describe("ai-topic-actions: Schemas, Prompting & Action Guards", () => {
  describe("generateTopicInputSchema", () => {
    test("1. parses valid topic generation request with defaults", () => {
      const valid = {
        courseSlug: "algorithms-101",
        topicTitle: "Красно-черные деревья: свойства и балансировка",
      };
      const result = generateTopicInputSchema.safeParse(valid);

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.courseSlug, "algorithms-101");
        assert.equal(
          result.data.topicTitle,
          "Красно-черные деревья: свойства и балансировка"
        );
        assert.equal(result.data.difficulty, "INTERMEDIATE");
        assert.equal(result.data.model, "gemini-2.5-flash");
      }
    });

    test("2. accepts optional parameters (targetAudience, focusAreas, sourceMaterial, customApiKey, model)", () => {
      const payload = {
        courseSlug: "algorithms-101",
        topicTitle: "Амортизированный анализ",
        difficulty: "ADVANCED",
        targetAudience: "Студенты 2-3 курсов CS",
        focusAreas: "Метод потенциалов, доказательство учетных стоимостей",
        sourceMaterial: "Выдержка из книги Кормена (глава 17)...",
        customApiKey: "AIzaSyTestKey12345",
        model: "gemini-1.5-pro",
      };
      const result = generateTopicInputSchema.safeParse(payload);

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.difficulty, "ADVANCED");
        assert.equal(result.data.model, "gemini-1.5-pro");
        assert.equal(result.data.customApiKey, "AIzaSyTestKey12345");
        assert.ok(result.data.focusAreas?.includes("Метод потенциалов"));
      }
    });

    test("3. rejects empty or short topic title (< 2 chars)", () => {
      const emptyTitle = { courseSlug: "course", topicTitle: "" };
      const shortTitle = { courseSlug: "course", topicTitle: "A" };

      assert.equal(generateTopicInputSchema.safeParse(emptyTitle).success, false);
      assert.equal(generateTopicInputSchema.safeParse(shortTitle).success, false);
    });

    test("4. rejects empty courseSlug", () => {
      const invalid = {
        courseSlug: "",
        topicTitle: "Валидная тема",
      };
      assert.equal(generateTopicInputSchema.safeParse(invalid).success, false);
    });

    test("5. rejects sourceMaterial exceeding length limit (> 30000 chars)", () => {
      const hugeMaterial = {
        courseSlug: "course",
        topicTitle: "Тема",
        sourceMaterial: "a".repeat(30001),
      };
      const result = generateTopicInputSchema.safeParse(hugeMaterial);
      assert.equal(result.success, false);
    });
  });

  describe("AI Curriculum Prompting", () => {
    test("1. SYSTEM_CURRICULUM_PROMPT strictly requires KaTeX, Mermaid, and 5 question types", () => {
      assert.ok(SYSTEM_CURRICULUM_PROMPT.includes("KaTeX"));
      assert.ok(SYSTEM_CURRICULUM_PROMPT.includes("Mermaid"));
      assert.ok(SYSTEM_CURRICULUM_PROMPT.includes("SINGLE_CHOICE"));
      assert.ok(SYSTEM_CURRICULUM_PROMPT.includes("MULTIPLE_CHOICE"));
      assert.ok(SYSTEM_CURRICULUM_PROMPT.includes("SHORT_ANSWER"));
      assert.ok(SYSTEM_CURRICULUM_PROMPT.includes("CODE"));
      assert.ok(SYSTEM_CURRICULUM_PROMPT.includes("FLASHCARD"));
      assert.ok(SYSTEM_CURRICULUM_PROMPT.includes("keyPoints"));
      assert.ok(SYSTEM_CURRICULUM_PROMPT.includes("pitfalls"));
    });

    test("2. buildTopicGenerationPrompt includes custom author guidance", () => {
      const prompt = buildTopicGenerationPrompt({
        courseSlug: "db-internals",
        topicTitle: "B-деревья: алгоритм разбиения",
        difficulty: "ADVANCED",
        targetAudience: "Database Engineers",
        focusAreas: "Формула минимальной и максимальной степени t",
        sourceMaterial: "В каждом узле содержится от t-1 до 2t-1 ключей.",
        model: "gemini-2.5-flash",
      });

      assert.ok(prompt.includes("B-деревья: алгоритм разбиения"));
      assert.ok(prompt.includes("ADVANCED"));
      assert.ok(prompt.includes("Database Engineers"));
      assert.ok(prompt.includes("Формула минимальной и максимальной степени t"));
      assert.ok(prompt.includes("В каждом узле содержится от t-1 до 2t-1 ключей."));
    });
  });

  describe("generateTopicDraftAction execution guards", () => {
    test("1. returns BAD_REQUEST on invalid input payload", async () => {
      const result = await generateTopicDraftAction({
        courseSlug: "",
        topicTitle: "",
      } as any);

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
        assert.ok(result.error.fieldErrors?.courseSlug);
        assert.ok(result.error.fieldErrors?.topicTitle);
      }
    });

    test("2. returns BAD_REQUEST when API key is missing", async () => {
      // Pass an explicitly empty customApiKey and ensure environment has no key
      const result = await generateTopicDraftAction({
        courseSlug: "cs-course",
        topicTitle: "Архитектура процессора",
        customApiKey: "",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        // Without configured GEMINI_API_KEY in test environment, it must reject with BAD_REQUEST
        assert.equal(result.error.code, "BAD_REQUEST");
        assert.ok(result.error.message.includes("API ключ Gemini"));
      }
    });
  });
});
