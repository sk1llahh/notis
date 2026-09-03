"use client";

import React, { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";

export interface TopicEdgeData {
  type: "required" | "recommended";
  isUnlocked: boolean;
  [key: string]: unknown;
}

export type TopicEdgeType = Edge<TopicEdgeData, "topicEdge">;

export const TopicEdge = memo(function TopicEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<TopicEdgeType>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isUnlocked = Boolean(data?.isUnlocked);
  const isRecommended = data?.type === "recommended";

  if (!isUnlocked) {
    // Locked edge: muted dark dashed/solid path using design tokens
    return (
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: "var(--color-border-strong, #2b3247)",
          strokeWidth: isRecommended ? 1.5 : 2,
          strokeDasharray: isRecommended ? "6 6" : undefined,
          opacity: 0.6,
        }}
      />
    );
  }

  // Unlocked edge: energetic glowing path with animated flow dash
  const strokeColor = "var(--color-status-available, #0ea5e9)";

  return (
    <>
      {/* Background glow path */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isRecommended ? 3 : 4}
        strokeOpacity={0.25}
        className="transition-all duration-300"
      />

      {/* Main crisp line */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth: 2,
          strokeDasharray: isRecommended ? "6 6" : undefined,
          filter: "drop-shadow(0 0 6px rgba(14, 165, 233, 0.5))",
        }}
      />

      {/* Animated energetic pulse flowing along the edge using global animate-flow-dash token */}
      <path
        d={edgePath}
        fill="none"
        stroke="var(--color-text-primary, #f3f5fa)"
        strokeWidth={2}
        strokeDasharray="6 14"
        strokeOpacity={0.85}
        className="animate-flow-dash"
      />
    </>
  );
});
