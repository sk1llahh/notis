"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { assertCourseAuthor } from "@/server/auth";
import { createSafeAction, ActionException } from "./safe-action";
import {
  createCourseSchema,
  updateCourseSettingsSchema,
  deleteCourseSchema,
  type CreateCourseOutput,
  type UpdateCourseSettingsOutput,
  type DeleteCourseOutput,
} from "./admin-course-actions.schemas";

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

/**
 * Updates course publication state and localized metadata (title, description).
 */
export const updateCourseSettingsAction = createSafeAction(
  updateCourseSettingsSchema,
  async (input, ctx): Promise<UpdateCourseSettingsOutput> => {
    // 1. Author permissions check
    const authorAuth = await assertCourseAuthor(input.courseSlug, ctx.session.user?.id);

    // 2. Update Course and CourseTranslation
    const course = await prisma.course.update({
      where: { id: authorAuth.courseId },
      data: {
        isPublished: input.isPublished,
        translations: {
          upsert: {
            where: {
              courseId_locale: {
                courseId: authorAuth.courseId,
                locale: "ru",
              },
            },
            update: {
              title: input.title,
              description: input.description,
            },
            create: {
              locale: "ru",
              title: input.title,
              description: input.description,
            },
          },
        },
      },
      select: {
        slug: true,
        isPublished: true,
      },
    });

    // 3. Revalidate affected routes
    revalidatePath("/courses");
    revalidatePath(`/courses/${course.slug}`);
    revalidatePath(`/studio/${course.slug}`);

    return {
      slug: course.slug,
      isPublished: course.isPublished,
    };
  }
);

/**
 * Deletes a course entirely with all connected tiers, topics, questions, and layouts.
 * Strictly restricted to OWNER or system ADMIN.
 */
export const deleteCourseAction = createSafeAction(
  deleteCourseSchema,
  async (input, ctx): Promise<DeleteCourseOutput> => {
    // 1. Verify author / admin status
    const authorAuth = await assertCourseAuthor(input.courseSlug, ctx.session.user?.id);

    // 2. Strict permission check: only OWNER or system ADMIN can delete
    if (authorAuth.role !== "OWNER" && authorAuth.role !== "ADMIN") {
      throw new ActionException(
        "FORBIDDEN",
        "Удалять курс целиком может только владелец или администратор"
      );
    }

    const courseId = authorAuth.courseId;

    // 3. Cascade cleanup in an atomic transaction
    await prisma.$transaction(async (tx) => {
      // Find all topics in the course
      const topics = await tx.topic.findMany({
        where: { courseId },
        select: { id: true },
      });
      const topicIds = topics.map((t) => t.id);

      if (topicIds.length > 0) {
        // Find all questions across topics
        const questions = await tx.question.findMany({
          where: { topicId: { in: topicIds } },
          select: { id: true },
        });
        const questionIds = questions.map((q) => q.id);

        if (questionIds.length > 0) {
          await tx.userQuizAttempt.deleteMany({
            where: { questionId: { in: questionIds } },
          });
          await tx.userQuestionReview.deleteMany({
            where: { questionId: { in: questionIds } },
          });
          await tx.questionTranslation.deleteMany({
            where: { questionId: { in: questionIds } },
          });
          await tx.question.deleteMany({
            where: { id: { in: questionIds } },
          });
        }

        await tx.topicPrerequisite.deleteMany({
          where: {
            OR: [
              { topicId: { in: topicIds } },
              { prerequisiteId: { in: topicIds } },
            ],
          },
        });
        await tx.defaultGraphLayout.deleteMany({
          where: { topicId: { in: topicIds } },
        });
        await tx.userGraphLayout.deleteMany({
          where: { topicId: { in: topicIds } },
        });
        await tx.userProgress.deleteMany({
          where: { topicId: { in: topicIds } },
        });
        await tx.topicTranslation.deleteMany({
          where: { topicId: { in: topicIds } },
        });
        await tx.topic.deleteMany({
          where: { id: { in: topicIds } },
        });
      }

      // Delete tiers
      const tiers = await tx.tier.findMany({
        where: { courseId },
        select: { id: true },
      });
      const tierIds = tiers.map((t) => t.id);
      if (tierIds.length > 0) {
        await tx.tierTranslation.deleteMany({
          where: { tierId: { in: tierIds } },
        });
        await tx.tier.deleteMany({
          where: { id: { in: tierIds } },
        });
      }

      // Delete course enrollments, tags, collaborators, translations
      await tx.courseEnrollment.deleteMany({
        where: { courseId },
      });
      await tx.courseTag.deleteMany({
        where: { courseId },
      });
      await tx.courseTranslation.deleteMany({
        where: { courseId },
      });
      await tx.courseCollaborator.deleteMany({
        where: { courseId },
      });
      await tx.course.delete({
        where: { id: courseId },
      });
    });

    // 4. Revalidate catalog
    revalidatePath("/courses");

    return { success: true };
  }
);
