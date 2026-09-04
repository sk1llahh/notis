import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  createCourseSchema,
  createCourseAction,
} from "../admin-course-actions";

describe("admin-course-actions: Schema Validation & Execution", () => {
  test("1. createCourseSchema parses valid payload", () => {
    const valid = {
      title: "Архитектура распределенных систем",
      slug: "distributed-systems",
      description: "Глубокое погружение в отказоустойчивость и консенсус",
    };
    const parsed = createCourseSchema.safeParse(valid);

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.title, valid.title);
      assert.equal(parsed.data.slug, valid.slug);
      assert.equal(parsed.data.description, valid.description);
    }
  });

  test("2. createCourseSchema rejects title shorter than 3 characters", () => {
    const invalid = {
      title: "Go",
      slug: "golang-course",
      description: "Полный курс по разработке на языке Go",
    };
    const parsed = createCourseSchema.safeParse(invalid);

    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.ok(parsed.error.flatten().fieldErrors.title);
    }
  });

  test("3. createCourseSchema rejects invalid slug characters (uppercase, spaces, special chars)", () => {
    const invalidUppercase = {
      title: "Базы данных",
      slug: "Postgres-DB",
      description: "Все про реляционные базы данных и индексы",
    };
    const invalidSpaces = {
      title: "Базы данных",
      slug: "postgres db",
      description: "Все про реляционные базы данных и индексы",
    };
    const invalidCyrillic = {
      title: "Базы данных",
      slug: "базы-данных",
      description: "Все про реляционные базы данных и индексы",
    };

    assert.equal(createCourseSchema.safeParse(invalidUppercase).success, false);
    assert.equal(createCourseSchema.safeParse(invalidSpaces).success, false);
    assert.equal(createCourseSchema.safeParse(invalidCyrillic).success, false);
  });

  test("4. createCourseSchema rejects description shorter than 10 characters", () => {
    const invalid = {
      title: "Rust основы",
      slug: "rust-basics",
      description: "Коротко",
    };
    const parsed = createCourseSchema.safeParse(invalid);

    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.ok(parsed.error.flatten().fieldErrors.description);
    }
  });

  test("5. createCourseSchema rejects missing required fields", () => {
    const missing = {};
    const parsed = createCourseSchema.safeParse(missing);

    assert.equal(parsed.success, false);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      assert.ok(fieldErrors.title);
      assert.ok(fieldErrors.slug);
      assert.ok(fieldErrors.description);
    }
  });

  test("6. createCourseAction returns BAD_REQUEST on invalid input payload", async () => {
    const result = await createCourseAction({
      title: "A",
      slug: "INVALID SLUG",
      description: "short",
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "BAD_REQUEST");
      assert.ok(result.error.fieldErrors?.title);
      assert.ok(result.error.fieldErrors?.slug);
      assert.ok(result.error.fieldErrors?.description);
    }
  });
});
