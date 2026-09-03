"use client";

import React, { useMemo } from "react";
import { useReactFlow, type Node } from "@xyflow/react";
import { ArrowRight, Compass, Flame, Trophy } from "lucide-react";
import { Button, Badge } from "@/shared/ui";
import { useRoadmapStore } from "../../hooks/use-roadmap-store";
import type { TopicNodePayload } from "../../types";

interface RoadmapNextActionProps {
  nodes: Node<TopicNodePayload>[];
}

export function RoadmapNextAction({ nodes }: RoadmapNextActionProps) {
  const { setCenter } = useReactFlow();
  const selectTopic = useRoadmapStore((state) => state.selectTopic);

  // Find the next active or available node
  const nextNode = useMemo(() => {
    // 1. Priority to topic in progress
    const inProgress = nodes.find((n) => n.data.status === "IN_PROGRESS");
    if (inProgress) return inProgress;

    // 2. Priority to first available topic
    const available = nodes.find((n) => n.data.status === "AVAILABLE");
    if (available) return available;

    return null;
  }, [nodes]);

  const allCompleted = useMemo(() => {
    return nodes.length > 0 && nodes.every((n) => n.data.status === "COMPLETED");
  }, [nodes]);

  const handleNavigate = () => {
    if (!nextNode) return;

    // Center viewport on this node with smooth animation
    setCenter(nextNode.position.x + 130, nextNode.position.y + 45, {
      zoom: 1.15,
      duration: 800,
    });

    selectTopic(nextNode.id);
  };

  if (allCompleted) {
    return (
      <aside
        aria-label="Курс завершен"
        className="absolute bottom-6 right-6 z-10 flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-card/95 border border-status-completed/40 backdrop-blur-xl shadow-2xl"
      >
        <div className="p-2 rounded-sm bg-status-completed/10 text-status-completed border border-status-completed/20">
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h5 className="text-xs font-semibold text-text-primary">
              Курс полностью пройден!
            </h5>
            <Badge size="sm" variant="completed">
              100%
            </Badge>
          </div>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Переходите к интервальному повторению SM-2
          </p>
        </div>
      </aside>
    );
  }

  if (!nextNode) return null;

  const isOngoing = nextNode.data.status === "IN_PROGRESS";

  return (
    <aside
      aria-label="Рекомендуемое следующее действие"
      className="absolute bottom-6 right-6 z-10 flex items-center gap-4 p-3.5 pl-4 rounded-lg bg-surface-card/95 border border-border-subtle backdrop-blur-xl shadow-2xl hover:border-border-focus transition-all duration-200 max-w-sm"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`p-2.5 rounded-sm shrink-0 border ${
            isOngoing
              ? "bg-status-progress/10 text-status-progress border-status-progress/30"
              : "bg-status-available/10 text-status-available border-status-available/30"
          }`}
        >
          {isOngoing ? (
            <Flame className="w-5 h-5 animate-pulse" />
          ) : (
            <Compass className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            {isOngoing ? "Продолжить тему" : "Следующий шаг"}
          </span>
          <h5 className="text-sm font-semibold text-text-primary truncate">
            {nextNode.data.title}
          </h5>
        </div>
      </div>

      <Button
        variant="primary"
        size="sm"
        onClick={handleNavigate}
        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
      >
        К теме
      </Button>
    </aside>
  );
}
