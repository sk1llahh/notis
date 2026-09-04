"use client";

import React, { useMemo, useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import { TopicNode } from "./nodes/topic-node";
import { TopicEdge } from "./edges/topic-edge";
import { RoadmapNextAction } from "./controls/roadmap-next-action";
import { CourseOptionsMenu } from "./controls/CourseOptionsMenu";
import { RoadmapDrawer } from "./drawer/roadmap-drawer";
import { useRoadmapStore } from "../hooks/use-roadmap-store";
import type { RoadmapGraphDTO, TopicNodePayload } from "../types";
import { Badge, Button } from "@/shared/ui";
import { Filter, Eye, Award } from "lucide-react";

const nodeTypes = {
  topicNode: TopicNode,
};

const edgeTypes = {
  required: TopicEdge,
  recommended: TopicEdge,
};

interface RoadmapCanvasProps {
  initialData: RoadmapGraphDTO;
}

function RoadmapCanvasInner({ initialData }: RoadmapCanvasProps) {
  const focusMode = useRoadmapStore((state) => state.focusMode);
  const toggleFocusMode = useRoadmapStore((state) => state.toggleFocusMode);

  // Stats calculation
  const totalTopics = initialData.nodes.length;
  const completedTopics = useMemo(
    () => initialData.nodes.filter((n) => n.data.status === "COMPLETED").length,
    [initialData.nodes]
  );
  const percentCompleted = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  // Filter nodes based on focusMode
  const filteredNodes = useMemo(() => {
    if (focusMode === "UNLOCKED_ONLY") {
      return initialData.nodes.filter(
        (n) => n.data.status !== "LOCKED" || n.data.isFreePreview
      );
    }
    return initialData.nodes;
  }, [initialData.nodes, focusMode]);

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes]
  );

  const filteredEdges = useMemo(() => {
    return initialData.edges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );
  }, [initialData.edges, filteredNodeIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TopicNodePayload>>(
    filteredNodes as unknown as Node<TopicNodePayload>[]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    filteredEdges as unknown as Edge[]
  );

  // Sync state when focusMode or initialData changes
  React.useEffect(() => {
    setNodes(filteredNodes as unknown as Node<TopicNodePayload>[]);
    setEdges(filteredEdges as unknown as Edge[]);
  }, [filteredNodes, filteredEdges, setNodes, setEdges]);

  // MiniMap node color mapper using design tokens
  const getMiniMapNodeColor = useCallback((node: Node) => {
    const payload = node.data as unknown as TopicNodePayload;
    if (!payload) return "#404659";
    switch (payload.status) {
      case "COMPLETED":
        return "#10b981"; // --color-status-completed
      case "IN_PROGRESS":
        return "#f59e0b"; // --color-status-progress
      case "AVAILABLE":
        return "#0ea5e9"; // --color-status-available
      case "LOCKED":
      default:
        return "#404659"; // --color-status-locked
    }
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-surface-canvas overflow-hidden select-none">
      {/* Top Floating Stats and Control Bar */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-3 p-3.5 rounded-lg bg-surface-card/90 border border-border-subtle backdrop-blur-xl shadow-2xl">
        <div>
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <span>{initialData.course.title}</span>
            <Badge size="sm" variant="outline">
              {initialData.course.learningMode}
            </Badge>
          </h2>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-text-secondary">
            <span className="flex items-center gap-1 font-mono">
              <Award className="w-3.5 h-3.5 text-status-completed" />
              {completedTopics} / {totalTopics} изучено
            </span>
            <div className="w-24 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
              <div
                className="h-full bg-status-completed rounded-full transition-all duration-500"
                style={{ width: `${percentCompleted}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-text-muted">
              {percentCompleted}%
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-border-subtle hidden sm:block" />

        {/* Focus Mode Toggle */}
        <Button
          onClick={toggleFocusMode}
          variant={focusMode === "UNLOCKED_ONLY" ? "primary" : "secondary"}
          size="sm"
          leftIcon={
            focusMode === "UNLOCKED_ONLY" ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <Filter className="w-3.5 h-3.5" />
            )
          }
          title="Скрыть заблокированные темы"
        >
          {focusMode === "UNLOCKED_ONLY" ? "Только открытые" : "Все темы"}
        </Button>

        {/* Course Options (Enrolled Students Only) */}
        {initialData.course.isEnrolled && (
          <CourseOptionsMenu
            courseSlug={initialData.course.slug}
            courseTitle={initialData.course.title}
          />
        )}
      </div>

      {/* React Flow Viewport */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.2}
          color="#1d2230"
        />
        <Controls
          position="bottom-left"
          className="!bg-surface-card !border-border-subtle !text-text-primary !rounded-md overflow-hidden shadow-2xl"
        />
        <MiniMap
          position="top-right"
          nodeColor={getMiniMapNodeColor}
          nodeStrokeWidth={2}
          maskColor="rgba(8, 9, 13, 0.75)"
          className="!bg-surface-card !border-border-subtle !rounded-lg overflow-hidden shadow-2xl"
        />

        {/* Floating Next Action Button */}
        <RoadmapNextAction nodes={initialData.nodes} />
      </ReactFlow>

      {/* Side Topic Details Drawer */}
      <RoadmapDrawer
        nodes={initialData.nodes}
        courseSlug={initialData.course.slug}
      />
    </div>
  );
}

export function RoadmapCanvas(props: RoadmapCanvasProps) {
  return (
    <ReactFlowProvider>
      <RoadmapCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
