export type TopicNodeStatus =
  | "LOCKED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "COMPLETED";

export type TopicDifficulty =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "EXPERT";

export interface TopicNodePayload extends Record<string, unknown> {
  slug: string;
  title: string;
  difficulty: TopicDifficulty;
  status: TopicNodeStatus;
  isFreePreview: boolean;
  tier: {
    id: string;
    slug: string;
    title: string;
    badgeColor: string;
    order: number;
  };
  progress: {
    completedVersion: number | null;
    currentVersion: number;
    hasUpdate: boolean;
  };
  [key: string]: unknown;
}

export interface RoadmapNodeDTO {
  id: string;
  type: "topicNode";
  position: { x: number; y: number };
  data: TopicNodePayload;
}

export interface RoadmapEdgeDTO {
  id: string;
  source: string;
  target: string;
  type: "required" | "recommended";
  isUnlocked: boolean;
  data?: {
    type: "required" | "recommended";
    isUnlocked: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface RoadmapGraphDTO {
  course: {
    id: string;
    slug: string;
    title: string;
    learningMode: string;
  };
  nodes: RoadmapNodeDTO[];
  edges: RoadmapEdgeDTO[];
}

// -----------------------------------------------------------------------------
// Input types for the pure transformation function
// -----------------------------------------------------------------------------

export interface RawTranslation {
  locale: string;
  title?: string;
  name?: string;
  tagline?: string;
  description?: string | null;
  summary?: string;
}

export interface RawTier {
  id: string;
  slug: string;
  badgeColor: string;
  order: number;
  translations: RawTranslation[];
}

export interface RawPrerequisite {
  prerequisiteId: string;
  type: "REQUIRED" | "RECOMMENDED";
  order?: number;
}

export interface RawTopic {
  id: string;
  slug: string;
  difficulty: TopicDifficulty;
  version: number;
  isPublished: boolean;
  isFreePreview: boolean;
  tierId: string;
  translations: RawTranslation[];
  prerequisites: RawPrerequisite[];
}

export interface RawCourse {
  id: string;
  slug: string;
  defaultLocale: string;
  learningMode: string;
  translations: RawTranslation[];
  tiers: RawTier[];
  topics: RawTopic[];
}

export interface RawUserProgress {
  topicId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  completedVersion?: number | null;
}

export interface RawPosition {
  topicId: string;
  positionX: number;
  positionY: number;
}

export interface TransformRoadmapOptions {
  course: RawCourse;
  userProgress?: RawUserProgress[];
  defaultLayouts?: RawPosition[];
  userLayouts?: RawPosition[];
  locale?: string;
}
