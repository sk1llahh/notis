import { GRAPH_CONFIG } from "@/shared/config";
import type { RawTier, RawTopic } from "../types";

export interface ComputedPositionMap {
  [topicId: string]: { x: number; y: number };
}

/**
 * Deterministic fallback layout algorithm.
 * Groups topics by their tiers and arranges them in columns (left-to-right progression),
 * with topics vertically spaced inside each tier column.
 */
export function computeDeterministicLayout(
  tiers: RawTier[],
  topics: RawTopic[]
): ComputedPositionMap {
  const positions: ComputedPositionMap = {};

  // Sort tiers by order ascending
  const sortedTiers = [...tiers].sort((a, b) => a.order - b.order);

  // Group topics by tierId
  const topicsByTier = new Map<string, RawTopic[]>();
  for (const tier of sortedTiers) {
    topicsByTier.set(tier.id, []);
  }

  for (const topic of topics) {
    const list = topicsByTier.get(topic.tierId);
    if (list) {
      list.push(topic);
    } else {
      // Fallback for topic with unknown tier
      const fallbackList = topicsByTier.get("unknown") ?? [];
      fallbackList.push(topic);
      topicsByTier.set("unknown", fallbackList);
    }
  }

  // Calculate layout coordinates
  sortedTiers.forEach((tier, tierIndex) => {
    const tierTopics = topicsByTier.get(tier.id) ?? [];
    const x = tierIndex * GRAPH_CONFIG.tierHorizontalSpacing + 80;

    tierTopics.forEach((topic, topicIndex) => {
      const y = topicIndex * GRAPH_CONFIG.nodeVerticalSpacing + 100;
      positions[topic.id] = { x, y };
    });
  });

  // Handle any orphan/unknown tier topics
  const unknownTopics = topicsByTier.get("unknown") ?? [];
  const orphanX = sortedTiers.length * GRAPH_CONFIG.tierHorizontalSpacing + 80;
  unknownTopics.forEach((topic, topicIndex) => {
    const y = topicIndex * GRAPH_CONFIG.nodeVerticalSpacing + 100;
    positions[topic.id] = { x: orphanX, y };
  });

  return positions;
}
