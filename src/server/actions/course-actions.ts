"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { createSafeAction, ActionException } from "./safe-action";
import {
  enrollCourseSchema,
  type EnrollCourseOutput,
} from "./course-actions.schemas";

/**
 * Server Action: Enrolls the authenticated user into a published course.
 * Performs an idempotent upsert on CourseEnrollment.
 */
export const enrollCourseAction = createSafeAction(
  enrollCourseSchema,
  async (input, { session }): Promise<EnrollCourseOutput> => {
    // 1. Auth Guard
    if (!session.user) {
      throw new ActionException(
        "UNAUTHORIZED",
        "Для записи на курс требуется авторизация"
      );
    }

    // 2. Fetch User from DB
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          { email: session.user.email },
          { authId: session.user.id },
        ],
      },
      select: { id: true },
    });

    if (!user) {
      throw new ActionException(
        "NOT_FOUND",
        "Учетная запись пользователя не найдена"
      );
    }

    // 3. Find published, non-archived course
    const course = await prisma.course.findFirst({
      where: {
        slug: input.courseSlug,
        isPublished: true,
        isArchived: false,
      },
      select: { id: true, slug: true },
    });

    if (!course) {
      throw new ActionException(
        "NOT_FOUND",
        "Курс не найден или еще не опубликован"
      );
    }

    // 4. Idempotent Upsert into CourseEnrollment
    await prisma.courseEnrollment.upsert({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
      create: {
        userId: user.id,
        courseId: course.id,
        source: "FREE",
        status: "ACTIVE",
      },
      update: {
        status: "ACTIVE",
      },
    });

    // 5. Invalidate Next.js cache for catalog and course roadmap
    revalidatePath("/courses");
    revalidatePath(`/courses/${input.courseSlug}`);

    return {
      courseId: course.id,
      courseSlug: course.slug,
      enrolled: true,
    };
  }
);
