import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  createCourseAction,
  updateCourseSettingsAction,
  deleteCourseAction,
} from "../admin-course-actions";
import {
  createCourseSchema,
  updateCourseSettingsSchema,
  deleteCourseSchema,
} from "../admin-course-actions.schemas";

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

  describe("updateCourseSettingsSchema & Action", () => {
    test("7. updateCourseSettingsSchema parses valid settings payload", () => {
      const valid = {
        courseSlug: "distributed-systems",
        title: "Распределенные системы v2",
        description: "Обновленный курс с практическими задачами на Raft",
        isPublished: true,
      };
      const parsed = updateCourseSettingsSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.title, valid.title);
        assert.equal(parsed.data.isPublished, true);
      }
    });

    test("8. updateCourseSettingsSchema rejects short title or description", () => {
      const invalid = {
        courseSlug: "cs",
        title: "CS",
        description: "short",
        isPublished: false,
      };
      const parsed = updateCourseSettingsSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.title);
        assert.ok(parsed.error.flatten().fieldErrors.description);
      }
    });

    test("9. updateCourseSettingsAction returns BAD_REQUEST on invalid payload", async () => {
      const result = await updateCourseSettingsAction({
        courseSlug: "",
        title: "",
        description: "",
        isPublished: false,
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });
  });

  describe("deleteCourseSchema & Action", () => {
    test("10. deleteCourseSchema parses valid payload", () => {
      const valid = { courseSlug: "distributed-systems" };
      const parsed = deleteCourseSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.courseSlug, "distributed-systems");
      }
    });

    test("11. deleteCourseSchema rejects empty courseSlug", () => {
      const invalid = { courseSlug: "" };
      const parsed = deleteCourseSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
    });

    test("12. deleteCourseAction returns BAD_REQUEST on empty courseSlug", async () => {
      const result = await deleteCourseAction({
        courseSlug: "",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });
  });
});
