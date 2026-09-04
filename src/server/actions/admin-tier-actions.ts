"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { assertCourseAuthor } from "@/server/auth";
import { slugify } from "@/shared/lib/utils";
import { createSafeAction, ActionException } from "./safe-action";
import {
  createCourseTierSchema,
  updateCourseTierSchema,
  deleteCourseTierSchema,
  assignTopicTierSchema,
  getCourseTiersSchema,
  type CourseTierDTO,
} from "./admin-tier-actions.schemas";

// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Creates a new tier for a course.
 * Automatically resolves slug collisions and orders existing tiers if necessary.
 */
export const createCourseTierAction = createSafeAction(
  createCourseTierSchema,
  async (input, ctx): Promise<{ success: true; tier: CourseTierDTO }> => {
    const authorAuth = await assertCourseAuthor(input.courseSlug, ctx.session.user?.id);

    // 1. Resolve unique slug within course
    let baseSlug = slugify(input.title) || `tier-${input.level}`;
    let tierSlug = baseSlug;
    let counter = 1;
    while (
      await prisma.tier.findUnique({
        where: {
          courseId_slug: {
            courseId: authorAuth.courseId,
            slug: tierSlug,
          },
        },
      })
    ) {
      counter++;
      tierSlug = `${baseSlug}-${counter}`;
    }

    // 2. Prevent order collision by shifting existing tiers >= input.level descending
    const tiersToShift = await prisma.tier.findMany({
      where: {
        courseId: authorAuth.courseId,
        order: { gte: input.level },
      },
      orderBy: { order: "desc" },
      select: { id: true, order: true },
    });

    for (const t of tiersToShift) {
      await prisma.tier.update({
        where: { id: t.id },
        data: { order: t.order + 1 },
      });
    }

    // 3. Create Tier and TierTranslation in "ru"
    const tier = await prisma.tier.create({
      data: {
        courseId: authorAuth.courseId,
        slug: tierSlug,
        order: input.level,
        badgeColor: input.badgeColor ?? "#10b981",
        isPublished: true,
        translations: {
          create: {
            locale: "ru",
            name: input.title,
          },
        },
      },
      include: {
        translations: true,
      },
    });

    const trans = tier.translations.find((tr) => tr.locale === "ru") ?? tier.translations[0];

    revalidatePath(`/studio/${input.courseSlug}`);
    revalidatePath(`/courses/${input.courseSlug}`);

    return {
      success: true,
      tier: {
        id: tier.id,
        slug: tier.slug,
        title: trans?.name ?? input.title,
        level: tier.order,
        badgeColor: tier.badgeColor,
        topicsCount: 0,
      },
    };
  }
);

/**
 * Updates an existing tier's title, order (level), and badge color.
 * Swaps orders cleanly if colliding with another tier of the course.
 */
export const updateCourseTierAction = createSafeAction(
  updateCourseTierSchema,
  async (input, ctx): Promise<{ success: true; tier: CourseTierDTO }> => {
    const authorAuth = await assertCourseAuthor(input.courseSlug, ctx.session.user?.id);

    const currentTier = await prisma.tier.findFirst({
      where: { id: input.tierId, courseId: authorAuth.courseId },
      include: { translations: true },
    });

    if (!currentTier) {
      throw new ActionException("NOT_FOUND", "Уровень курса не найден");
    }

    // If order changed, handle collision with swap
    if (currentTier.order !== input.level) {
      const collidingTier = await prisma.tier.findFirst({
        where: {
          courseId: authorAuth.courseId,
          order: input.level,
          id: { not: input.tierId },
        },
      });

      if (collidingTier) {
        // Safe swap using temporary negative order
        await prisma.tier.update({
          where: { id: collidingTier.id },
          data: { order: -999999 },
        });
        await prisma.tier.update({
          where: { id: input.tierId },
          data: { order: input.level },
        });
        await prisma.tier.update({
          where: { id: collidingTier.id },
          data: { order: currentTier.order },
        });
      } else {
        await prisma.tier.update({
          where: { id: input.tierId },
          data: { order: input.level },
        });
      }
    }

    // Update Tier badgeColor if provided
    const updatedTier = await prisma.tier.update({
      where: { id: input.tierId },
      data: {
        badgeColor: input.badgeColor ?? currentTier.badgeColor,
      },
    });

    // Upsert Russian translation
    await prisma.tierTranslation.upsert({
      where: {
        tierId_locale: {
          tierId: input.tierId,
          locale: "ru",
        },
      },
      update: {
        name: input.title,
      },
      create: {
        tierId: input.tierId,
        locale: "ru",
        name: input.title,
      },
    });

    revalidatePath(`/studio/${input.courseSlug}`);
    revalidatePath(`/courses/${input.courseSlug}`);

    return {
      success: true,
      tier: {
        id: updatedTier.id,
        slug: updatedTier.slug,
        title: input.title,
        level: updatedTier.order,
        badgeColor: updatedTier.badgeColor,
      },
    };
  }
);

/**
 * Deletes a tier from the course.
 * Reassigns all topics in this tier to another existing tier or fallback default tier,
 * then safely deletes translations and the Tier record.
 */
export const deleteCourseTierAction = createSafeAction(
  deleteCourseTierSchema,
  async (input, ctx): Promise<{ success: true; tierId: string }> => {
    const authorAuth = await assertCourseAuthor(input.courseSlug, ctx.session.user?.id);

    const tierToDelete = await prisma.tier.findFirst({
      where: { id: input.tierId, courseId: authorAuth.courseId },
    });

    if (!tierToDelete) {
      throw new ActionException("NOT_FOUND", "Уровень курса не найден");
    }

    // Find fallback tier to reassign topics to
    let fallbackTier = await prisma.tier.findFirst({
      where: {
        courseId: authorAuth.courseId,
        id: { not: input.tierId },
      },
      orderBy: { order: "asc" },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      if (!fallbackTier) {
        // If this was the only tier, create a default track
        fallbackTier = await tx.tier.create({
          data: {
            courseId: authorAuth.courseId,
            slug: "main-track",
            order: 1,
            badgeColor: "#64748b",
            isPublished: true,
            translations: {
              create: {
                locale: "ru",
                name: "Основной трек",
              },
            },
          },
          select: { id: true },
        });
      }

      // 1. Reassign topics
      await tx.topic.updateMany({
        where: { tierId: input.tierId },
        data: { tierId: fallbackTier.id },
      });

      // 2. Delete translations
      await tx.tierTranslation.deleteMany({
        where: { tierId: input.tierId },
      });

      // 3. Delete tier
      await tx.tier.delete({
        where: { id: input.tierId },
      });
    });

    revalidatePath(`/studio/${input.courseSlug}`);
    revalidatePath(`/courses/${input.courseSlug}`);

    return {
      success: true,
      tierId: input.tierId,
    };
  }
);

/**
 * Assigns a topic to a tier or fallback default tier if tierId is null.
 */
export const assignTopicTierAction = createSafeAction(
  assignTopicTierSchema,
  async (input, ctx): Promise<{ success: true; topicId: string; tierId: string }> => {
    const authorAuth = await assertCourseAuthor(input.courseSlug, ctx.session.user?.id);

    const topic = await prisma.topic.findFirst({
      where: { id: input.topicId, courseId: authorAuth.courseId },
      select: { id: true },
    });

    if (!topic) {
      throw new ActionException("NOT_FOUND", "Тема курса не найдена");
    }

    let targetTierId = input.tierId;

    if (!targetTierId) {
      // Find fallback tier (lowest order)
      let fallbackTier = await prisma.tier.findFirst({
        where: { courseId: authorAuth.courseId },
        orderBy: { order: "asc" },
        select: { id: true },
      });

      if (!fallbackTier) {
        fallbackTier = await prisma.tier.create({
          data: {
            courseId: authorAuth.courseId,
            slug: "main-track",
            order: 1,
            badgeColor: "#64748b",
            isPublished: true,
            translations: {
              create: {
                locale: "ru",
                name: "Основной трек",
              },
            },
          },
          select: { id: true },
        });
      }

      targetTierId = fallbackTier.id;
    } else {
      // Verify target tier belongs to this course
      const tierExists = await prisma.tier.findFirst({
        where: { id: targetTierId, courseId: authorAuth.courseId },
        select: { id: true },
      });

      if (!tierExists) {
        throw new ActionException("NOT_FOUND", "Выбранный уровень курса не найден");
      }
    }

    await prisma.topic.update({
      where: { id: input.topicId },
      data: { tierId: targetTierId },
    });

    revalidatePath(`/studio/${input.courseSlug}`);
    revalidatePath(`/courses/${input.courseSlug}`);

    return {
      success: true,
      topicId: input.topicId,
      tierId: targetTierId,
    };
  }
);

/**
 * Fetches all tiers of a course with topic counts.
 */
export const getCourseTiersAction = createSafeAction(
  getCourseTiersSchema,
  async (input, ctx): Promise<{ success: true; tiers: CourseTierDTO[] }> => {
    const authorAuth = await assertCourseAuthor(input.courseSlug, ctx.session.user?.id);

    const tiers = await prisma.tier.findMany({
      where: { courseId: authorAuth.courseId },
      include: {
        translations: true,
        _count: {
          select: { topics: true },
        },
      },
      orderBy: { order: "asc" },
    });

    const result: CourseTierDTO[] = tiers.map((t) => {
      const trans = t.translations.find((tr) => tr.locale === "ru") ?? t.translations[0];
      return {
        id: t.id,
        slug: t.slug,
        title: trans?.name ?? t.slug,
        level: t.order,
        badgeColor: t.badgeColor,
        topicsCount: t._count.topics,
      };
    });

    return {
      success: true,
      tiers: result,
    };
  }
);
