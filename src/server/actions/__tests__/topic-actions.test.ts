import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { completeTopicSchema, completeTopicAction } from "../topic-actions";

describe("topic-actions: completeTopicAction & Schema Validation", () => {
  test("1. completeTopicSchema parses valid courseSlug and topicSlug", () => {
    const valid = {
      courseSlug: "cs-foundations",
      topicSlug: "memory-basics",
    };

    const parsed = completeTopicSchema.safeParse(valid);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.courseSlug, "cs-foundations");
      assert.equal(parsed.data.topicSlug, "memory-basics");
    }
  });

  test("2. completeTopicSchema rejects empty or missing courseSlug", () => {
    const invalidEmpty = {
      courseSlug: "",
      topicSlug: "memory-basics",
    };

    const resEmpty = completeTopicSchema.safeParse(invalidEmpty);
    assert.equal(resEmpty.success, false);
    if (!resEmpty.success) {
      assert.ok(resEmpty.error.flatten().fieldErrors.courseSlug);
    }

    const invalidMissing = {
      topicSlug: "memory-basics",
    };
    const resMissing = completeTopicSchema.safeParse(invalidMissing);
    assert.equal(resMissing.success, false);
  });

  test("3. completeTopicSchema rejects empty or missing topicSlug", () => {
    const invalidEmpty = {
      courseSlug: "cs-foundations",
      topicSlug: "",
    };

    const res = completeTopicSchema.safeParse(invalidEmpty);
    assert.equal(res.success, false);
    if (!res.success) {
      assert.ok(res.error.flatten().fieldErrors.topicSlug);
    }
  });

  test("4. completeTopicAction returns BAD_REQUEST when called with invalid input", async () => {
    const result = await completeTopicAction({
      courseSlug: "",
      topicSlug: "",
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "BAD_REQUEST");
      assert.ok(result.error.fieldErrors);
      assert.ok(result.error.fieldErrors.courseSlug);
      assert.ok(result.error.fieldErrors.topicSlug);
    }
  });
});
