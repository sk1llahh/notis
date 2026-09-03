import { prisma } from "@/server/db";
import {
  computeDeterministicLayout,
  resolveTranslation,
} from "@/modules/roadmap";
import type { StudioGraphDTO, StudioNode, StudioEdge } from "../types";

/**
 * Server Service: Fetches full course graph structure for Author Studio.
 * Unlike student roadmap, Fog of War is NOT applied, allowing authors
 * to view and manipulate all nodes (including unpublished drafts).
 */
export async function getCourseStudioGraph(
  courseSlug: string,
  locale?: string
): Promise<StudioGraphDTO | null> {
  const courseRecord = await prisma.course.findUnique({
    where: { slug: courseSlug },
    include: {
      translations: true,
      tiers: {
        where: { isArchived: false },
        orderBy: { order: "asc" },
        include: {
          translations: true,
        },
      },
      topics: {
        where: { isArchived: false },
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

  const courseLocale = locale ?? courseRecord.defaultLocale;
  const courseTrans = resolveTranslation(
    courseRecord.translations.map((t) => ({
      locale: t.locale,
      title: t.title,
      tagline: t.tagline ?? undefined,
      description: t.description,
    })),
    courseLocale,
    courseRecord.defaultLocale
  );

  // Index saved author positions from DefaultGraphLayout
  const defaultPosMap = new Map<string, { x: number; y: number }>();
  for (const pos of courseRecord.defaultLayouts) {
    defaultPosMap.set(pos.topicId, { x: pos.positionX, y: pos.positionY });
  }

  // Compute deterministic fallback positions when no layout saved yet
  const fallbackPositions = computeDeterministicLayout(
    courseRecord.tiers.map((t) => ({
      id: t.id,
      slug: t.slug,
      badgeColor: t.badgeColor,
      order: t.order,
      translations: t.translations.map((tr) => ({
        locale: tr.locale,
        name: tr.name,
      })),
    })),
    courseRecord.topics.map((top) => ({
      id: top.id,
      slug: top.slug,
      tierId: top.tierId,
      difficulty: top.difficulty,
      version: top.version,
      isPublished: top.isPublished,
      isFreePreview: top.isFreePreview,
      translations: top.translations.map((tr) => ({
        locale: tr.locale,
        title: tr.title,
        summary: tr.summary,
      })),
      prerequisites: top.prerequisites,
    }))
  );

  const tierMap = new Map(courseRecord.tiers.map((t) => [t.id, t]));
  const existingTopicIds = new Set(courseRecord.topics.map((t) => t.id));

  // Build Nodes: Author sees all nodes without Fog of War
  const nodes: StudioNode[] = courseRecord.topics.map((topic) => {
    const tier = tierMap.get(topic.tierId);
    const topicTrans = resolveTranslation(
      topic.translations.map((tr) => ({
        locale: tr.locale,
        title: tr.title,
        summary: tr.summary,
      })),
      courseLocale,
      courseRecord.defaultLocale
    );
    const tierTrans = tier
      ? resolveTranslation(
          tier.translations.map((tr) => ({
            locale: tr.locale,
            name: tr.name,
          })),
          courseLocale,
          courseRecord.defaultLocale
        )
      : undefined;


    const position =
      defaultPosMap.get(topic.id) ??
      fallbackPositions[topic.id] ?? { x: 0, y: 0 };

    return {
      id: topic.id,
      type: "topicNode",
      position,
      data: {
        slug: topic.slug,
        title: topicTrans.title ?? topic.slug,
        difficulty: topic.difficulty,
        status: "AVAILABLE",
        isFreePreview: topic.isFreePreview,
        tier: {
          id: tier?.id ?? topic.tierId,
          slug: tier?.slug ?? "default-tier",
          title: tierTrans?.name ?? tierTrans?.title ?? tier?.slug ?? "Tier",
          badgeColor: tier?.badgeColor ?? "#10b981",
          order: tier?.order ?? 1,
        },
        progress: {
          completedVersion: null,
          currentVersion: topic.version,
          hasUpdate: false,
        },
      },
    };
  });

  // Build Edges
  const edges: StudioEdge[] = [];
  for (const topic of courseRecord.topics) {
    for (const prereq of topic.prerequisites) {
      if (
        !existingTopicIds.has(prereq.prerequisiteId) ||
        !existingTopicIds.has(topic.id)
      ) {
        continue;
      }
      const edgeType = prereq.type === "REQUIRED" ? "required" : "recommended";
      edges.push({
        id: `${prereq.prerequisiteId}->${topic.id}`,
        source: prereq.prerequisiteId,
        target: topic.id,
        type: edgeType,
        data: {
          type: edgeType,
          isUnlocked: true,
        },
      });
    }
  }

  return {
    course: {
      id: courseRecord.id,
      slug: courseRecord.slug,
      title: courseTrans.title ?? courseRecord.slug,
      learningMode: courseRecord.learningMode,
    },
    nodes,
    edges,
  };
}

/**
 * Server Service: Fetches full topic and quiz details for the Author Studio.
 * Includes complete information including correctAnswerIndexes and explanation.
 */
export async function getTopicStudioDetails(
  topicId: string,
  locale?: string
): Promise<import("../types").TopicStudioDetailsDTO | null> {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      course: {
        select: { defaultLocale: true },
      },
      translations: true,
      questions: {
        where: { isArchived: false },
        include: {
          translations: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!topic) {
    return null;
  }

  const defaultLocale = topic.course.defaultLocale;
  const targetLocale = locale ?? defaultLocale;

  const topicTrans =
    topic.translations.find((t) => t.locale === targetLocale) ??
    topic.translations.find((t) => t.locale === defaultLocale) ??
    topic.translations[0];

  const questions: import("../types").StudioQuizQuestionDTO[] = topic.questions.map((q) => {
    const qTrans =
      q.translations.find((t) => t.locale === targetLocale) ??
      q.translations.find((t) => t.locale === defaultLocale) ??
      q.translations[0];

    const rawOpts = qTrans?.options;
    let options: import("../types").StudioQuizOptionDTO[] = [];

    if (Array.isArray(rawOpts)) {
      options = rawOpts.map((opt) => {
        if (typeof opt === "object" && opt !== null) {
          const o = opt as Record<string, unknown>;
          return {
            text: typeof o.text === "string" ? o.text : "",
            codeSnippet: typeof o.codeSnippet === "string" ? o.codeSnippet : undefined,
          };
        }
        return {
          text: String(opt),
        };
      });
    }

    return {
      id: q.id,
      question: qTrans?.prompt ?? "Вопрос без текста",
      type: q.type === "MULTIPLE_CHOICE" ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE",
      options,
      correctIndexes: q.correctAnswerIndexes,
      explanation: qTrans?.explanation ?? undefined,
      order: q.order,
    };
  });

  return {
    id: topic.id,
    slug: topic.slug,
    difficulty: topic.difficulty,
    version: topic.version,
    isPublished: topic.isPublished,
    isFreePreview: topic.isFreePreview,
    title: topicTrans?.title ?? topic.slug,
    summary: topicTrans?.summary ?? "",
    keyPoints: topicTrans?.keyPoints ?? [],
    pitfalls: topicTrans?.pitfalls ?? [],
    questions,
  };
}

