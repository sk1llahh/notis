import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  leaveCourseSchema,
  leaveCourseAction,
  resetCourseProgressSchema,
  resetCourseProgressAction,
} from "../course-enrollment-actions";

describe("course-enrollment-actions: Schemas & Validation", () => {
  describe("leaveCourseSchema & Action", () => {
    test("1. leaveCourseSchema parses valid payload", () => {
      const valid = { courseSlug: "fullstack-react" };
      const parsed = leaveCourseSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.courseSlug, "fullstack-react");
      }
    });

    test("2. leaveCourseSchema rejects empty courseSlug", () => {
      const invalid = { courseSlug: "" };
      const parsed = leaveCourseSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.courseSlug);
      }
    });

    test("3. leaveCourseSchema rejects missing courseSlug", () => {
      const invalid = {};
      const parsed = leaveCourseSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.courseSlug);
      }
    });

    test("4. leaveCourseAction returns BAD_REQUEST on invalid input", async () => {
      const result = await leaveCourseAction({ courseSlug: "" });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });
  });

  describe("resetCourseProgressSchema & Action", () => {
    test("5. resetCourseProgressSchema parses valid payload with exact 'СБРОСИТЬ' literal", () => {
      const valid = {
        courseSlug: "fullstack-react",
        confirmation: "СБРОСИТЬ",
      };
      const parsed = resetCourseProgressSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.courseSlug, "fullstack-react");
        assert.equal(parsed.data.confirmation, "СБРОСИТЬ");
      }
    });

    test("6. resetCourseProgressSchema rejects empty courseSlug", () => {
      const invalid = {
        courseSlug: "",
        confirmation: "СБРОСИТЬ",
      };
      const parsed = resetCourseProgressSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.courseSlug);
      }
    });

    test("7. resetCourseProgressSchema rejects invalid confirmation literal (lowercase or other words)", () => {
      const invalidLowercase = {
        courseSlug: "fullstack-react",
        confirmation: "сбросить",
      };
      const invalidWord = {
        courseSlug: "fullstack-react",
        confirmation: "RESET",
      };
      const invalidEmpty = {
        courseSlug: "fullstack-react",
        confirmation: "",
      };

      assert.equal(resetCourseProgressSchema.safeParse(invalidLowercase).success, false);
      assert.equal(resetCourseProgressSchema.safeParse(invalidWord).success, false);
      assert.equal(resetCourseProgressSchema.safeParse(invalidEmpty).success, false);
    });

    test("8. resetCourseProgressAction returns BAD_REQUEST on invalid confirmation payload", async () => {
      const result = await resetCourseProgressAction({
        courseSlug: "fullstack-react",
        confirmation: "reset",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });
  });
});
