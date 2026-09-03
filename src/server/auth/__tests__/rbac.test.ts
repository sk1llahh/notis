import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { assertCourseAuthor } from "../rbac";
import { ActionException } from "@/server/actions/safe-action";

describe("RBAC Guard: assertCourseAuthor", () => {
  test("1. Throws ActionException('UNAUTHORIZED') if userId is absent", async () => {
    await assert.rejects(
      async () => {
        await assertCourseAuthor("cs-foundations", undefined);
      },
      (error: unknown) => {
        assert.ok(error instanceof ActionException);
        assert.equal(error.code, "UNAUTHORIZED");
        assert.equal(error.message, "Требуется авторизация");
        return true;
      }
    );
  });

  test("2. Throws ActionException('UNAUTHORIZED') if userId is empty string", async () => {
    await assert.rejects(
      async () => {
        await assertCourseAuthor("cs-foundations", "");
      },
      (error: unknown) => {
        assert.ok(error instanceof ActionException);
        assert.equal(error.code, "UNAUTHORIZED");
        return true;
      }
    );
  });
});
