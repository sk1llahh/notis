import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { enrollCourseAction } from "../course-actions";
import { enrollCourseSchema } from "../course-actions.schemas";

describe("enrollCourseAction & Schema Validation", () => {
  test("1. enrollCourseSchema parses valid courseSlug", () => {
    const valid = { courseSlug: "cs-foundations" };
    const parsed = enrollCourseSchema.safeParse(valid);

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.courseSlug, "cs-foundations");
    }
  });

  test("2. enrollCourseSchema rejects empty courseSlug", () => {
    const invalidEmpty = { courseSlug: "" };
    const parsed = enrollCourseSchema.safeParse(invalidEmpty);

    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.ok(parsed.error.flatten().fieldErrors.courseSlug);
    }
  });

  test("3. enrollCourseSchema rejects missing courseSlug", () => {
    const invalidMissing = {};
    const parsed = enrollCourseSchema.safeParse(invalidMissing);

    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.ok(parsed.error.flatten().fieldErrors.courseSlug);
    }
  });

  test("4. enrollCourseAction returns BAD_REQUEST on invalid input", async () => {
    const result = await enrollCourseAction({
      courseSlug: "",
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "BAD_REQUEST");
      assert.ok(result.error.fieldErrors?.courseSlug);
    }
  });
});
