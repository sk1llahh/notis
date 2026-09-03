export type TopicDifficulty =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "EXPERT";

export type TopicProgressStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED";

export interface TopicTierDTO {
  id: string;
  slug: string;
  name: string;
  badgeColor: string;
  order: number;
}

export interface TopicUserProgressDTO {
  status: TopicProgressStatus;
  completedVersion: number | null;
  completedAt: string | null;
}

export interface TopicDetailsDTO {
  id: string;
  slug: string;
  courseSlug: string;
  courseTitle: string;
  title: string;
  summary: string;
  subtitle?: string | null;
  description?: string | null;
  keyPoints: string[];
  pitfalls: string[];
  contentBlocks: unknown[];
  resources: unknown[];
  difficulty: TopicDifficulty;
  estimatedMinutes: number;
  version: number;
  isFreePreview: boolean;
  tier: TopicTierDTO;
  progress: TopicUserProgressDTO;
}

export interface GetTopicDetailsOptions {
  userId?: string;
  locale?: string;
}
