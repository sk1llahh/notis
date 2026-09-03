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
