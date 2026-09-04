import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  createFlashcardAction,
  updateFlashcardAction,
  deleteFlashcardAction,
  getTopicFlashcardsAction,
} from "../admin-flashcard-actions";
import {
  createFlashcardSchema,
  updateFlashcardSchema,
  deleteFlashcardSchema,
  getTopicFlashcardsSchema,
} from "../admin-flashcard-actions.schemas";

describe("admin-flashcard-actions: Schemas & Validation", () => {
  describe("createFlashcardSchema & Action", () => {
    test("1. createFlashcardSchema parses valid front and back", () => {
      const valid = {
        courseSlug: "algorithms",
        topicId: "topic-1",
        front: "Что такое бинарное дерево поиска?",
        back: "Дерево, где левый потомок меньше родителя, а правый больше.",
      };
      const parsed = createFlashcardSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.courseSlug, "algorithms");
        assert.equal(parsed.data.topicId, "topic-1");
        assert.equal(parsed.data.front, "Что такое бинарное дерево поиска?");
      }
    });

    test("2. createFlashcardSchema rejects short front (< 3 chars)", () => {
      const invalid = {
        courseSlug: "algorithms",
        topicId: "topic-1",
        front: "AB",
        back: "Достаточно длинный ответ",
      };
      const parsed = createFlashcardSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.front);
      }
    });

    test("3. createFlashcardSchema rejects short back (< 3 chars)", () => {
      const invalid = {
        courseSlug: "algorithms",
        topicId: "topic-1",
        front: "Достаточно длинный вопрос?",
        back: "OK",
      };
      const parsed = createFlashcardSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.back);
      }
    });

    test("4. createFlashcardSchema rejects empty courseSlug or topicId", () => {
      const invalid = {
        courseSlug: "",
        topicId: "",
        front: "Вопрос",
        back: "Ответ",
      };
      const parsed = createFlashcardSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.courseSlug);
        assert.ok(parsed.error.flatten().fieldErrors.topicId);
      }
    });

    test("5. createFlashcardAction returns BAD_REQUEST on invalid payload", async () => {
      const result = await createFlashcardAction({
        courseSlug: "",
        topicId: "",
        front: "X",
        back: "Y",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });
  });

  describe("updateFlashcardSchema & Action", () => {
    test("6. updateFlashcardSchema parses valid update payload", () => {
      const valid = {
        courseSlug: "algorithms",
        questionId: "q-123",
        front: "Обновленный термин",
        back: "Обновленное определение термина",
      };
      const parsed = updateFlashcardSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.questionId, "q-123");
        assert.equal(parsed.data.front, "Обновленный термин");
      }
    });

    test("7. updateFlashcardSchema rejects missing questionId", () => {
      const invalid = {
        courseSlug: "algorithms",
        questionId: "",
        front: "Вопрос",
        back: "Ответ",
      };
      const parsed = updateFlashcardSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.questionId);
      }
    });

    test("8. updateFlashcardAction returns BAD_REQUEST on invalid payload", async () => {
      const result = await updateFlashcardAction({
        courseSlug: "algorithms",
        questionId: "",
        front: "A",
        back: "B",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });
  });

  describe("deleteFlashcardSchema & Action", () => {
    test("9. deleteFlashcardSchema parses valid questionId and courseSlug", () => {
      const valid = {
        courseSlug: "algorithms",
        questionId: "q-456",
      };
      const parsed = deleteFlashcardSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.questionId, "q-456");
      }
    });

    test("10. deleteFlashcardSchema rejects missing questionId", () => {
      const invalid = {
        courseSlug: "algorithms",
        questionId: "",
      };
      const parsed = deleteFlashcardSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.questionId);
      }
    });

    test("11. deleteFlashcardAction returns BAD_REQUEST on invalid payload", async () => {
      const result = await deleteFlashcardAction({
        courseSlug: "",
        questionId: "",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });
  });

  describe("getTopicFlashcardsSchema & Action", () => {
    test("12. getTopicFlashcardsSchema parses valid courseSlug and topicId", () => {
      const valid = {
        courseSlug: "algorithms",
        topicId: "topic-99",
      };
      const parsed = getTopicFlashcardsSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.topicId, "topic-99");
      }
    });

    test("13. getTopicFlashcardsAction returns BAD_REQUEST on empty topicId", async () => {
      const result = await getTopicFlashcardsAction({
        courseSlug: "algorithms",
        topicId: "",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });
  });
});
