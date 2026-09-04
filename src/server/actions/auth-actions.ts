"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { createSafeAction, ActionException } from "./safe-action";

// =============================================================================
// SCHEMAS & TYPES
// =============================================================================

export const registerUserSchema = z.object({
  name: z
    .string()
    .min(2, "Имя должно содержать минимум 2 символа")
    .max(50, "Имя не должно превышать 50 символов"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Некорректный адрес электронной почты"),
  password: z
    .string()
    .min(6, "Пароль должен быть не менее 6 символов"),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export interface RegisterUserOutput {
  success: boolean;
  email: string;
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Registers a new user account with hashed password and default student role.
 */
export const registerUserAction = createSafeAction(
  registerUserSchema,
  async (input): Promise<RegisterUserOutput> => {
    // 1. Check if email is already in use
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      throw new ActionException(
        "CONFLICT",
        "Пользователь с таким email уже зарегистрирован"
      );
    }

    // 2. Hash password with bcryptjs
    const passwordHash = await bcrypt.hash(input.password, 10);

    // 3. Create user in database
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: "USER",
        emailVerified: null,
      },
      select: {
        email: true,
      },
    });

    return {
      success: true,
      email: user.email,
    };
  }
);
