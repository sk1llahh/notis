import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  createCourseTierAction,
  updateCourseTierAction,
  deleteCourseTierAction,
  assignTopicTierAction,
  getCourseTiersAction,
} from "../admin-tier-actions";
import {
  createCourseTierSchema,
  updateCourseTierSchema,
  deleteCourseTierSchema,
  assignTopicTierSchema,
  getCourseTiersSchema,
} from "../admin-tier-actions.schemas";

describe("admin-tier-actions: Schemas & Validation", () => {
  describe("createCourseTierSchema & Action", () => {
    test("1. createCourseTierSchema parses valid payload", () => {
      const valid = {
        courseSlug: "cs-foundations",
        title: "Tier 1: Базовый синтаксис",
        level: 1,
        badgeColor: "#10b981",
      };
      const parsed = createCourseTierSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.courseSlug, "cs-foundations");
        assert.equal(parsed.data.title, "Tier 1: Базовый синтаксис");
        assert.equal(parsed.data.level, 1);
        assert.equal(parsed.data.badgeColor, "#10b981");
      }
    });

    test("2. createCourseTierSchema rejects empty or short title", () => {
      const invalid = {
        courseSlug: "cs-foundations",
        title: "A",
        level: 1,
      };
      const parsed = createCourseTierSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.title);
      }
    });

    test("3. createCourseTierSchema rejects level < 1", () => {
      const invalid = {
        courseSlug: "cs-foundations",
        title: "Уровень 0",
        level: 0,
      };
      const parsed = createCourseTierSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.level);
      }
    });

    test("4. createCourseTierSchema rejects invalid HEX color", () => {
      const invalid = {
        courseSlug: "cs-foundations",
        title: "Уровень 1",
        level: 1,
        badgeColor: "not-a-hex",
      };
      const parsed = createCourseTierSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.badgeColor);
      }
    });

    test("5. createCourseTierAction returns BAD_REQUEST on invalid input", async () => {
      const result = await createCourseTierAction({
        courseSlug: "",
        title: "",
        level: -1,
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });
  });

  describe("updateCourseTierSchema & Action", () => {
    test("6. updateCourseTierSchema parses valid payload", () => {
      const valid = {
        courseSlug: "cs-foundations",
        tierId: "tier-123",
        title: "Tier 1: Обновленный",
        level: 2,
      };
      const parsed = updateCourseTierSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.tierId, "tier-123");
        assert.equal(parsed.data.level, 2);
      }
    });

    test("7. updateCourseTierSchema rejects missing tierId", () => {
      const invalid = {
        courseSlug: "cs-foundations",
        tierId: "",
        title: "Tier 1",
        level: 1,
      };
      const parsed = updateCourseTierSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.tierId);
      }
    });

    test("8. updateCourseTierAction returns BAD_REQUEST on invalid input", async () => {
      const result = await updateCourseTierAction({
        courseSlug: "cs-foundations",
        tierId: "",
        title: "x",
        level: 0,
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });
  });

  describe("deleteCourseTierSchema & Action", () => {
    test("9. deleteCourseTierSchema parses valid payload", () => {
      const valid = {
        courseSlug: "cs-foundations",
        tierId: "tier-xyz",
      };
      const parsed = deleteCourseTierSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.courseSlug, "cs-foundations");
        assert.equal(parsed.data.tierId, "tier-xyz");
      }
    });

    test("10. deleteCourseTierSchema rejects missing courseSlug or tierId", () => {
      const invalid = { courseSlug: "", tierId: "" };
      const parsed = deleteCourseTierSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.courseSlug);
        assert.ok(parsed.error.flatten().fieldErrors.tierId);
      }
    });

    test("11. deleteCourseTierAction returns BAD_REQUEST on invalid input", async () => {
      const result = await deleteCourseTierAction({
        courseSlug: "",
        tierId: "",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });
  });

  describe("assignTopicTierSchema & Action", () => {
    test("12. assignTopicTierSchema accepts valid tierId string", () => {
      const valid = {
        courseSlug: "cs-foundations",
        topicId: "topic-1",
        tierId: "tier-abc",
      };
      const parsed = assignTopicTierSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.tierId, "tier-abc");
      }
    });

    test("13. assignTopicTierSchema accepts nullable tierId", () => {
      const valid = {
        courseSlug: "cs-foundations",
        topicId: "topic-1",
        tierId: null,
      };
      const parsed = assignTopicTierSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.tierId, null);
      }
    });

    test("14. assignTopicTierSchema rejects missing topicId", () => {
      const invalid = {
        courseSlug: "cs-foundations",
        topicId: "",
        tierId: null,
      };
      const parsed = assignTopicTierSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.topicId);
      }
    });

    test("15. assignTopicTierAction returns BAD_REQUEST on invalid input", async () => {
      const result = await assignTopicTierAction({
        courseSlug: "",
        topicId: "",
        tierId: null,
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });
  });

  describe("getCourseTiersSchema & Action", () => {
    test("16. getCourseTiersSchema accepts valid courseSlug", () => {
      const parsed = getCourseTiersSchema.safeParse({ courseSlug: "cs-foundations" });
      assert.equal(parsed.success, true);
    });

    test("17. getCourseTiersAction returns BAD_REQUEST on empty courseSlug", async () => {
      const result = await getCourseTiersAction({ courseSlug: "" });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });
  });
});
