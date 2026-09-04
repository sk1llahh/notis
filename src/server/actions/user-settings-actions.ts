"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { createSafeAction, ActionException } from "./safe-action";

// =============================================================================
// SCHEMAS & TYPES
// =============================================================================

export const updateProfileNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Имя должно содержать от 2 символов")
    .max(50, "Имя не должно превышать 50 символов"),
});

export type UpdateProfileNameInput = z.infer<typeof updateProfileNameSchema>;

export interface UpdateProfileNameOutput {
  success: boolean;
  name: string;
}

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Текущий пароль обязателен"),
  newPassword: z
    .string()
    .min(6, "Новый пароль должен содержать не менее 6 символов"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface ChangePasswordOutput {
  success: boolean;
}

export const deleteAccountSchema = z.object({
  confirmationText: z.literal("УДАЛИТЬ", {
    message: 'Для подтверждения введите слово "УДАЛИТЬ"',
  }),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

export interface DeleteAccountOutput {
  success: boolean;
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Updates the display name of the currently authenticated user.
 */
export const updateProfileNameAction = createSafeAction(
  updateProfileNameSchema,
  async (input, ctx): Promise<UpdateProfileNameOutput> => {
    const userId = ctx.session.user?.id;
    if (!userId) {
      throw new ActionException("UNAUTHORIZED", "Требуется авторизация");
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userId }, { authId: userId }],
      },
      select: { id: true },
    });

    const targetUserId = user?.id ?? userId;

    await prisma.user.update({
      where: { id: targetUserId },
      data: { name: input.name },
    });

    revalidatePath("/profile");
    revalidatePath("/admin/users");

    return {
      success: true,
      name: input.name,
    };
  }
);

/**
 * Validates the user's existing password and updates it with a secure bcrypt hash.
 */
export const changePasswordAction = createSafeAction(
  changePasswordSchema,
  async (input, ctx): Promise<ChangePasswordOutput> => {
    const userId = ctx.session.user?.id;
    if (!userId) {
      throw new ActionException("UNAUTHORIZED", "Требуется авторизация");
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userId }, { authId: userId }],
      },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new ActionException("NOT_FOUND", "Пользователь не найден");
    }

    // Verify current password if user has passwordHash set
    if (user.passwordHash) {
      const isMatch = await bcrypt.compare(
        input.currentPassword,
        user.passwordHash
      );

      if (!isMatch) {
        throw new ActionException("BAD_REQUEST", "Неверный текущий пароль");
      }
    }

    // Hash new password with salt rounds = 12
    const newHash = await bcrypt.hash(input.newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return {
      success: true,
    };
  }
);

/**
 * Permanently and atomically wipes the user's profile and related learning records.
 * Protects against deletion if the user is the sole author of created courses.
 */
export const deleteAccountAction = createSafeAction(
  deleteAccountSchema,
  async (_input, ctx): Promise<DeleteAccountOutput> => {
    const userId = ctx.session.user?.id;
    if (!userId) {
      throw new ActionException("UNAUTHORIZED", "Требуется авторизация");
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userId }, { authId: userId }],
      },
      select: { id: true },
    });

    if (!user) {
      throw new ActionException("NOT_FOUND", "Пользователь не найден");
    }

    // Check course authorship: forbid deletion if user is the sole owner of any course
    const ownedCollaborations = await prisma.courseCollaborator.findMany({
      where: {
        userId: user.id,
        role: "OWNER",
      },
      include: {
        course: {
          include: {
            collaborators: {
              select: {
                userId: true,
                role: true,
              },
            },
          },
        },
      },
    });

    const isSoleOwner = ownedCollaborations.some((collab) => {
      const otherOwners = collab.course.collaborators.filter(
        (c) => c.userId !== user.id && c.role === "OWNER"
      );
      return otherOwners.length === 0;
    });

    if (isSoleOwner) {
      throw new ActionException(
        "BAD_REQUEST",
        "Нельзя удалить аккаунт: вы являетесь единственным автором созданных курсов. Сначала удалите авторские курсы в Студии или передайте права другому автору."
      );
    }

    // Cascading atomic deletion of all user data
    await prisma.$transaction(async (tx) => {
      await tx.userQuizAttempt.deleteMany({ where: { userId: user.id } });
      await tx.userQuestionReview.deleteMany({ where: { userId: user.id } });
      await tx.userProgress.deleteMany({ where: { userId: user.id } });
      await tx.userGraphLayout.deleteMany({ where: { userId: user.id } });
      await tx.payment.deleteMany({ where: { userId: user.id } });
      await tx.subscription.deleteMany({ where: { userId: user.id } });
      await tx.courseEnrollment.deleteMany({ where: { userId: user.id } });
      await tx.courseCollaborator.deleteMany({ where: { userId: user.id } });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.account.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
    });

    revalidatePath("/admin/users");
    revalidatePath("/courses");

    return {
      success: true,
    };
  }
);
