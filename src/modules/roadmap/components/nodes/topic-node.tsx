"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
  Lock,
  CheckCircle2,
  Zap,
  Sparkles,
  Compass,
  Eye,
} from "lucide-react";
import { Badge, type BadgeVariant } from "@/shared/ui";
import { useRoadmapStore } from "../../hooks/use-roadmap-store";
import type { TopicNodePayload } from "../../types";

export type TopicNodeType = Node<TopicNodePayload, "topicNode">;

export const TopicNode = memo(function TopicNode({
  id,
  data,
  selected,
}: NodeProps<TopicNodeType>) {
  const selectTopic = useRoadmapStore((state) => state.selectTopic);
  const selectedTopicId = useRoadmapStore((state) => state.selectedTopicId);
  const isSelected = selected || selectedTopicId === id || selectedTopicId === data.slug;

  const { status, title, difficulty, tier, isFreePreview, progress } = data;

  const handleClick = () => {
    selectTopic(id);
  };

  // Status visual variants adhering to design tokens
  const statusConfig = {
    LOCKED: {
      container: "border-border-subtle opacity-70 cursor-not-allowed",
      icon: isFreePreview ? (
        <Eye className="w-4 h-4 text-status-available shrink-0" />
      ) : (
        <Lock className="w-4 h-4 text-status-locked shrink-0" />
      ),
      badgeVariant: "locked" as BadgeVariant,
      badgeText: isFreePreview ? "Демо-доступ" : "Закрыто",
      accentBar: "bg-status-locked/50",
    },
    AVAILABLE: {
      container:
        "border-status-available/50 hover:border-status-available hover:shadow-[0_0_20px_rgba(14,165,233,0.15)]",
      icon: <Compass className="w-4 h-4 text-status-available shrink-0" />,
      badgeVariant: "available" as BadgeVariant,
      badgeText: "Доступно",
      accentBar: "bg-status-available",
    },
    IN_PROGRESS: {
      container:
        "border-status-progress/60 hover:border-status-progress hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]",
      icon: <Zap className="w-4 h-4 text-status-progress shrink-0" />,
      badgeVariant: "progress" as BadgeVariant,
      badgeText: "В процессе",
      accentBar: "bg-status-progress",
    },
    COMPLETED: {
      container:
        "border-status-completed/60 hover:border-status-completed hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]",
      icon: <CheckCircle2 className="w-4 h-4 text-status-completed shrink-0" />,
      badgeVariant: "completed" as BadgeVariant,
      badgeText: "Изучено",
      accentBar: "bg-status-completed",
    },
  }[status];

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      className={`relative w-[260px] rounded-lg bg-surface-card border p-3.5 backdrop-blur-md transition-all duration-200 select-none group text-left ${
        statusConfig.container
      } ${
        isSelected
          ? "ring-2 ring-border-focus border-border-focus shadow-lg"
          : ""
      }`}
    >
      {/* Contact handles for graph edges with design tokens */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !-left-1.5 !border-2 !border-border-strong !bg-surface-elevated transition-colors group-hover:!border-border-focus"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !-right-1.5 !border-2 !border-border-strong !bg-surface-elevated transition-colors group-hover:!border-border-focus"
      />

      {/* Top row: Tier Badge & Status / Update Badges */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: tier.badgeColor }}
          />
          <span className="text-[11px] font-medium tracking-wide uppercase text-text-muted truncate">
            {tier.title}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {progress.hasUpdate && (
            <Badge size="sm" variant="diff">
              <Sparkles className="w-2.5 h-2.5" />
              v{progress.currentVersion} Обновлено
            </Badge>
          )}
          {isFreePreview && status === "LOCKED" ? (
            <Badge size="sm" variant="outline">
              <Eye className="w-2.5 h-2.5 text-status-available" />
              Демо
            </Badge>
          ) : (
            <Badge size="sm" variant={statusConfig.badgeVariant}>
              {statusConfig.badgeText}
            </Badge>
          )}
        </div>
      </div>

      {/* Middle row: Icon and Title */}
      <div className="flex items-start gap-2.5 mb-2.5">
        <div className="p-1 rounded-sm bg-surface-elevated border border-border-subtle shrink-0">
          {statusConfig.icon}
        </div>
        <h4 className="text-sm font-semibold leading-snug line-clamp-2 text-text-primary group-hover:text-white transition-colors">
          {title}
        </h4>
      </div>

      {/* Bottom row: Difficulty & Status Info */}
      <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-[11px]">
        <Badge size="sm" variant="outline">
          {difficulty}
        </Badge>
        <span className="text-[10px] text-text-muted font-mono">
          {status === "COMPLETED" ? "100%" : status === "IN_PROGRESS" ? "Изучается" : ""}
        </span>
      </div>

      {/* Indicator accent line at the bottom */}
      <div
        className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-full ${statusConfig.accentBar}`}
      />
    </div>
  );
});
