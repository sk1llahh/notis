import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { updateUserRoleAction } from "../admin-user-actions";
import { updateUserRoleSchema } from "../admin-user-actions.schemas";

describe("admin-user-actions: Schema Validation & Execution", () => {
  describe("updateUserRoleSchema", () => {
    test("1. updateUserRoleSchema parses valid payload with USER role", () => {
      const valid = {
        targetUserId: "user_123",
        newRole: "USER",
      };
      const parsed = updateUserRoleSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.targetUserId, "user_123");
        assert.equal(parsed.data.newRole, "USER");
      }
    });

    test("2. updateUserRoleSchema parses valid payload with AUTHOR role", () => {
      const valid = {
        targetUserId: "user_456",
        newRole: "AUTHOR",
      };
      const parsed = updateUserRoleSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.newRole, "AUTHOR");
      }
    });

    test("3. updateUserRoleSchema parses valid payload with ADMIN role", () => {
      const valid = {
        targetUserId: "user_789",
        newRole: "ADMIN",
      };
      const parsed = updateUserRoleSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.newRole, "ADMIN");
      }
    });

    test("4. updateUserRoleSchema rejects empty or whitespace targetUserId", () => {
      const invalidEmpty = {
        targetUserId: "",
        newRole: "AUTHOR",
      };
      const parsed = updateUserRoleSchema.safeParse(invalidEmpty);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.targetUserId);
      }
    });

    test("5. updateUserRoleSchema rejects missing targetUserId", () => {
      const invalidMissing = {
        newRole: "USER",
      };
      const parsed = updateUserRoleSchema.safeParse(invalidMissing);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.targetUserId);
      }
    });

    test("6. updateUserRoleSchema rejects unsupported role (STUDENT, ROOT, etc.)", () => {
      const invalidRole = {
        targetUserId: "user_123",
        newRole: "STUDENT",
      };
      const parsed = updateUserRoleSchema.safeParse(invalidRole);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.newRole);
      }
    });

    test("6.1. updateUserRoleSchema parses valid payload with isBanned only", () => {
      const valid = {
        targetUserId: "user_123",
        isBanned: true,
      };
      const parsed = updateUserRoleSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.targetUserId, "user_123");
        assert.equal(parsed.data.isBanned, true);
        assert.equal(parsed.data.newRole, undefined);
      }
    });

    test("6.2. updateUserRoleSchema parses valid payload with both newRole and isBanned", () => {
      const valid = {
        targetUserId: "user_123",
        newRole: "AUTHOR",
        isBanned: false,
      };
      const parsed = updateUserRoleSchema.safeParse(valid);

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.newRole, "AUTHOR");
        assert.equal(parsed.data.isBanned, false);
      }
    });

    test("6.3. updateUserRoleSchema rejects payload when neither newRole nor isBanned is provided", () => {
      const invalid = {
        targetUserId: "user_123",
      };
      const parsed = updateUserRoleSchema.safeParse(invalid);

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.flatten().fieldErrors.newRole);
      }
    });
  });

  describe("updateUserRoleAction", () => {
    test("7. updateUserRoleAction returns BAD_REQUEST on invalid input", async () => {
      const result = await updateUserRoleAction({
        targetUserId: "",
        newRole: "INVALID_ROLE",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
      }
    });

    test("8. updateUserRoleAction protects against self-demotion (targetUserId matches session caller)", async () => {
      // In isolated test environment, getAuthSession returns seed_admin_1
      const result = await updateUserRoleAction({
        targetUserId: "seed_admin_1",
        newRole: "USER",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
        assert.match(
          result.error.message,
          /Нельзя изменить роль собственной учетной записи/
        );
      }
    });

    test("9. updateUserRoleAction protects against self-ban (targetUserId matches session caller)", async () => {
      const result = await updateUserRoleAction({
        targetUserId: "seed_admin_1",
        isBanned: true,
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "BAD_REQUEST");
        assert.match(
          result.error.message,
          /Нельзя заблокировать собственную учетную запись/
        );
      }
    });
  });
});
