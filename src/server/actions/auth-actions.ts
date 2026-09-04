"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { createSafeAction, ActionException } from "./safe-action";
import {
  registerUserSchema,
  type RegisterUserOutput,
} from "./auth-actions.schemas";

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
