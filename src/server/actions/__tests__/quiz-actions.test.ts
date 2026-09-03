import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { submitQuizSchema, submitQuizAction } from "../quiz-actions";

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
      assert.deepEqual(parsed.data.answers["q-1"], ["opt-0"]);
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
});
