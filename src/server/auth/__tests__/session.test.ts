import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { getAuthSession } from "../session";

describe("Auth Session Service: getAuthSession", () => {
  test("1. Returns valid session structure with id, email, role", async () => {
    const session = await getAuthSession();

    assert.ok(session);
    assert.ok(session.user);
    assert.equal(typeof session.user.id, "string");
    assert.equal(typeof session.user.email, "string");
    assert.ok(
      session.user.role === "ADMIN" ||
        session.user.role === "AUTHOR" ||
        session.user.role === "STUDENT"
    );
  });

  test("2. Seed fallback provides ADMIN role for development/test pipelines", async () => {
    const session = await getAuthSession();

    assert.equal(session.user?.id, "seed_admin_1");
    assert.equal(session.user?.role, "ADMIN");
    assert.equal(session.user?.email, "admin@notis.local");
  });
});
