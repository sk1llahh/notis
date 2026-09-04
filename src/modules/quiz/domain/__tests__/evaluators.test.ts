import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  SingleChoiceEvaluator,
  MultipleChoiceEvaluator,
  ShortAnswerEvaluator,
  CodeEvaluator,
  getQuestionEvaluator,
  questionEvaluatorRegistry,
} from "../evaluators/question-evaluators";

describe("Question Strategy Engine: Evaluators", () => {
  describe("SingleChoiceEvaluator", () => {
    const evaluator = new SingleChoiceEvaluator();

    test("validates valid numeric index and string representations", () => {
      assert.deepEqual(evaluator.validateAnswer(0), { valid: true, parsed: 0 });
      assert.deepEqual(evaluator.validateAnswer(2), { valid: true, parsed: 2 });
      assert.deepEqual(evaluator.validateAnswer("1"), { valid: true, parsed: 1 });
      assert.deepEqual(evaluator.validateAnswer("opt-1"), { valid: true, parsed: "opt-1" });
      assert.deepEqual(evaluator.validateAnswer([1]), { valid: true, parsed: 1 });
    });

    test("rejects invalid answers (negative, empty, non-primitive)", () => {
      assert.equal(evaluator.validateAnswer(-1).valid, false);
      assert.equal(evaluator.validateAnswer("").valid, false);
      assert.equal(evaluator.validateAnswer(null).valid, false);
      assert.equal(evaluator.validateAnswer({}).valid, false);
    });

    test("evaluates correct numeric answer", () => {
      const context = { correctAnswerIndexes: [1] };
      assert.equal(evaluator.evaluate(1, context), true);
      assert.equal(evaluator.evaluate(0, context), false);
      assert.equal(evaluator.evaluate(2, context), false);
    });

    test("evaluates option id string with context options", () => {
      const context = {
        correctAnswerIndexes: [1],
        options: [
          { id: "opt-0", text: "A" },
          { id: "opt-1", text: "B" },
        ],
      };
      assert.equal(evaluator.evaluate("opt-1", context), true);
      assert.equal(evaluator.evaluate("opt-0", context), false);
    });
  });

  describe("MultipleChoiceEvaluator", () => {
    const evaluator = new MultipleChoiceEvaluator();

    test("validates array of numbers and string IDs", () => {
      const valid1 = evaluator.validateAnswer([0, 2]);
      assert.equal(valid1.valid, true);
      assert.deepEqual(valid1.parsed, [0, 2]);

      const valid2 = evaluator.validateAnswer(["opt-0", "opt-2"]);
      assert.equal(valid2.valid, true);
      assert.deepEqual(valid2.parsed, ["opt-0", "opt-2"]);
    });

    test("rejects non-array or array with invalid elements", () => {
      assert.equal(evaluator.validateAnswer("not an array").valid, false);
      assert.equal(evaluator.validateAnswer(123).valid, false);
      assert.equal(evaluator.validateAnswer([0, null]).valid, false);
    });

    test("evaluates exact matching number sets", () => {
      const context = { correctAnswerIndexes: [0, 2] };

      // Exact match (in any order)
      assert.equal(evaluator.evaluate([0, 2], context), true);
      assert.equal(evaluator.evaluate([2, 0], context), true);

      // Missing answer
      assert.equal(evaluator.evaluate([0], context), false);

      // Extra answer
      assert.equal(evaluator.evaluate([0, 1, 2], context), false);

      // Entirely wrong
      assert.equal(evaluator.evaluate([1, 3], context), false);
    });

    test("evaluates option id arrays", () => {
      const context = {
        correctAnswerIndexes: [0, 2],
        options: [
          { id: "opt-0", text: "A" },
          { id: "opt-1", text: "B" },
          { id: "opt-2", text: "C" },
        ],
      };

      assert.equal(evaluator.evaluate(["opt-0", "opt-2"], context), true);
      assert.equal(evaluator.evaluate(["opt-2", "opt-0"], context), true);
      assert.equal(evaluator.evaluate(["opt-0"], context), false);
      assert.equal(evaluator.evaluate(["opt-0", "opt-1", "opt-2"], context), false);
    });
  });

  describe("ShortAnswerEvaluator", () => {
    const evaluator = new ShortAnswerEvaluator();

    test("validates non-empty string input", () => {
      assert.deepEqual(evaluator.validateAnswer("Стек"), { valid: true, parsed: "Стек" });
      assert.deepEqual(evaluator.validateAnswer(["Стек"]), { valid: true, parsed: "Стек" });
    });

    test("rejects empty or whitespace-only inputs", () => {
      assert.equal(evaluator.validateAnswer("").valid, false);
      assert.equal(evaluator.validateAnswer("   ").valid, false);
      assert.equal(evaluator.validateAnswer(123).valid, false);
      assert.equal(evaluator.validateAnswer(null).valid, false);
    });

    test("normalizes input (trim and lowercase) and matches accepted answers", () => {
      const context = {
        acceptedAnswers: ["стек", "stack", "стековый фрейм"],
      };

      assert.equal(evaluator.evaluate("стек", context), true);
      assert.equal(evaluator.evaluate("Стек", context), true); // uppercase
      assert.equal(evaluator.evaluate("  STACK  ", context), true); // whitespace + upper
      assert.equal(evaluator.evaluate("Стековый Фрейм", context), true);

      // Wrong answer
      assert.equal(evaluator.evaluate("куча", context), false);
      assert.equal(evaluator.evaluate("heap", context), false);
    });

    test("returns false if context has no accepted answers", () => {
      assert.equal(evaluator.evaluate("answer", {}), false);
      assert.equal(evaluator.evaluate("answer", { acceptedAnswers: [] }), false);
    });
  });

  describe("CodeEvaluator", () => {
    const evaluator = new CodeEvaluator();

    test("validates non-empty string code", () => {
      assert.equal(evaluator.validateAnswer("function solution() {}").valid, true);
      assert.equal(evaluator.validateAnswer("").valid, false);
      assert.equal(evaluator.validateAnswer("   ").valid, false);
      assert.equal(evaluator.validateAnswer(123).valid, false);
    });

    test("evaluates passing code against test cases", () => {
      const code = `
        function solution(a, b) {
          return a + b;
        }
      `;
      const context = {
        testCases: [
          { name: "1+2", input: [1, 2], expected: 3 },
          { name: "10+20", input: [10, 20], expected: 30 },
        ],
      };

      assert.equal(evaluator.evaluate(code, context), true);
    });

    test("evaluates failing code when tests don't pass", () => {
      const code = `
        function solution(a, b) {
          return a - b; // Bug
        }
      `;
      const context = {
        testCases: [
          { name: "1+2", input: [1, 2], expected: 3 },
        ],
      };

      assert.equal(evaluator.evaluate(code, context), false);
    });

    test("evaluates code without test cases as valid if non-empty", () => {
      assert.equal(evaluator.evaluate("console.log('test');", {}), true);
    });
  });

  describe("Registry & Factory Helper", () => {
    test("retrieves evaluator by type name", () => {
      assert.equal(getQuestionEvaluator("SINGLE_CHOICE").type, "SINGLE_CHOICE");
      assert.equal(getQuestionEvaluator("MULTIPLE_CHOICE").type, "MULTIPLE_CHOICE");
      assert.equal(getQuestionEvaluator("SHORT_ANSWER").type, "SHORT_ANSWER");
      assert.equal(getQuestionEvaluator("CODE").type, "CODE");
    });

    test("maps legacy OPEN_TEXT to SHORT_ANSWER", () => {
      assert.equal(getQuestionEvaluator("OPEN_TEXT").type, "SHORT_ANSWER");
    });

    test("throws on unknown question type", () => {
      assert.throws(() => getQuestionEvaluator("UNKNOWN_TYPE"));
    });
  });
});
