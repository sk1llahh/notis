import { computeDeterministicLayout } from "./roadmap-layout";
import type {
  RawCourse,
  RawTier,
  RawTopic,
  RawTranslation,
  RoadmapEdgeDTO,
  RoadmapGraphDTO,
  RoadmapNodeDTO,
  TopicNodePayload,
  TopicNodeStatus,
  TransformRoadmapOptions,
} from "../types";

/**
 * Resolves the best translation based on priority:
 * 1. Requested locale
 * 2. Course default locale
 * 3. First available translation
 */
export function resolveTranslation(
  translations: RawTranslation[],
  requestedLocale: string,
  defaultLocale: string
): RawTranslation {
  if (!translations || translations.length === 0) {
    return { locale: defaultLocale };
  }

  const exact = translations.find((t) => t.locale === requestedLocale);
  if (exact) return exact;

  const fallback = translations.find((t) => t.locale === defaultLocale);
  if (fallback) return fallback;

  return translations[0];
}

/**
 * Pure transformation function:
 * Converts raw Course domain data into a client-safe RoadmapGraphDTO.
 * Calculates:
 * - Fog of War states (LOCKED, AVAILABLE, IN_PROGRESS, COMPLETED)
 * - Version updates (hasUpdate)
 * - Edge unlock states
 * - Node positions with layout fallback
 * - Localized titles
 */
export function transformCourseToGraphDTO(
  options: TransformRoadmapOptions
): RoadmapGraphDTO {
  const {
    course,
    userProgress = [],
    defaultLayouts = [],
    userLayouts = [],
    locale = course.defaultLocale,
  } = options;

  // 1. Index user progress by topicId for O(1) lookups
  const progressMap = new Map<string, { status: string; completedVersion?: number | null }>();
  for (const p of userProgress) {
    progressMap.set(p.topicId, {
      status: p.status,
      completedVersion: p.completedVersion ?? null,
    });
  }

  // 2. Index layouts
  const userPosMap = new Map<string, { x: number; y: number }>();
  for (const pos of userLayouts) {
    userPosMap.set(pos.topicId, { x: pos.positionX, y: pos.positionY });
  }

  const defaultPosMap = new Map<string, { x: number; y: number }>();
  for (const pos of defaultLayouts) {
    defaultPosMap.set(pos.topicId, { x: pos.positionX, y: pos.positionY });
  }

  // Fallback layout when neither author nor user positions exist
  const fallbackPositions = computeDeterministicLayout(
    course.tiers,
    course.topics
  );

  // 3. Index tiers and published topics by ID
  const existingTopicIds = new Set(course.topics.map((t) => t.id));
  const tierMap = new Map<string, RawTier>();
  for (const tier of course.tiers) {
    tierMap.set(tier.id, tier);
  }

  // 4. Transform Nodes & Calculate Fog of War
  const nodes: RoadmapNodeDTO[] = course.topics.map((topic) => {
    const progress = progressMap.get(topic.id);
    const tier = tierMap.get(topic.tierId);

    // Fog of War resolution (only active published prerequisites can block availability)
    let status: TopicNodeStatus;

    if (progress?.status === "COMPLETED") {
      status = "COMPLETED";
    } else if (progress?.status === "IN_PROGRESS") {
      status = "IN_PROGRESS";
    } else {
      // NOT_STARTED or Guest: check valid REQUIRED prerequisites
      const requiredPrereqs = (topic.prerequisites || []).filter(
        (p) => p.type === "REQUIRED" && existingTopicIds.has(p.prerequisiteId)
      );

      if (requiredPrereqs.length === 0) {
        // Root node without prerequisites is available
        status = "AVAILABLE";
      } else {
        const allRequiredCompleted = requiredPrereqs.every((p) => {
          const prereqProgress = progressMap.get(p.prerequisiteId);
          return prereqProgress?.status === "COMPLETED";
        });

        status = allRequiredCompleted ? "AVAILABLE" : "LOCKED";
      }
    }

    // Version update check
    const hasUpdate =
      status === "COMPLETED" &&
      typeof progress?.completedVersion === "number" &&
      progress.completedVersion < topic.version;

    // Translations
    const topicTrans = resolveTranslation(
      topic.translations,
      locale,
      course.defaultLocale
    );
    const tierTrans = tier
      ? resolveTranslation(tier.translations, locale, course.defaultLocale)
      : undefined;

    // Coordinate resolution
    const position =
      userPosMap.get(topic.id) ??
      defaultPosMap.get(topic.id) ??
      fallbackPositions[topic.id] ?? { x: 0, y: 0 };

    const tierTitle = tierTrans?.name ?? tierTrans?.title ?? tier?.slug ?? "Tier";
    const tierOrder = tier?.order ?? 1;

    const payload: TopicNodePayload = {
      slug: topic.slug,
      title: topicTrans.title ?? topic.slug,
      difficulty: topic.difficulty,
      status,
      isFreePreview: topic.isFreePreview,
      tierName: tierTitle,
      tierLevel: tierOrder,
      tier: {
        id: tier?.id ?? topic.tierId,
        slug: tier?.slug ?? "default-tier",
        title: tierTitle,
        badgeColor: tier?.badgeColor ?? "#10b981",
        order: tierOrder,
      },
      progress: {
        completedVersion: progress?.completedVersion ?? null,
        currentVersion: topic.version,
        hasUpdate,
      },
    };

    return {
      id: topic.id,
      type: "topicNode",
      position,
      data: payload,
    };
  });

  // 5. Transform Edges & Calculate unlock states (filter out dangling edges)
  const edges: RoadmapEdgeDTO[] = [];
  for (const topic of course.topics) {
    if (!topic.prerequisites) continue;

    for (const prereq of topic.prerequisites) {
      // Both source and target must exist in the published graph
      if (
        !existingTopicIds.has(prereq.prerequisiteId) ||
        !existingTopicIds.has(topic.id)
      ) {
        continue;
      }

      const sourceProgress = progressMap.get(prereq.prerequisiteId);
      const isUnlocked = sourceProgress?.status === "COMPLETED";
      const edgeType = prereq.type === "REQUIRED" ? "required" : "recommended";

      edges.push({
        id: `${prereq.prerequisiteId}->${topic.id}`,
        source: prereq.prerequisiteId,
        target: topic.id,
        type: edgeType,
        isUnlocked,
        data: {
          type: edgeType,
          isUnlocked,
        },
      });
    }
  }

  // 6. Resolve Course translation
  const courseTrans = resolveTranslation(
    course.translations,
    locale,
    course.defaultLocale
  );

  return {
    course: {
      id: course.id,
      slug: course.slug,
      title: courseTrans.title ?? course.slug,
      learningMode: course.learningMode,
    },
    nodes,
    edges,
  };
}
