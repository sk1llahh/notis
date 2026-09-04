import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  createTopicSchema,
  deleteTopicSchema,
  createTopicAction,
  deleteTopicAction,
} from "../studio-topic-lifecycle-actions";
import { slugify } from "@/shared/lib/utils";

describe("studio-topic-lifecycle-actions: Schema Validation & Execution", () => {
  describe("slugify utility", () => {
    test("transliterates cyrillic string into kebab-case", () => {
      assert.equal(slugify("Устройство памяти"), "ustroystvo-pamyati");
      assert.equal(
        slugify("Графы и Деревья Поиска!"),
        "grafy-i-derevya-poiska"
      );
    });

    test("handles latin with special symbols", () => {
      assert.equal(slugify("Hello, World #123!"), "hello-world-123");
    });
  });

  describe("createTopicSchema", () => {
    test("1. parses valid topic creation payload with defaults", () => {
      const valid = {
        courseSlug: "cs-foundations",
        title: "Связные списки",
      };
      const parsed = createTopicSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.courseSlug, "cs-foundations");
        assert.equal(parsed.data.title, "Связные списки");
        assert.equal(parsed.data.positionX, 100);
        assert.equal(parsed.data.positionY, 100);
      }
    });

    test("2. preserves explicit positions and tierId", () => {
      const valid = {
        courseSlug: "cs-foundations",
        title: "Бинарные деревья",
        tierId: "tier_custom_1",
        positionX: 350,
        positionY: 220,
      };
      const parsed = createTopicSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.positionX, 350);
        assert.equal(parsed.data.positionY, 220);
        assert.equal(parsed.data.tierId, "tier_custom_1");
      }
    });

    test("3. rejects empty courseSlug or short title (< 2 chars)", () => {
      const emptyCourse = { courseSlug: "", title: "Тема" };
      const shortTitle = { courseSlug: "cs-foundations", title: "A" };

      assert.equal(createTopicSchema.safeParse(emptyCourse).success, false);
      assert.equal(createTopicSchema.safeParse(shortTitle).success, false);
    });

    test("4. createTopicAction returns BAD_REQUEST on invalid input", async () => {
      const result = await createTopicAction({
        courseSlug: "",
        title: "",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
        assert.ok(result.error.fieldErrors?.courseSlug);
        assert.ok(result.error.fieldErrors?.title);
      }
    });
  });

  describe("deleteTopicSchema", () => {
    test("1. parses valid delete topic payload", () => {
      const valid = {
        courseSlug: "cs-foundations",
        topicId: "topic_memory_1",
      };
      const parsed = deleteTopicSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.courseSlug, "cs-foundations");
        assert.equal(parsed.data.topicId, "topic_memory_1");
      }
    });

    test("2. rejects empty courseSlug or topicId", () => {
      const invalidCourse = { courseSlug: "", topicId: "topic_1" };
      const invalidTopic = { courseSlug: "cs-foundations", topicId: "" };

      assert.equal(deleteTopicSchema.safeParse(invalidCourse).success, false);
      assert.equal(deleteTopicSchema.safeParse(invalidTopic).success, false);
    });

    test("3. deleteTopicAction returns BAD_REQUEST on invalid input", async () => {
      const result = await deleteTopicAction({
        courseSlug: "",
        topicId: "",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
        assert.ok(result.error.fieldErrors?.courseSlug);
        assert.ok(result.error.fieldErrors?.topicId);
      }
    });
  });
});
