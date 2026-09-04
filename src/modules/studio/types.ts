import type { Node, Edge } from "@xyflow/react";
import type { TopicNodePayload } from "@/modules/roadmap";

export type StudioNode = Node<TopicNodePayload, "topicNode">;
export type StudioEdge = Edge;

export interface StudioGraphTierDTO {
  id: string;
  slug: string;
  title: string;
  badgeColor: string;
  order: number;
  topicsCount?: number;
}

export interface StudioGraphDTO {
  course: {
    id: string;
    slug: string;
    title: string;
    description?: string;
    isPublished?: boolean;
    learningMode: string;
  };
  tiers?: StudioGraphTierDTO[];
  nodes: StudioNode[];
  edges: StudioEdge[];
}

export type SyncStatus = "IDLE" | "SYNCING" | "SAVED" | "ERROR";
export type ConnectionType = "REQUIRED" | "RECOMMENDED";

export interface StudioQuizOptionDTO {
  text: string;
  codeSnippet?: string;
}

export interface StudioQuizQuestionDTO {
  id: string;
  question: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "CODE";
  options: StudioQuizOptionDTO[];
  correctIndexes: number[];
  acceptedAnswers?: string[];
  codeTemplate?: string;
  testCases?: any[];
  explanation?: string;
  order: number;
}

export interface TopicStudioDetailsDTO {
  id: string;
  slug: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  version: number;
  isPublished: boolean;
  isFreePreview: boolean;
  tierId?: string;
  title: string;
  summary: string;
  keyPoints: string[];
  pitfalls: string[];
  questions: StudioQuizQuestionDTO[];
}
