"use client";

import React, { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type OnNodeDrag,
} from "@xyflow/react";
import { TopicNode, TopicEdge, type TopicNodePayload, type TopicDifficulty } from "@/modules/roadmap";
import { StudioTopicDrawer } from "./studio-topic-drawer";
import { CourseSettingsModal } from "./CourseSettingsModal";
import {
  updateNodePositionsAction,
  connectPrerequisiteAction,
  disconnectPrerequisiteAction,
  createTopicAction,
} from "@/server/actions";
import { Badge, Button, Input } from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import {
  Sparkles,
  ExternalLink,
  Check,
  Loader2,
  AlertCircle,
  GitBranch,
  ArrowRight,
  Plus,
  X,
  Settings,
} from "lucide-react";
import type { StudioGraphDTO, SyncStatus, ConnectionType } from "../types";

const nodeTypes = {
  topicNode: TopicNode,
};

const edgeTypes = {
  required: TopicEdge,
  recommended: TopicEdge,
};

interface StudioCanvasProps {
  initialData: StudioGraphDTO;
}

function StudioCanvasInner({ initialData }: StudioCanvasProps) {
  const { course } = initialData;
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TopicNodePayload>>(
    initialData.nodes as unknown as Node<TopicNodePayload>[]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initialData.edges
  );

  const [syncStatus, setSyncStatus] = useState<SyncStatus>("IDLE");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [connectionType, setConnectionType] = useState<ConnectionType>("REQUIRED");
  const [, startTransition] = useTransition();

  const { getViewport } = useReactFlow();

  // Drawer state
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Course settings state
  const [courseTitle, setCourseTitle] = useState(course.title);
  const [courseDescription, setCourseDescription] = useState(course.description ?? "");
  const [coursePublished, setCoursePublished] = useState(course.isPublished ?? false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // New topic modal state
  const [isNewTopicModalOpen, setIsNewTopicModalOpen] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicError, setNewTopicError] = useState<string | null>(null);
  const [isCreatingTopic, startCreatingTopic] = useTransition();

  // Handle topic creation directly on canvas
  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTopicTitle.trim();
    if (!trimmed || trimmed.length < 2) {
      setNewTopicError("Заголовок темы должен содержать не менее 2 символов");
      return;
    }

    startCreatingTopic(async () => {
      setNewTopicError(null);

      // Compute coordinate near center of current view or offset from last node
      let posX = 150;
      let posY = 150;
      try {
        const vp = getViewport();
        if (typeof window !== "undefined" && vp.zoom) {
          posX = Math.round((-vp.x + window.innerWidth / 2) / vp.zoom - 120);
          posY = Math.round((-vp.y + window.innerHeight / 2) / vp.zoom - 55);
        }
      } catch {
        if (nodes.length > 0) {
          const last = nodes[nodes.length - 1];
          posX = Math.round(last.position.x + 280);
          posY = Math.round(last.position.y);
        }
      }

      const res = await createTopicAction({
        courseSlug: course.slug,
        title: trimmed,
        positionX: posX,
        positionY: posY,
      });

      if (!res.success) {
        setNewTopicError(res.error.message || "Не удалось создать тему");
        return;
      }

      const { topic, tier, positionX, positionY } = res.data;

      const newNode: Node<TopicNodePayload> = {
        id: topic.id,
        type: "topicNode",
        position: { x: positionX, y: positionY },
        data: {
          slug: topic.slug,
          title: topic.title,
          difficulty: topic.difficulty as TopicDifficulty,
          status: "AVAILABLE",
          isFreePreview: topic.isFreePreview,
          tier: {
            id: tier.id,
            slug: tier.slug,
            title: tier.title,
            badgeColor: tier.badgeColor,
            order: tier.order,
          },
          progress: {
            completedVersion: null,
            currentVersion: topic.version,
            hasUpdate: false,
          },
        },
      };

      setNodes((current) => [...current, newNode]);
      setIsNewTopicModalOpen(false);
      setNewTopicTitle("");
      setSyncStatus("SAVED");
      setStatusMessage("Тема создана");
      setTimeout(() => {
        setSyncStatus((cur) => (cur === "SAVED" ? "IDLE" : cur));
        setStatusMessage("");
      }, 2500);

      // Open drawer immediately for newly created topic
      setSelectedTopicId(topic.id);
      setIsDrawerOpen(true);
    });
  };

  // Handle topic deletion from drawer to reactively remove node & edges without reload
  const handleTopicDeleted = useCallback(
    (deletedTopicId: string) => {
      setNodes((currentNodes) =>
        currentNodes.filter((n) => n.id !== deletedTopicId)
      );
      setEdges((currentEdges) =>
        currentEdges.filter(
          (e) => e.source !== deletedTopicId && e.target !== deletedTopicId
        )
      );
      setSelectedTopicId(null);
      setSyncStatus("SAVED");
      setStatusMessage("Тема удалена");
      setTimeout(() => {
        setSyncStatus((cur) => (cur === "SAVED" ? "IDLE" : cur));
        setStatusMessage("");
      }, 2000);
    },
    [setNodes, setEdges]
  );

  // Handle node click to open topic editing drawer
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedTopicId(node.id);
    setIsDrawerOpen(true);
  }, []);

  // Handle topic update from drawer to reactively update node state without reload
  const handleTopicUpdated = useCallback(
    (updated: {
      id: string;
      title: string;
      difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
      isPublished: boolean;
      version: number;
    }) => {
      setNodes((currentNodes) =>
        currentNodes.map((n) => {
          if (n.id === updated.id) {
            return {
              ...n,
              data: {
                ...n.data,
                title: updated.title,
                difficulty: updated.difficulty,
                progress: {
                  ...n.data.progress,
                  currentVersion: updated.version,
                },
              },
            };
          }
          return n;
        })
      );
    },
    [setNodes]
  );

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

  // 1. Drag & Drop layout persistence
  const onNodeDragStop: OnNodeDrag<Node<TopicNodePayload>> = useCallback(
    (_event, node) => {
      startTransition(async () => {
        setSyncStatus("SYNCING");
        setStatusMessage("Синхронизация...");

        const result = await updateNodePositionsAction({
          courseSlug: course.slug,
          positions: {
            [node.id]: {
              x: Math.round(node.position.x),
              y: Math.round(node.position.y),
            },
          },
        });

        if (result.success) {
          setSyncStatus("SAVED");
          setStatusMessage("Сохранено");
          setTimeout(() => {
            setSyncStatus((cur) => (cur === "SAVED" ? "IDLE" : cur));
            setStatusMessage("");
          }, 2000);
        } else {
          setSyncStatus("ERROR");
          setStatusMessage(result.error?.message ?? "Ошибка сохранения");
        }
      });
    },
    [course.slug]
  );

  // 2. Cursor connection interceptor (source -> target)
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;

      startTransition(async () => {
        setSyncStatus("SYNCING");
        setStatusMessage("Создание связи...");

        // connection.source is the prerequisite, connection.target is the dependent topic
        const result = await connectPrerequisiteAction({
          courseSlug: course.slug,
          topicId: connection.target,
          prerequisiteId: connection.source,
          type: connectionType,
        });

        if (result.success) {
          const edgeId = `${connection.source}->${connection.target}`;
          const isReq = connectionType === "REQUIRED";
          const newEdge: Edge = {
            id: edgeId,
            source: connection.source,
            target: connection.target,
            type: isReq ? "required" : "recommended",
            data: {
              type: isReq ? "required" : "recommended",
              isUnlocked: true,
            },
          };

          setEdges((eds) => addEdge(newEdge, eds));
          setSyncStatus("SAVED");
          setStatusMessage("Связь добавлена");
          setTimeout(() => {
            setSyncStatus((cur) => (cur === "SAVED" ? "IDLE" : cur));
            setStatusMessage("");
          }, 2000);
        } else {
          setSyncStatus("ERROR");
          setStatusMessage(result.error?.message ?? "Не удалось создать связь");
        }
      });
    },
    [course.slug, connectionType, setEdges]
  );

  // 3. Edge deletion interceptor
  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      startTransition(async () => {
        setSyncStatus("SYNCING");
        setStatusMessage("Удаление связи...");

        let hasError = false;
        let lastErrorMessage = "";

        for (const edge of deletedEdges) {
          if (!edge.source || !edge.target) continue;
          const result = await disconnectPrerequisiteAction({
            courseSlug: course.slug,
            topicId: edge.target,
            prerequisiteId: edge.source,
          });

          if (!result.success) {
            hasError = true;
            lastErrorMessage = result.error?.message ?? "Ошибка удаления";
          }
        }

        if (hasError) {
          setSyncStatus("ERROR");
          setStatusMessage(lastErrorMessage);
        } else {
          setSyncStatus("SAVED");
          setStatusMessage("Связь удалена");
          setTimeout(() => {
            setSyncStatus((cur) => (cur === "SAVED" ? "IDLE" : cur));
            setStatusMessage("");
          }, 2000);
        }
      });
    },
    [course.slug]
  );

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-surface-canvas overflow-hidden select-none">
      {/* Top Floating Studio Toolbar */}
      <div className="absolute top-4 left-4 right-4 sm:right-auto z-10 flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg bg-surface-card/90 border border-border-subtle backdrop-blur-xl shadow-2xl">
        {/* Left segment: Title & Studio Badge */}
        <div className="flex items-center gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-text-primary tracking-tight">
                {courseTitle}
              </h2>
              <Badge size="sm" variant="available">
                <Sparkles className="w-3 h-3 mr-1" />
                Авторская студия
              </Badge>
              <Badge
                size="sm"
                variant={coursePublished ? "completed" : "locked"}
                className="cursor-pointer"
                onClick={() => setIsSettingsModalOpen(true)}
                title="Нажмите для настройки публикации"
              >
                {coursePublished ? "Опубликован" : "Черновик курса"}
              </Badge>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              Перетаскивайте темы и соединяйте точки для построения графа
            </p>
          </div>
        </div>

        <div className="h-6 w-px bg-border-subtle hidden md:block" />

        {/* Center segment: Connection Type Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-md bg-surface-elevated border border-border-subtle">
          <span className="text-[11px] font-medium text-text-secondary px-2">
            Тип связи:
          </span>
          <button
            type="button"
            onClick={() => setConnectionType("REQUIRED")}
            className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all duration-150 flex items-center gap-1 cursor-pointer ${
              connectionType === "REQUIRED"
                ? "bg-surface-canvas text-status-available border border-border-strong shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <ArrowRight className="w-3 h-3" />
            Строгая
          </button>
          <button
            type="button"
            onClick={() => setConnectionType("RECOMMENDED")}
            className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all duration-150 flex items-center gap-1 cursor-pointer ${
              connectionType === "RECOMMENDED"
                ? "bg-surface-canvas text-status-progress border border-border-strong shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <GitBranch className="w-3 h-3" />
            Совет
          </button>
        </div>

        <div className="h-6 w-px bg-border-subtle hidden md:block" />

        {/* Right segment: Sync status indicator & Student Mode Link */}
        <div className="flex items-center gap-3">
          {/* Real-time sync status indicator */}
          <div className="flex items-center gap-1.5 text-xs font-mono min-w-[110px]">
            {syncStatus === "SYNCING" && (
              <span className="flex items-center gap-1.5 text-status-progress">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{statusMessage || "Синхронизация..."}</span>
              </span>
            )}
            {syncStatus === "SAVED" && (
              <span className="flex items-center gap-1.5 text-status-completed">
                <Check className="w-3.5 h-3.5" />
                <span>{statusMessage || "Сохранено"}</span>
              </span>
            )}
            {syncStatus === "ERROR" && (
              <span className="flex items-center gap-1.5 text-red-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="truncate max-w-[180px]">
                  {statusMessage || "Ошибка"}
                </span>
              </span>
            )}
            {syncStatus === "IDLE" && (
              <span className="text-text-muted text-[11px]">Готово</span>
            )}
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setNewTopicTitle("");
              setNewTopicError(null);
              setIsNewTopicModalOpen(true);
            }}
          >
            Новая тема
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Settings className="w-3.5 h-3.5" />}
            onClick={() => setIsSettingsModalOpen(true)}
            title="Настройки курса"
          >
            Настройки
          </Button>

          <Link href={ROUTES.COURSE(course.slug)}>
            <Button
              variant="secondary"
              size="sm"
              rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
              title="Перейти к просмотру курса в режиме студента"
            >
              Режим студента
            </Button>
          </Link>
        </div>
      </div>

      {/* Interactive React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
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
      </ReactFlow>

      {/* Modal for creating a new topic directly on canvas */}
      {isNewTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => !isCreatingTopic && setIsNewTopicModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-md rounded-xl border border-border-subtle bg-surface-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-status-available/10 border border-status-available/30 flex items-center justify-center text-status-available">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    Добавить тему на холст
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Новая тема появится в центре холста
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isCreatingTopic && setIsNewTopicModalOpen(false)}
                className="p-1 text-text-muted hover:text-text-primary rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {newTopicError && (
              <div className="mt-3 p-2.5 rounded bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{newTopicError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTopic} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-secondary block">
                  Название темы <span className="text-red-400">*</span>
                </label>
                <Input
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  placeholder="например, Деревья поиска и AVL"
                  disabled={isCreatingTopic}
                  autoFocus
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border-subtle">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNewTopicModalOpen(false)}
                  disabled={isCreatingTopic}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isCreatingTopic}
                  disabled={isCreatingTopic || !newTopicTitle.trim()}
                >
                  Создать тему
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Side Topic Editing Drawer */}
      <StudioTopicDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        courseSlug={course.slug}
        topicId={selectedTopicId}
        onTopicUpdated={handleTopicUpdated}
        onTopicDeleted={handleTopicDeleted}
      />

      {/* Course Settings Modal */}
      <CourseSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        course={{
          ...course,
          title: courseTitle,
          description: courseDescription,
          isPublished: coursePublished,
        }}
        onCourseUpdated={({ title, description, isPublished }) => {
          setCourseTitle(title);
          setCourseDescription(description);
          setCoursePublished(isPublished);
        }}
      />
    </div>
  );

}

export function StudioCanvas(props: StudioCanvasProps) {
  return (
    <ReactFlowProvider>
      <StudioCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
