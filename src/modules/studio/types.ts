import type { Node, Edge } from "@xyflow/react";
import type { TopicNodePayload } from "@/modules/roadmap";

export type StudioNode = Node<TopicNodePayload, "topicNode">;
export type StudioEdge = Edge;

export interface StudioGraphDTO {
  course: {
    id: string;
    slug: string;
    title: string;
    learningMode: string;
  };
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
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
  options: StudioQuizOptionDTO[];
  correctIndexes: number[];
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
  title: string;
  summary: string;
  keyPoints: string[];
  pitfalls: string[];
  questions: StudioQuizQuestionDTO[];
}
