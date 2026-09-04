import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  updateProfileNameSchema,
  updateProfileNameAction,
  changePasswordSchema,
  changePasswordAction,
  deleteAccountSchema,
  deleteAccountAction,
} from "../user-settings-actions";

describe("user-settings-actions: Schemas & Validation", () => {
  describe("updateProfileNameSchema & Action", () => {
    test("1. updateProfileNameSchema parses valid names and trims whitespace", () => {
      const valid = { name: "  Александр Пушкин  " };
      const parsed = updateProfileNameSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.name, "Александр Пушкин");
      }
    });

    test("2. updateProfileNameSchema rejects name shorter than 2 characters", () => {
      const invalidShort = { name: "A" };
      const parsed = updateProfileNameSchema.safeParse(invalidShort);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.name);
      }
    });

    test("3. updateProfileNameSchema rejects name longer than 50 characters", () => {
      const invalidLong = { name: "A".repeat(51) };
      const parsed = updateProfileNameSchema.safeParse(invalidLong);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.name);
      }
    });

    test("4. updateProfileNameAction returns BAD_REQUEST on invalid payload", async () => {
      const result = await updateProfileNameAction({ name: "" });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });
  });

  describe("changePasswordSchema & Action", () => {
    test("5. changePasswordSchema parses valid passwords", () => {
      const valid = {
        currentPassword: "old-secret-password",
        newPassword: "new-strong-password-123",
      };
      const parsed = changePasswordSchema.safeParse(valid);

      assert.equal(parsed.success, true);
    });

    test("6. changePasswordSchema rejects empty current password", () => {
      const invalid = {
        currentPassword: "",
        newPassword: "new-password",
      };
      const parsed = changePasswordSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.currentPassword);
      }
    });

    test("7. changePasswordSchema rejects new password shorter than 6 characters", () => {
      const invalid = {
        currentPassword: "old-password",
        newPassword: "12345",
      };
      const parsed = changePasswordSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.newPassword);
      }
    });

    test("8. changePasswordAction returns BAD_REQUEST on invalid payload", async () => {
      const result = await changePasswordAction({
        currentPassword: "",
        newPassword: "123",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });
  });

  describe("deleteAccountSchema & Action", () => {
    test("9. deleteAccountSchema parses exact 'УДАЛИТЬ' literal", () => {
      const valid = { confirmationText: "УДАЛИТЬ" };
      const parsed = deleteAccountSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.confirmationText, "УДАЛИТЬ");
      }
    });

    test("10. deleteAccountSchema rejects lowercase or different words", () => {
      const invalidLowercase = { confirmationText: "удалить" };
      const invalidWord = { confirmationText: "DELETE" };
      const invalidEmpty = { confirmationText: "" };

      assert.equal(deleteAccountSchema.safeParse(invalidLowercase).success, false);
      assert.equal(deleteAccountSchema.safeParse(invalidWord).success, false);
      assert.equal(deleteAccountSchema.safeParse(invalidEmpty).success, false);
    });

    test("11. deleteAccountAction returns BAD_REQUEST on invalid confirmation payload", async () => {
      const result = await deleteAccountAction({
        confirmationText: "delete",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });
  });
});
