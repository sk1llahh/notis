import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { createSafeAction, ActionException } from "../safe-action";

const testSchema = z.object({
  topicId: z.string().min(1, "Topic ID обязателен"),
  score: z.number().min(0).max(100, "Оценка должна быть от 0 до 100"),
});

describe("SafeAction Pipeline", () => {
  test("1. Executes handler and returns success with valid data and session context", async () => {
    const action = createSafeAction(testSchema, async (input, { session }) => {
      assert.ok(session.user);
      return {
        processedTopic: input.topicId,
        awardedScore: input.score,
        userId: session.user.id,
      };
    });

    const result = await action({ topicId: "topic-1", score: 85 });

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.processedTopic, "topic-1");
      assert.equal(result.data.awardedScore, 85);
      assert.equal(result.data.userId, "seed_admin_1");
    }
  });

  test("2. Catches Zod validation errors without calling handler, maps fieldErrors", async () => {
    let handlerCalled = false;
    const action = createSafeAction(testSchema, async () => {
      handlerCalled = true;
      return "should not be reached";
    });

    const result = await action({ topicId: "", score: 150 });

    assert.equal(handlerCalled, false);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "BAD_REQUEST");
      assert.equal(result.error.message, "Ошибка валидации входных данных");
      assert.ok(result.error.fieldErrors);
      assert.ok(result.error.fieldErrors["topicId"]);
      assert.ok(result.error.fieldErrors["score"]);
      assert.match(result.error.fieldErrors["topicId"][0], /обязателен/i);
      assert.match(result.error.fieldErrors["score"][0], /100/i);
    }
  });

  test("3. Catches ActionException and returns structured error with specific code", async () => {
    const action = createSafeAction(testSchema, async () => {
      throw new ActionException("NOT_FOUND", "Тема не найдена в системе");
    });

    const result = await action({ topicId: "non-existent", score: 50 });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "NOT_FOUND");
      assert.equal(result.error.message, "Тема не найдена в системе");
      assert.equal(result.error.fieldErrors, undefined);
    }
  });

  test("4. Obfuscates unhandled server errors into INTERNAL_SERVER_ERROR", async () => {
    // Suppress console.error temporarily to keep test logs clean
    const originalConsoleError = console.error;
    let loggedMessage = "";
    console.error = (...args: unknown[]) => {
      loggedMessage = args.join(" ");
    };

    try {
      const action = createSafeAction(testSchema, async () => {
        throw new Error("Neon DB connection lost: sensitive credentials leak");
      });

      const result = await action({ topicId: "topic-1", score: 100 });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "INTERNAL_SERVER_ERROR");
        assert.equal(result.error.message, "Внутренняя ошибка сервера");
        assert.equal(result.error.fieldErrors, undefined);
      }
      assert.match(loggedMessage, /Neon DB connection lost/);
    } finally {
      console.error = originalConsoleError;
    }
  });

  test("5. Rethrows Next.js framework system errors (NEXT_REDIRECT / NEXT_NOT_FOUND)", async () => {
    const nextRedirectError = new Error("NEXT_REDIRECT");
    (nextRedirectError as unknown as { digest: string }).digest =
      "NEXT_REDIRECT;replace;/courses/done;307;";

    const action = createSafeAction(testSchema, async () => {
      throw nextRedirectError;
    });

    await assert.rejects(
      async () => {
        await action({ topicId: "topic-1", score: 100 });
      },
      (err: unknown) => {
        assert.equal(
          (err as { digest: string }).digest,
          "NEXT_REDIRECT;replace;/courses/done;307;"
        );
        return true;
      }
    );
  });
});
