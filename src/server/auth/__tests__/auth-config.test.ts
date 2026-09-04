import { describe, test, afterEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { authConfig } from "../config";
import { prisma } from "@/server/db";

describe("authConfig: Credentials authorize and callbacks", () => {
  // Extract Credentials provider authorize handler
  const credentialsProvider = authConfig.providers.find(
    (p: any) => p.id === "credentials"
  ) as any;
  const authorize = credentialsProvider.options?.authorize ?? credentialsProvider.authorize;

  // Save original prisma.user methods
  const originalFindUnique = prisma.user.findUnique;
  const originalCreate = (prisma.user as any).create;

  afterEach(() => {
    prisma.user.findUnique = originalFindUnique;
    (prisma.user as any).create = originalCreate;
  });

  describe("authorize", () => {
    test("1. Returns null on invalid email format or empty password", async () => {
      const res1 = await authorize({
        email: "not-an-email",
        password: "somepassword",
      });
      assert.equal(res1, null);

      const res2 = await authorize({
        email: "user@example.com",
        password: "",
      });
      assert.equal(res2, null);
    });

    test("2. Returns null when user does not exist in DB (NO auto-provisioning)", async () => {
      let createCalled = false;
      (prisma.user as any).create = async () => {
        createCalled = true;
        throw new Error("create should NOT be called in authorize");
      };
      prisma.user.findUnique = (async () => null) as any;

      const res = await authorize({
        email: "unknown@example.com",
        password: "password123",
      });

      assert.equal(res, null);
      assert.equal(createCalled, false, "prisma.user.create must never be called during login");
    });

    test("3. Returns null if user has no passwordHash (e.g. OAuth only user)", async () => {
      prisma.user.findUnique = (async () => ({
        id: "oauth-user-id",
        email: "oauth@example.com",
        name: "OAuth User",
        passwordHash: null,
        isBanned: false,
        role: "USER",
        avatarUrl: null,
        image: null,
      })) as any;

      const res = await authorize({
        email: "oauth@example.com",
        password: "anyPassword",
      });

      assert.equal(res, null);
    });

    test("4. Returns null if user is banned (isBanned: true)", async () => {
      const passwordHash = await bcrypt.hash("validPassword123", 4);

      prisma.user.findUnique = (async () => ({
        id: "banned-user-id",
        email: "banned@example.com",
        name: "Banned User",
        passwordHash,
        isBanned: true,
        role: "USER",
        avatarUrl: null,
        image: null,
      })) as any;

      const res = await authorize({
        email: "banned@example.com",
        password: "validPassword123",
      });

      assert.equal(res, null);
    });

    test("5. Returns null if password does not match", async () => {
      const passwordHash = await bcrypt.hash("correctPassword", 4);

      prisma.user.findUnique = (async () => ({
        id: "valid-user-id",
        email: "user@example.com",
        name: "Test User",
        passwordHash,
        isBanned: false,
        role: "USER",
        avatarUrl: null,
        image: null,
      })) as any;

      const res = await authorize({
        email: "user@example.com",
        password: "wrongPassword",
      });

      assert.equal(res, null);
    });

    test("6. Returns user object with mapped role when credentials are valid", async () => {
      const passwordHash = await bcrypt.hash("mypassword", 4);

      prisma.user.findUnique = (async () => ({
        id: "author-user-id",
        email: "author@example.com",
        name: "Course Author",
        passwordHash,
        isBanned: false,
        role: "AUTHOR",
        avatarUrl: "https://avatar.url/pic.jpg",
        image: null,
      })) as any;

      const res = await authorize({
        email: "author@example.com",
        password: "mypassword",
      });

      assert.ok(res);
      assert.equal(res.id, "author-user-id");
      assert.equal(res.email, "author@example.com");
      assert.equal(res.name, "Course Author");
      assert.equal(res.role, "AUTHOR");
      assert.equal(res.image, "https://avatar.url/pic.jpg");
    });
  });

  describe("jwt & session callbacks", () => {
    const jwtCallback = authConfig.callbacks?.jwt;
    const sessionCallback = authConfig.callbacks?.session;

    test("7. jwt callback assigns user id and role on initial login", async () => {
      assert.ok(jwtCallback);
      prisma.user.findUnique = (async () => null) as any;

      const token = await jwtCallback({
        token: {},
        user: { id: "user_100", email: "u100@test.local", role: "AUTHOR" } as any,
      } as any);

      assert.ok(token);
      assert.equal(token.id, "user_100");
      assert.equal(token.role, "AUTHOR");
    });

    test("8. jwt callback returns null if user is banned in DB", async () => {
      assert.ok(jwtCallback);
      prisma.user.findUnique = (async () => ({
        role: "AUTHOR",
        isBanned: true,
        deletedAt: null,
      })) as any;

      const token = await jwtCallback({
        token: { id: "user_banned", role: "AUTHOR" },
      } as any);

      assert.equal(token, null);
    });

    test("9. jwt callback synchronizes updated role from database", async () => {
      assert.ok(jwtCallback);
      prisma.user.findUnique = (async () => ({
        role: "ADMIN",
        isBanned: false,
        deletedAt: null,
      })) as any;

      const token = await jwtCallback({
        token: { id: "user_promoted", role: "AUTHOR" },
      } as any);

      assert.ok(token);
      assert.equal(token.role, "ADMIN");
    });

    test("10. session callback populates session.user with token id and role", async () => {
      assert.ok(sessionCallback);

      const session = await sessionCallback({
        session: {
          user: { id: "", email: "test@example.com" },
          expires: new Date(Date.now() + 3600000).toISOString(),
        },
        token: {
          id: "user_token_id",
          role: "ADMIN",
        },
      } as any);

      assert.ok(session);
      assert.ok(session.user);
      assert.equal(session.user.id, "user_token_id");
      assert.equal((session.user as any).role, "ADMIN");
    });
  });
});
