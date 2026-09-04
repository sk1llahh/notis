"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { createSafeAction, ActionException } from "./safe-action";

// =============================================================================
// SCHEMAS & TYPES
// =============================================================================

export const updateUserRoleSchema = z.object({
  targetUserId: z.string().min(1, "Идентификатор пользователя обязателен"),
  newRole: z.enum(["USER", "AUTHOR", "ADMIN"], {
    message: "Недопустимая роль пользователя",
  }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export interface UpdateUserRoleOutput {
  success: boolean;
  userId: string;
  updatedRole: "USER" | "AUTHOR" | "ADMIN";
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Updates a target user's system role (USER, AUTHOR, ADMIN).
 * Protected by strict ADMIN RBAC and self-demotion prevention guard.
 */
export const updateUserRoleAction = createSafeAction(
  updateUserRoleSchema,
  async (input, ctx): Promise<UpdateUserRoleOutput> => {
    // 1. Session authentication check
    const userId = ctx.session.user?.id;
    if (!userId) {
      throw new ActionException("UNAUTHORIZED", "Требуется авторизация");
    }

    // 2. RBAC Guard: caller must have ADMIN role
    if (ctx.session.user?.role !== "ADMIN") {
      throw new ActionException("FORBIDDEN", "Требуются права администратора");
    }

    // 3. Self-demotion guard: cannot modify caller's own role
    if (input.targetUserId === userId) {
      throw new ActionException(
        "BAD_REQUEST",
        "Нельзя изменить роль собственной учетной записи"
      );
    }

    // Also check canonical DB id in case session uses authId
    const caller = await prisma.user.findFirst({
      where: {
        OR: [{ id: userId }, { authId: userId }],
      },
      select: { id: true },
    });

    if (caller && caller.id === input.targetUserId) {
      throw new ActionException(
        "BAD_REQUEST",
        "Нельзя изменить роль собственной учетной записи"
      );
    }

    // 4. Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: input.targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new ActionException("NOT_FOUND", "Пользователь не найден");
    }

    // 5. Update user role in Prisma
    await prisma.user.update({
      where: { id: input.targetUserId },
      data: { role: input.newRole },
    });

    // 6. Cache revalidation
    revalidatePath("/admin/users");

    return {
      success: true,
      userId: input.targetUserId,
      updatedRole: input.newRole,
    };
  }
);
