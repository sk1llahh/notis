import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { singleChoiceConfigSchema, singleChoiceAnswerSchema } from "../../strategies/single-choice/schema";
import { multipleChoiceConfigSchema, multipleChoiceAnswerSchema } from "../../strategies/multiple-choice/schema";
import { shortAnswerConfigSchema, shortAnswerAnswerSchema } from "../../strategies/short-answer/schema";
import { codeConfigSchema, codeAnswerSchema } from "../../strategies/code/schema";
import { flashcardConfigSchema, flashcardAnswerSchema } from "../../strategies/flashcard/schema";

describe("Question Strategy Zod Schemas", () => {
  describe("SINGLE_CHOICE Config Schema", () => {
    test("accepts valid config with 2+ options and 1 correct index", () => {
      const result = singleChoiceConfigSchema.safeParse({
        options: [{ text: "A" }, { text: "B" }],
        correctAnswerIndexes: [0],
      });
      assert.equal(result.success, true);
    });

    test("rejects fewer than 2 options", () => {
      const result = singleChoiceConfigSchema.safeParse({
        options: [{ text: "A" }],
        correctAnswerIndexes: [0],
      });
      assert.equal(result.success, false);
    });

    test("rejects more than 1 correct index", () => {
      const result = singleChoiceConfigSchema.safeParse({
        options: [{ text: "A" }, { text: "B" }, { text: "C" }],
        correctAnswerIndexes: [0, 1],
      });
      assert.equal(result.success, false);
    });
  });

  describe("SINGLE_CHOICE Answer Schema", () => {
    test("accepts numeric index", () => {
      assert.equal(singleChoiceAnswerSchema.safeParse(0).success, true);
      assert.equal(singleChoiceAnswerSchema.safeParse(2).success, true);
    });

    test("accepts string option ID", () => {
      assert.equal(singleChoiceAnswerSchema.safeParse("opt-1").success, true);
    });

    test("rejects negative index", () => {
      assert.equal(singleChoiceAnswerSchema.safeParse(-1).success, false);
    });

    test("rejects empty string", () => {
      assert.equal(singleChoiceAnswerSchema.safeParse("").success, false);
    });
  });

  describe("MULTIPLE_CHOICE Config Schema", () => {
    test("accepts valid config", () => {
      const result = multipleChoiceConfigSchema.safeParse({
        options: [{ text: "A" }, { text: "B" }, { text: "C" }],
        correctAnswerIndexes: [0, 2],
      });
      assert.equal(result.success, true);
    });

    test("rejects empty correctAnswerIndexes", () => {
      const result = multipleChoiceConfigSchema.safeParse({
        options: [{ text: "A" }, { text: "B" }],
        correctAnswerIndexes: [],
      });
      assert.equal(result.success, false);
    });
  });

  describe("MULTIPLE_CHOICE Answer Schema", () => {
    test("accepts array of numbers", () => {
      assert.equal(multipleChoiceAnswerSchema.safeParse([0, 2]).success, true);
    });

    test("accepts array of strings", () => {
      assert.equal(multipleChoiceAnswerSchema.safeParse(["opt-0", "opt-2"]).success, true);
    });

    test("accepts empty array", () => {
      assert.equal(multipleChoiceAnswerSchema.safeParse([]).success, true);
    });
  });

  describe("SHORT_ANSWER Config Schema", () => {
    test("accepts config with accepted answers", () => {
      const result = shortAnswerConfigSchema.safeParse({
        acceptedAnswers: ["стек", "stack"],
      });
      assert.equal(result.success, true);
    });

    test("rejects empty acceptedAnswers", () => {
      const result = shortAnswerConfigSchema.safeParse({
        acceptedAnswers: [],
      });
      assert.equal(result.success, false);
    });
  });

  describe("SHORT_ANSWER Answer Schema", () => {
    test("accepts non-empty string", () => {
      assert.equal(shortAnswerAnswerSchema.safeParse("стек").success, true);
    });

    test("rejects empty string", () => {
      assert.equal(shortAnswerAnswerSchema.safeParse("").success, false);
    });

    test("trims whitespace", () => {
      const result = shortAnswerAnswerSchema.safeParse("  стек  ");
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data, "стек");
      }
    });
  });

  describe("CODE Config Schema", () => {
    test("accepts config with test cases", () => {
      const result = codeConfigSchema.safeParse({
        codeTemplate: "function solution() {}",
        testCases: [{ name: "test1", input: [1, 2], expected: 3 }],
      });
      assert.equal(result.success, true);
    });

    test("rejects empty test cases", () => {
      const result = codeConfigSchema.safeParse({
        testCases: [],
      });
      assert.equal(result.success, false);
    });

    test("codeTemplate is optional", () => {
      const result = codeConfigSchema.safeParse({
        testCases: [{ input: [1], expected: 1 }],
      });
      assert.equal(result.success, true);
    });
  });

  describe("CODE Answer Schema", () => {
    test("accepts non-empty code string", () => {
      assert.equal(codeAnswerSchema.safeParse("console.log(1)").success, true);
    });

    test("rejects empty string", () => {
      assert.equal(codeAnswerSchema.safeParse("").success, false);
    });
  });

  describe("FLASHCARD Config Schema", () => {
    test("accepts valid front/back", () => {
      const result = flashcardConfigSchema.safeParse({
        front: "Что такое стек?",
        back: "LIFO-структура данных",
      });
      assert.equal(result.success, true);
    });

    test("rejects empty front", () => {
      const result = flashcardConfigSchema.safeParse({
        front: "",
        back: "Ответ",
      });
      assert.equal(result.success, false);
    });

    test("rejects empty back", () => {
      const result = flashcardConfigSchema.safeParse({
        front: "Вопрос",
        back: "",
      });
      assert.equal(result.success, false);
    });
  });

  describe("FLASHCARD Answer Schema", () => {
    test("accepts quality ratings 0-5", () => {
      for (let q = 0; q <= 5; q++) {
        assert.equal(flashcardAnswerSchema.safeParse(q).success, true, `quality ${q} should be valid`);
      }
    });

    test("rejects out-of-range values", () => {
      assert.equal(flashcardAnswerSchema.safeParse(-1).success, false);
      assert.equal(flashcardAnswerSchema.safeParse(6).success, false);
      assert.equal(flashcardAnswerSchema.safeParse(1.5).success, false);
    });
  });
});
