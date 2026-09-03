import { prisma } from "@/server/db";
import type {
  GetTopicDetailsOptions,
  TopicDetailsDTO,
  TopicProgressStatus,
} from "../types";

/**
 * Server Service: Fetches full topic content and progress state from Prisma
 * and compiles it into a clean, client-safe TopicDetailsDTO.
 */
export async function getTopicDetails(
  courseSlug: string,
  topicSlug: string,
  options: GetTopicDetailsOptions = {}
): Promise<TopicDetailsDTO | null> {
  const { userId, locale } = options;

  // 1. Fetch topic with course and tier relations
  const topic = await prisma.topic.findFirst({
    where: {
      slug: topicSlug,
      isPublished: true,
      isArchived: false,
      course: {
        slug: courseSlug,
      },
    },
    include: {
      translations: true,
      tier: {
        include: {
          translations: true,
        },
      },
      course: {
        include: {
          translations: true,
        },
      },
    },
  });

  if (!topic) {
    return null;
  }

  const defaultLocale = topic.course.defaultLocale;
  const requestedLocale = locale ?? defaultLocale;

  // 2. Fetch User Progress if authenticated
  let progressRecord = null;
  if (userId) {
    // Check user by id, email, or authId
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { email: userId },
          { authId: userId },
        ],
      },
      select: { id: true },
    });

    if (user) {
      progressRecord = await prisma.userProgress.findUnique({
        where: {
          userId_topicId: {
            userId: user.id,
            topicId: topic.id,
          },
        },
        select: {
          status: true,
          completedVersion: true,
          completedAt: true,
        },
      });
    }
  }

  // 3. Resolve Translations
  const topicTrans =
    topic.translations.find((t) => t.locale === requestedLocale) ??
    topic.translations.find((t) => t.locale === defaultLocale) ??
    topic.translations[0];

  const courseTrans =
    topic.course.translations.find((t) => t.locale === requestedLocale) ??
    topic.course.translations.find((t) => t.locale === defaultLocale) ??
    topic.course.translations[0];

  const tierTrans =
    topic.tier.translations.find((t) => t.locale === requestedLocale) ??
    topic.tier.translations.find((t) => t.locale === defaultLocale) ??
    topic.tier.translations[0];

  return {
    id: topic.id,
    slug: topic.slug,
    courseSlug: topic.course.slug,
    courseTitle: courseTrans?.title ?? topic.course.slug,
    title: topicTrans?.title ?? topic.slug,
    summary: topicTrans?.summary ?? "",
    subtitle: topicTrans?.subtitle ?? null,
    description: topicTrans?.description ?? null,
    keyPoints: topicTrans?.keyPoints ?? [],
    pitfalls: topicTrans?.pitfalls ?? [],
    contentBlocks: Array.isArray(topicTrans?.contentBlocks)
      ? (topicTrans.contentBlocks as unknown[])
      : [],
    resources: Array.isArray(topicTrans?.resources)
      ? (topicTrans.resources as unknown[])
      : [],
    difficulty: topic.difficulty,
    estimatedMinutes: topic.estimatedMinutes,
    version: topic.version,
    isFreePreview: topic.isFreePreview,
    tier: {
      id: topic.tier.id,
      slug: topic.tier.slug,
      name: tierTrans?.name ?? topic.tier.slug,
      badgeColor: topic.tier.badgeColor,
      order: topic.tier.order,
    },
    progress: {
      status: (progressRecord?.status ?? "NOT_STARTED") as TopicProgressStatus,
      completedVersion: progressRecord?.completedVersion ?? null,
      completedAt: progressRecord?.completedAt
        ? progressRecord.completedAt.toISOString()
        : null,
    },
  };
}
