import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  getAdminUsersList,
  type PrismaDbClient,
} from "../admin-user-service";

describe("Admin User Service: getAdminUsersList", () => {
  const sampleUsers = [
    {
      id: "u-1",
      name: "Алексей Иванов",
      email: "alex@notis.dev",
      role: "ADMIN",
      image: "https://example.com/avatar1.jpg",
      createdAt: new Date("2026-01-15T10:00:00Z"),
      passwordHash: "super_secret_hash_1",
      _count: {
        enrollments: 5,
        collaborations: 3,
      },
    },
    {
      id: "u-2",
      name: "Екатерина Смирнова",
      email: "kate@notis.dev",
      role: "AUTHOR",
      image: null,
      createdAt: new Date("2026-02-01T12:00:00Z"),
      passwordHash: "super_secret_hash_2",
      _count: {
        enrollments: 2,
        collaborations: 1,
      },
    },
    {
      id: "u-3",
      name: "Иван Студентов",
      email: "ivan@notis.dev",
      role: "USER",
      image: null,
      createdAt: new Date("2026-02-20T14:00:00Z"),
      passwordHash: "super_secret_hash_3",
      _count: {
        enrollments: 8,
        collaborations: 0,
      },
    },
  ];

  test("1. Returns mapped AdminUserDTOs with relation counts and without sensitive data", async () => {
    let receivedArgs: any = null;
    const mockDb: any = {
      user: {
        findMany: async (args: any) => {
          receivedArgs = args;
          return sampleUsers;
        },
      },
    };

    const users = await getAdminUsersList(
      { limit: 20, offset: 0 },
      mockDb as PrismaDbClient
    );

    assert.equal(users.length, 3);
    assert.equal(receivedArgs.take, 20);
    assert.equal(receivedArgs.skip, 0);
    assert.deepEqual(receivedArgs.orderBy, { createdAt: "desc" });

    // First user checks
    const first = users[0];
    assert.equal(first.id, "u-1");
    assert.equal(first.name, "Алексей Иванов");
    assert.equal(first.email, "alex@notis.dev");
    assert.equal(first.role, "ADMIN");
    assert.equal(first.enrollmentsCount, 5);
    assert.equal(first.coursesCount, 3);
    assert.equal((first as unknown as Record<string, unknown>).passwordHash, undefined);
  });

  test("2. Correctly sets query search filters (case-insensitive contains on email and name)", async () => {
    let receivedWhere: any = null;
    const mockDb: any = {
      user: {
        findMany: async (args: any) => {
          receivedWhere = args.where;
          return [sampleUsers[0]];
        },
      },
    };

    const users = await getAdminUsersList(
      { query: "  alex  " },
      mockDb as PrismaDbClient
    );

    assert.equal(users.length, 1);
    assert.ok(receivedWhere.OR);
    assert.deepEqual(receivedWhere.OR, [
      { email: { contains: "alex", mode: "insensitive" } },
      { name: { contains: "alex", mode: "insensitive" } },
    ]);
  });

  test("3. Correctly sets role filter when valid role is provided", async () => {
    let receivedWhere: any = null;
    const mockDb: any = {
      user: {
        findMany: async (args: any) => {
          receivedWhere = args.where;
          return [sampleUsers[1]];
        },
      },
    };

    const users = await getAdminUsersList(
      { role: "author" },
      mockDb as PrismaDbClient
    );

    assert.equal(users.length, 1);
    assert.equal(receivedWhere.role, "AUTHOR");
  });

  test("4. Ignores role filter when set to 'ALL'", async () => {
    let receivedWhere: any = null;
    const mockDb: any = {
      user: {
        findMany: async (args: any) => {
          receivedWhere = args.where;
          return sampleUsers;
        },
      },
    };

    const users = await getAdminUsersList(
      { role: "ALL" },
      mockDb as PrismaDbClient
    );

    assert.equal(users.length, 3);
    assert.equal(receivedWhere.role, undefined);
  });
});
