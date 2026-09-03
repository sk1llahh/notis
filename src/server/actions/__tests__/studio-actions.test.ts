import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  updateNodePositionsSchema,
  updateNodePositionsAction,
  connectPrerequisiteSchema,
  connectPrerequisiteAction,
  disconnectPrerequisiteSchema,
  disconnectPrerequisiteAction,
} from "../studio-actions";

describe("Studio Actions: Schemas & Validation", () => {
  // ---------------------------------------------------------------------------
  // 1. updateNodePositionsSchema
  // ---------------------------------------------------------------------------
  test("1. updateNodePositionsSchema parses valid coordinate dictionary", () => {
    const valid = {
      courseSlug: "cs-foundations",
      positions: {
        "topic-1": { x: 120, y: 340.5 },
        "topic-2": { x: 0, y: -50 },
      },
    };

    const parsed = updateNodePositionsSchema.safeParse(valid);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.courseSlug, "cs-foundations");
      assert.equal(parsed.data.positions["topic-1"].x, 120);
      assert.equal(parsed.data.positions["topic-1"].y, 340.5);
    }
  });

  test("2. updateNodePositionsSchema rejects empty courseSlug", () => {
    const invalidEmptySlug = {
      courseSlug: "",
      positions: {
        "topic-1": { x: 10, y: 20 },
      },
    };

    const result = updateNodePositionsSchema.safeParse(invalidEmptySlug);
    assert.equal(result.success, false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      assert.ok(fieldErrors.courseSlug);
      assert.match(fieldErrors.courseSlug[0], /Слаг курса обязателен/);
    }
  });

  test("3. updateNodePositionsSchema rejects invalid coordinates (non-number)", () => {
    const invalidCoords = {
      courseSlug: "cs-foundations",
      positions: {
        "topic-1": { x: "invalid" as unknown as number, y: 100 },
      },
    };

    const result = updateNodePositionsSchema.safeParse(invalidCoords);
    assert.equal(result.success, false);
    if (!result.success) {
      const issues = result.error.issues;
      assert.ok(issues.some((i) => i.path.includes("x")));
    }
  });

  // ---------------------------------------------------------------------------
  // 2. connectPrerequisiteSchema
  // ---------------------------------------------------------------------------
  test("4. connectPrerequisiteSchema parses valid connection data", () => {
    const valid = {
      courseSlug: "cs-foundations",
      topicId: "topic-b",
      prerequisiteId: "topic-a",
      type: "REQUIRED",
    };

    const parsed = connectPrerequisiteSchema.safeParse(valid);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.courseSlug, "cs-foundations");
      assert.equal(parsed.data.topicId, "topic-b");
      assert.equal(parsed.data.prerequisiteId, "topic-a");
      assert.equal(parsed.data.type, "REQUIRED");
    }
  });

  test("5. connectPrerequisiteSchema rejects matching topicId and prerequisiteId (self-connection)", () => {
    const selfConnection = {
      courseSlug: "cs-foundations",
      topicId: "topic-same",
      prerequisiteId: "topic-same",
      type: "REQUIRED",
    };

    const result = connectPrerequisiteSchema.safeParse(selfConnection);
    assert.equal(result.success, false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      assert.ok(fieldErrors.prerequisiteId);
      assert.match(fieldErrors.prerequisiteId[0], /Нельзя связать тему саму с собой/);
    }
  });

  test("6. connectPrerequisiteSchema rejects empty slugs and IDs", () => {
    const emptyInput = {
      courseSlug: "",
      topicId: "",
      prerequisiteId: "",
    };

    const result = connectPrerequisiteSchema.safeParse(emptyInput);
    assert.equal(result.success, false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      assert.ok(fieldErrors.courseSlug);
      assert.ok(fieldErrors.topicId);
      assert.ok(fieldErrors.prerequisiteId);
    }
  });

  // ---------------------------------------------------------------------------
  // 3. disconnectPrerequisiteSchema
  // ---------------------------------------------------------------------------
  test("7. disconnectPrerequisiteSchema validates and rejects empty inputs", () => {
    const valid = {
      courseSlug: "cs-foundations",
      topicId: "topic-b",
      prerequisiteId: "topic-a",
    };
    assert.equal(disconnectPrerequisiteSchema.safeParse(valid).success, true);

    const invalid = {
      courseSlug: "",
      topicId: "",
      prerequisiteId: "",
    };
    const result = disconnectPrerequisiteSchema.safeParse(invalid);
    assert.equal(result.success, false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      assert.ok(fieldErrors.courseSlug);
      assert.ok(fieldErrors.topicId);
      assert.ok(fieldErrors.prerequisiteId);
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Server Actions Execution (BAD_REQUEST returns)
  // ---------------------------------------------------------------------------
  test("8. connectPrerequisiteAction returns BAD_REQUEST when connecting topic to itself", async () => {
    const result = await connectPrerequisiteAction({
      courseSlug: "cs-foundations",
      topicId: "topic-loop",
      prerequisiteId: "topic-loop",
      type: "REQUIRED",
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "BAD_REQUEST");
      assert.ok(result.error.fieldErrors);
      assert.ok(result.error.fieldErrors["prerequisiteId"]);
    }
  });

  test("9. updateNodePositionsAction returns BAD_REQUEST on invalid payload", async () => {
    const result = await updateNodePositionsAction({
      courseSlug: "",
      positions: "not-an-object" as unknown as Record<string, { x: number; y: number }>,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "BAD_REQUEST");
      assert.ok(result.error.fieldErrors);
    }
  });

  test("10. disconnectPrerequisiteAction returns BAD_REQUEST on missing fields", async () => {
    const result = await disconnectPrerequisiteAction({
      courseSlug: "",
      topicId: "",
      prerequisiteId: "",
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "BAD_REQUEST");
      assert.ok(result.error.fieldErrors);
    }
  });
});
