import { prisma } from "@/server/db";
import { transformCourseToGraphDTO } from "./roadmap-transform";
import type {
  RawCourse,
  RawPosition,
  RawUserProgress,
  RoadmapGraphDTO,
} from "../types";

export interface GetCourseRoadmapOptions {
  userId?: string;
  locale?: string;
}

/**
 * Server Service: Fetches course graph data from Prisma and compiles it into RoadmapGraphDTO.
 * Never leaks raw Prisma models to client components.
 */
export async function getCourseRoadmapGraph(
  courseSlug: string,
  options: GetCourseRoadmapOptions = {}
): Promise<RoadmapGraphDTO | null> {
  const { userId, locale } = options;

  // 1. Fetch course with published structure
  const courseRecord = await prisma.course.findUnique({
    where: { slug: courseSlug },
    include: {
      translations: true,
      tiers: {
        where: { isPublished: true, isArchived: false },
        orderBy: { order: "asc" },
        include: {
          translations: true,
        },
      },
      topics: {
        where: { isPublished: true, isArchived: false },
        include: {
          translations: true,
          prerequisites: {
            select: {
              prerequisiteId: true,
              type: true,
              order: true,
            },
          },
        },
      },
      defaultLayouts: {
        select: {
          topicId: true,
          positionX: true,
          positionY: true,
        },
      },
    },
  });

  if (!courseRecord) {
    return null;
  }

  // 2. Fetch user-specific progress and layouts if authenticated
  let userProgressRecords: RawUserProgress[] = [];
  let userLayoutRecords: RawPosition[] = [];
  let isEnrolled = false;

  if (userId) {
    const [progressList, layoutsList, enrollment] = await Promise.all([
      prisma.userProgress.findMany({
        where: {
          userId,
          topic: {
            courseId: courseRecord.id,
          },
        },
        select: {
          topicId: true,
          status: true,
          completedVersion: true,
        },
      }),
      prisma.userGraphLayout.findMany({
        where: {
          userId,
          courseId: courseRecord.id,
        },
        select: {
          topicId: true,
          positionX: true,
          positionY: true,
        },
      }),
      prisma.courseEnrollment.findFirst({
        where: {
          userId,
          courseId: courseRecord.id,
          status: "ACTIVE",
        },
        select: { id: true },
      }),
    ]);

    userProgressRecords = progressList.map((p) => ({
      topicId: p.topicId,
      status: p.status,
      completedVersion: p.completedVersion,
    }));

    userLayoutRecords = layoutsList.map((l) => ({
      topicId: l.topicId,
      positionX: l.positionX,
      positionY: l.positionY,
    }));

    isEnrolled = Boolean(enrollment);
  }

  // 3. Map into clean RawCourse structure
  const rawCourse: RawCourse = {
    id: courseRecord.id,
    slug: courseRecord.slug,
    defaultLocale: courseRecord.defaultLocale,
    learningMode: courseRecord.learningMode,
    translations: courseRecord.translations.map((t) => ({
      locale: t.locale,
      title: t.title,
      tagline: t.tagline ?? undefined,
      description: t.description,
    })),
    tiers: courseRecord.tiers.map((tier) => ({
      id: tier.id,
      slug: tier.slug,
      badgeColor: tier.badgeColor,
      order: tier.order,
      translations: tier.translations.map((t) => ({
        locale: t.locale,
        name: t.name,
      })),
    })),
    topics: courseRecord.topics.map((topic) => ({
      id: topic.id,
      slug: topic.slug,
      difficulty: topic.difficulty,
      version: topic.version,
      isPublished: topic.isPublished,
      isFreePreview: topic.isFreePreview,
      tierId: topic.tierId,
      translations: topic.translations.map((t) => ({
        locale: t.locale,
        title: t.title,
        summary: t.summary,
      })),
      prerequisites: topic.prerequisites.map((p) => ({
        prerequisiteId: p.prerequisiteId,
        type: p.type,
        order: p.order,
      })),
    })),
  };

  const defaultLayouts: RawPosition[] = courseRecord.defaultLayouts.map(
    (l) => ({
      topicId: l.topicId,
      positionX: l.positionX,
      positionY: l.positionY,
    })
  );

  // 4. Transform via pure domain logic
  const graphDTO = transformCourseToGraphDTO({
    course: rawCourse,
    userProgress: userProgressRecords,
    defaultLayouts,
    userLayouts: userLayoutRecords,
    locale: locale ?? courseRecord.defaultLocale,
  });

  graphDTO.course.isEnrolled = isEnrolled;

  return graphDTO;
}
