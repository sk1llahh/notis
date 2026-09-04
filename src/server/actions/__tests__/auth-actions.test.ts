import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { registerUserAction } from "../auth-actions";
import { registerUserSchema } from "../auth-actions.schemas";

describe("auth-actions: Schema Validation & Execution", () => {
  test("1. registerUserSchema parses valid registration payload", () => {
    const valid = {
      name: "Алексей Смирнов",
      email: "alexey.smirnov@example.com",
      password: "strongPassword123",
    };
    const parsed = registerUserSchema.safeParse(valid);

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.name, valid.name);
      assert.equal(parsed.data.email, valid.email);
      assert.equal(parsed.data.password, valid.password);
    }
  });

  test("2. registerUserSchema normalizes email to lowercase and trims spaces", () => {
    const input = {
      name: "Екатерина",
      email: "  Kate.Dev@Example.COM  ",
      password: "secretPassword",
    };
    const parsed = registerUserSchema.safeParse(input);

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.email, "kate.dev@example.com");
    }
  });

  test("3. registerUserSchema rejects invalid email addresses", () => {
    const invalidEmails = [
      "not-an-email",
      "user@",
      "@domain.com",
      "user@domain",
    ];

    for (const email of invalidEmails) {
      const parsed = registerUserSchema.safeParse({
        name: "Test User",
        email,
        password: "password123",
      });
      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.email);
      }
    }
  });

  test("4. registerUserSchema rejects short name (< 2 chars)", () => {
    const invalid = {
      name: "A",
      email: "valid@example.com",
      password: "password123",
    };
    const parsed = registerUserSchema.safeParse(invalid);

    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.ok(parsed.error.flatten().fieldErrors.name);
    }
  });

  test("5. registerUserSchema rejects short password (< 6 chars)", () => {
    const invalid = {
      name: "Сергей",
      email: "sergey@example.com",
      password: "12345",
    };
    const parsed = registerUserSchema.safeParse(invalid);

    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.ok(parsed.error.flatten().fieldErrors.password);
    }
  });

  test("6. registerUserAction returns BAD_REQUEST on invalid input", async () => {
    const result = await registerUserAction({
      name: "",
      email: "invalid-email",
      password: "123",
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "BAD_REQUEST");
      assert.ok(result.error.fieldErrors?.name);
      assert.ok(result.error.fieldErrors?.email);
      assert.ok(result.error.fieldErrors?.password);
    }
  });
});
