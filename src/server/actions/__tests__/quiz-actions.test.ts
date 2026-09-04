import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  submitQuizAction,
  retakeQuizAction,
} from "../quiz-actions";
import {
  submitQuizSchema,
  retakeQuizSchema,
} from "../quiz-actions.schemas";

describe("submitQuizAction & Schema Validation", () => {
  test("1. submitQuizSchema parses valid submission parameters", () => {
    const valid = {
      courseSlug: "cs-foundations",
      topicSlug: "memory-basics",
      answers: {
        "q-1": ["opt-0"],
        "q-2": ["opt-0", "opt-2"],
      },
    };

    const parsed = submitQuizSchema.safeParse(valid);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.courseSlug, "cs-foundations");
      assert.equal(parsed.data.topicSlug, "memory-basics");
      assert.deepEqual((parsed.data.answers as Record<string, unknown>)["q-1"], ["opt-0"]);
    }
  });

  test("1.1. submitQuizSchema parses polymorphic array answers format", () => {
    const validPolymorphic = {
      courseSlug: "cs-foundations",
      topicSlug: "memory-basics",
      answers: [
        { questionId: "q-single", answer: 0 },
        { questionId: "q-multi", answer: [0, 2] },
        { questionId: "q-short", answer: "стек" },
        { questionId: "q-code", answer: "function solution() { return true; }" },
      ],
    };

    const parsed = submitQuizSchema.safeParse(validPolymorphic);
    assert.equal(parsed.success, true);
    if (parsed.success && Array.isArray(parsed.data.answers)) {
      assert.equal(parsed.data.answers.length, 4);
      assert.equal(parsed.data.answers[2].answer, "стек");
    }
  });

  test("2. submitQuizSchema rejects empty slugs", () => {
    const invalidEmpty = {
      courseSlug: "",
      topicSlug: "",
      answers: {},
    };

    const result = submitQuizSchema.safeParse(invalidEmpty);
    assert.equal(result.success, false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      assert.ok(fieldErrors.courseSlug);
      assert.ok(fieldErrors.topicSlug);
    }
  });

  test("3. submitQuizAction returns BAD_REQUEST on invalid input", async () => {
    const result = await submitQuizAction({
      courseSlug: "",
      topicSlug: "",
      answers: "not an object" as unknown as Record<string, string[]>,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "BAD_REQUEST");
      assert.ok(result.error.fieldErrors);
    }
  });

  describe("retakeQuizSchema & retakeQuizAction", () => {
    test("4. retakeQuizSchema parses valid payload", () => {
      const parsed = retakeQuizSchema.safeParse({
        courseSlug: "cs-foundations",
        topicSlug: "memory-basics",
      });
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.courseSlug, "cs-foundations");
        assert.equal(parsed.data.topicSlug, "memory-basics");
      }
    });

    test("5. retakeQuizSchema rejects empty or missing slugs", () => {
      const parsedEmpty = retakeQuizSchema.safeParse({
        courseSlug: "",
        topicSlug: "",
      });
      assert.equal(parsedEmpty.success, false);

      const parsedMissing = retakeQuizSchema.safeParse({});
      assert.equal(parsedMissing.success, false);
    });

    test("6. retakeQuizAction returns BAD_REQUEST on invalid input", async () => {
      const result = await retakeQuizAction({
        courseSlug: "",
        topicSlug: "",
      });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
        assert.ok(result.error.fieldErrors);
      }
    });
  });
});

