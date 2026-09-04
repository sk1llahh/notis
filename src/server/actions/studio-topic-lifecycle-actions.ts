"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { assertCourseAuthor } from "@/server/auth";
import { createSafeAction, ActionException } from "./safe-action";
import { slugify } from "@/shared/lib/utils";
import {
  createTopicSchema,
  deleteTopicSchema,
  type CreateTopicOutput,
  type DeleteTopicOutput,
} from "./studio-topic-lifecycle-actions.schemas";

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Creates a new topic node in the course roadmap with default translation and coordinates.
 */
export const createTopicAction = createSafeAction(
  createTopicSchema,
  async (input, ctx): Promise<CreateTopicOutput> => {
    // 1. RBAC Guard
    const authorAuth = await assertCourseAuthor(input.courseSlug, ctx.session.user?.id);

    // 2. Generate unique slug for topic in this course
    let baseSlug = slugify(input.title);
    if (!baseSlug || baseSlug.length < 2) {
      baseSlug = `topic-${Math.random().toString(36).slice(2, 8)}`;
    }

    let topicSlug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await prisma.topic.findUnique({
        where: {
          courseId_slug: {
            courseId: authorAuth.courseId,
            slug: topicSlug,
          },
        },
        select: { id: true },
      });
      if (!existing) break;
      counter++;
      topicSlug = `${baseSlug}-${counter}`;
    }

    // 3. Resolve tier ID (fallback to first tier of the course)
    let tierId = input.tierId;
    if (!tierId) {
      const firstTier = await prisma.tier.findFirst({
        where: { courseId: authorAuth.courseId },
        orderBy: { order: "asc" },
        select: { id: true },
      });

      if (!firstTier) {
        const newTier = await prisma.tier.create({
          data: {
            courseId: authorAuth.courseId,
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
          select: { id: true },
        });
        tierId = newTier.id;
      } else {
        tierId = firstTier.id;
      }
    }

    // 4. Create topic, translation, and default graph layout
    const topic = await prisma.topic.create({
      data: {
        courseId: authorAuth.courseId,
        tierId,
        slug: topicSlug,
        difficulty: "BEGINNER",
        estimatedMinutes: 15,
        version: 1,
        isPublished: false,
        createdById: ctx.session.user?.id,
        translations: {
          create: {
            locale: "ru",
            title: input.title,
            summary: "Новая тема курса",
            description: "",
            keyPoints: [],
            pitfalls: [],
          },
        },
        defaultLayouts: {
          create: {
            courseId: authorAuth.courseId,
            positionX: input.positionX,
            positionY: input.positionY,
          },
        },
      },
      include: {
        translations: true,
        tier: {
          include: {
            translations: true,
          },
        },
      },
    });

    // 5. Revalidate cache
    revalidatePath(`/courses/${input.courseSlug}`);
    revalidatePath(`/studio/${input.courseSlug}`);

    const tierTitle =
      topic.tier.translations.find((t) => t.locale === "ru")?.name ??
      topic.tier.translations[0]?.name ??
      topic.tier.slug;

    return {
      topic: {
        id: topic.id,
        slug: topic.slug,
        title: input.title,
        difficulty: topic.difficulty,
        version: topic.version,
        isPublished: topic.isPublished,
        isFreePreview: topic.isFreePreview,
        tierId: topic.tierId,
      },
      tier: {
        id: topic.tier.id,
        slug: topic.tier.slug,
        title: tierTitle,
        badgeColor: topic.tier.badgeColor,
        order: topic.tier.order,
      },
      positionX: input.positionX,
      positionY: input.positionY,
    };
  }
);

/**
 * Deletes a topic and cleans up associated dependencies, layouts, and user progress.
 */
export const deleteTopicAction = createSafeAction(
  deleteTopicSchema,
  async (input, ctx): Promise<DeleteTopicOutput> => {
    // 1. RBAC Guard
    const authorAuth = await assertCourseAuthor(input.courseSlug, ctx.session.user?.id);

    // 2. Verify topic belongs to this course
    const topic = await prisma.topic.findUnique({
      where: { id: input.topicId },
      select: { courseId: true },
    });

    if (!topic || topic.courseId !== authorAuth.courseId) {
      throw new ActionException("NOT_FOUND", "Тема не найдена в данном курсе");
    }

    // 3. Cascade cleanup in atomic transaction
    await prisma.$transaction(async (tx) => {
      // Remove graph connections
      await tx.topicPrerequisite.deleteMany({
        where: {
          OR: [
            { topicId: input.topicId },
            { prerequisiteId: input.topicId },
          ],
        },
      });

      // Remove UI layouts
      await tx.defaultGraphLayout.deleteMany({
        where: { topicId: input.topicId },
      });

      await tx.userGraphLayout.deleteMany({
        where: { topicId: input.topicId },
      });

      // Remove user progress
      await tx.userProgress.deleteMany({
        where: { topicId: input.topicId },
      });

      // Remove topic (cascades translations, questions, etc.)
      await tx.topic.delete({
        where: { id: input.topicId },
      });
    });

    // 4. Revalidate course and studio views
    revalidatePath(`/courses/${input.courseSlug}`);
    revalidatePath(`/studio/${input.courseSlug}`);

    return {
      topicId: input.topicId,
      success: true,
    };
  }
);
