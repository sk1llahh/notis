"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { createSafeAction, ActionException } from "./safe-action";

// =============================================================================
// SCHEMAS & TYPES
// =============================================================================

export const createCourseSchema = z.object({
  title: z
    .string()
    .min(3, "Заголовок курса должен содержать не менее 3 символов"),
  slug: z
    .string()
    .min(3, "Слаг курса должен содержать не менее 3 символов")
    .regex(
      /^[a-z0-9-]+$/,
      "Слаг может содержать только строчные латинские буквы, цифры и дефис"
    ),
  description: z
    .string()
    .min(10, "Описание курса должно содержать не менее 10 символов"),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export interface CreateCourseOutput {
  slug: string;
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Creates a new course with initial translation, default tier, and OWNER collaborator.
 * Restricted to users with ADMIN or AUTHOR system roles.
 */
export const createCourseAction = createSafeAction(
  createCourseSchema,
  async (input, ctx): Promise<CreateCourseOutput> => {
    // 1. Authenticated session check
    const userId = ctx.session.user?.id;
    if (!userId) {
      throw new ActionException("UNAUTHORIZED", "Требуется авторизация");
    }

    // 2. Role permission check (ADMIN or AUTHOR)
    const userRole = ctx.session.user?.role;
    if (userRole !== "ADMIN" && userRole !== "AUTHOR") {
      throw new ActionException(
        "FORBIDDEN",
        "Недостаточно прав для создания курса. Требуется роль автора или администратора"
      );
    }

    // 3. Slug uniqueness check
    const existing = await prisma.course.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });

    if (existing) {
      throw new ActionException(
        "CONFLICT",
        `Курс со слагом "${input.slug}" уже существует`
      );
    }

    // 4. Atomic course initialization
    const course = await prisma.course.create({
      data: {
        slug: input.slug,
        defaultLocale: "ru",
        availableLocales: ["ru"],
        translations: {
          create: {
            locale: "ru",
            title: input.title,
            description: input.description,
          },
        },
        collaborators: {
          create: {
            userId,
            role: "OWNER",
          },
        },
        tiers: {
          create: {
            slug: "main-track",
            order: 0,
            isPublished: true,
            translations: {
              create: {
                locale: "ru",
                name: "Основной трек",
              },
            },
          },
        },
      },
      select: {
        slug: true,
      },
    });

    // 5. Revalidate course catalog cache
    revalidatePath("/courses");

    return { slug: course.slug };
  }
);
