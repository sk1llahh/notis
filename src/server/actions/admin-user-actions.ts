"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { createSafeAction, ActionException } from "./safe-action";
import {
  updateUserRoleSchema,
  type UpdateUserRoleOutput,
} from "./admin-user-actions.schemas";

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Updates a target user's system role (USER, AUTHOR, ADMIN) and/or ban status.
 * Protected by strict ADMIN RBAC, self-demotion, and self-ban prevention guards.
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

    // 3. Self-modification guard: cannot demote or ban caller's own account
    const isSelfDirect = input.targetUserId === userId;
    let isSelfCanonical = false;
    if (!isSelfDirect) {
      const caller = await prisma.user.findFirst({
        where: {
          OR: [{ id: userId }, { authId: userId }],
        },
        select: { id: true },
      });
      if (caller && caller.id === input.targetUserId) {
        isSelfCanonical = true;
      }
    }
    const isSelf = isSelfDirect || isSelfCanonical;

    if (isSelf && input.newRole !== undefined) {
      throw new ActionException(
        "BAD_REQUEST",
        "Нельзя изменить роль собственной учетной записи"
      );
    }

    if (isSelf && input.isBanned !== undefined) {
      throw new ActionException(
        "BAD_REQUEST",
        "Нельзя заблокировать собственную учетную запись"
      );
    }

    // 4. Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: input.targetUserId },
      select: { id: true, role: true, isBanned: true },
    });

    if (!targetUser) {
      throw new ActionException("NOT_FOUND", "Пользователь не найден");
    }

    // 5. Update user role and/or ban status in Prisma
    const dataToUpdate: { role?: "USER" | "AUTHOR" | "ADMIN"; isBanned?: boolean } = {};
    if (input.newRole) {
      dataToUpdate.role = input.newRole;
    }
    if (input.isBanned !== undefined) {
      dataToUpdate.isBanned = input.isBanned;
    }

    const updatedUser = await prisma.user.update({
      where: { id: input.targetUserId },
      data: dataToUpdate,
      select: {
        id: true,
        role: true,
        isBanned: true,
      },
    });

    // 6. Cache revalidation
    revalidatePath("/admin/users");

    return {
      success: true,
      userId: updatedUser.id,
      updatedRole: updatedUser.role as "USER" | "AUTHOR" | "ADMIN",
      isBanned: updatedUser.isBanned,
    };
  }
);
