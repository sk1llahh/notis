import { prisma } from "@/server/db";
import type { Prisma, Role } from "@prisma/client";

export type PrismaDbClient = Prisma.TransactionClient | typeof prisma;

export interface AdminUserDTO {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "AUTHOR" | "ADMIN";
  isBanned: boolean;
  image: string | null;
  createdAt: Date;
  enrollmentsCount: number;
  coursesCount: number;
}

export interface GetAdminUsersListOptions {
  query?: string;
  role?: string;
  limit?: number;
  offset?: number;
}

/**
 * Retrieves a list of users for the super-admin console with search, role filters,
 * and activity aggregations (enrollments and authored courses).
 */
export async function getAdminUsersList(
  options?: GetAdminUsersListOptions,
  dbClient?: PrismaDbClient
): Promise<AdminUserDTO[]> {
  const db = (dbClient ?? prisma) as Prisma.TransactionClient;
  const { query, role, limit = 50, offset = 0 } = options ?? {};

  const where: Prisma.UserWhereInput = {};

  // 1. Case-insensitive search on email and name
  if (query && query.trim().length > 0) {
    const trimmedQuery = query.trim();
    where.OR = [
      { email: { contains: trimmedQuery, mode: "insensitive" } },
      { name: { contains: trimmedQuery, mode: "insensitive" } },
    ];
  }

  // 2. Role filter
  if (role && role !== "ALL") {
    const normalizedRole = role.toUpperCase();
    if (
      normalizedRole === "USER" ||
      normalizedRole === "AUTHOR" ||
      normalizedRole === "ADMIN"
    ) {
      where.role = normalizedRole as Role;
    }
  }

  // 3. Query Prisma with relation counts and order by createdAt desc
  const users = await db.user.findMany({
    where,
    take: limit,
    skip: offset,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBanned: true,
      image: true,
      createdAt: true,
      _count: {
        select: {
          enrollments: true,
          collaborations: true,
        },
      },
    },
  });

  // 4. Transform into safe DTOs (omitting passwordHash, auth secrets)
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as "USER" | "AUTHOR" | "ADMIN",
    isBanned: u.isBanned,
    image: u.image,
    createdAt: u.createdAt,
    enrollmentsCount: u._count.enrollments,
    coursesCount: u._count.collaborations,
  }));
}
