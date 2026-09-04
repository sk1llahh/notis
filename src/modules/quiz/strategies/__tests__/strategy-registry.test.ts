import { describe, test } from "node:test";
import assert from "node:assert/strict";

// Ensure strategies are registered
import "../../strategies";

import { FlashcardStrategy } from "../../strategies/flashcard";
import { getStrategy, getRegisteredTypes } from "../../strategies/registry";

describe("FlashcardStrategy", () => {
  const strategy = new FlashcardStrategy();

  test("validates valid quality ratings (0-5)", () => {
    for (let q = 0; q <= 5; q++) {
      const result = strategy.validateAnswer(q);
      assert.equal(result.valid, true, `quality ${q} should be valid`);
      assert.equal(result.parsed, q);
    }
  });

  test("validates string quality ratings", () => {
    assert.deepEqual(strategy.validateAnswer("3"), { valid: true, parsed: 3 });
    assert.deepEqual(strategy.validateAnswer("0"), { valid: true, parsed: 0 });
    assert.deepEqual(strategy.validateAnswer("5"), { valid: true, parsed: 5 });
  });

  test("unwraps single-element array", () => {
    assert.deepEqual(strategy.validateAnswer([4]), { valid: true, parsed: 4 });
  });

  test("rejects out-of-range values", () => {
    assert.equal(strategy.validateAnswer(-1).valid, false);
    assert.equal(strategy.validateAnswer(6).valid, false);
    assert.equal(strategy.validateAnswer(10).valid, false);
    assert.equal(strategy.validateAnswer(1.5).valid, false);
  });

  test("rejects invalid types", () => {
    assert.equal(strategy.validateAnswer(null).valid, false);
    assert.equal(strategy.validateAnswer(undefined).valid, false);
    assert.equal(strategy.validateAnswer({}).valid, false);
    assert.equal(strategy.validateAnswer("abc").valid, false);
    assert.equal(strategy.validateAnswer("").valid, false);
  });

  test("evaluates: quality >= 3 is correct (successful recall)", () => {
    assert.equal(strategy.evaluate(3, {}), true);
    assert.equal(strategy.evaluate(4, {}), true);
    assert.equal(strategy.evaluate(5, {}), true);
  });

  test("evaluates: quality < 3 is incorrect (failed recall)", () => {
    assert.equal(strategy.evaluate(0, {}), false);
    assert.equal(strategy.evaluate(1, {}), false);
    assert.equal(strategy.evaluate(2, {}), false);
  });
});

describe("QuestionStrategyRegistry — Full Coverage", () => {
  test("all 5 types are registered", () => {
    const types = getRegisteredTypes();
    assert.equal(types.length, 5);
    assert.ok(types.includes("SINGLE_CHOICE"));
    assert.ok(types.includes("MULTIPLE_CHOICE"));
    assert.ok(types.includes("SHORT_ANSWER"));
    assert.ok(types.includes("CODE"));
    assert.ok(types.includes("FLASHCARD"));
  });

  test("getStrategy resolves all 5 types", () => {
    assert.equal(getStrategy("SINGLE_CHOICE").type, "SINGLE_CHOICE");
    assert.equal(getStrategy("MULTIPLE_CHOICE").type, "MULTIPLE_CHOICE");
    assert.equal(getStrategy("SHORT_ANSWER").type, "SHORT_ANSWER");
    assert.equal(getStrategy("CODE").type, "CODE");
    assert.equal(getStrategy("FLASHCARD").type, "FLASHCARD");
  });

  test("maps legacy OPEN_TEXT to SHORT_ANSWER", () => {
    assert.equal(getStrategy("OPEN_TEXT").type, "SHORT_ANSWER");
  });

  test("throws on unknown question type", () => {
    assert.throws(() => getStrategy("NONEXISTENT_TYPE"));
  });

  test("each strategy has configSchema and answerSchema", () => {
    for (const type of getRegisteredTypes()) {
      const s = getStrategy(type);
      assert.ok(s.configSchema, `${type} missing configSchema`);
      assert.ok(s.answerSchema, `${type} missing answerSchema`);
      assert.ok(typeof s.validateAnswer === "function", `${type} missing validateAnswer`);
      assert.ok(typeof s.evaluate === "function", `${type} missing evaluate`);
    }
  });
});
