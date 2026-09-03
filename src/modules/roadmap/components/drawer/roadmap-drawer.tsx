"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Lock,
  CheckCircle2,
  Zap,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  Drawer,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  type BadgeVariant,
} from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import { useRoadmapStore } from "../../hooks/use-roadmap-store";
import type { RoadmapNodeDTO } from "../../types";

interface RoadmapDrawerProps {
  nodes: RoadmapNodeDTO[];
  courseSlug: string;
}

export function RoadmapDrawer({ nodes, courseSlug }: RoadmapDrawerProps) {
  const selectedTopicId = useRoadmapStore((state) => state.selectedTopicId);
  const isDrawerOpen = useRoadmapStore((state) => state.isDrawerOpen);
  const closeDrawer = useRoadmapStore((state) => state.closeDrawer);

  const selectedNode = useMemo(() => {
    if (!selectedTopicId) return null;
    return (
      nodes.find(
        (n) => n.id === selectedTopicId || n.data.slug === selectedTopicId
      ) ?? null
    );
  }, [nodes, selectedTopicId]);

  if (!selectedNode) {
    return null;
  }

  const { title, slug, status, difficulty, tier, isFreePreview, progress } =
    selectedNode.data;

  const statusBadgeVariant: BadgeVariant =
    status === "COMPLETED"
      ? "completed"
      : status === "AVAILABLE"
      ? "available"
      : status === "IN_PROGRESS"
      ? "progress"
      : "locked";

  const statusLabel =
    status === "COMPLETED"
      ? "Изучено"
      : status === "AVAILABLE"
      ? "Доступно"
      : status === "IN_PROGRESS"
      ? "В процессе"
      : "Заблокировано";

  const drawerFooter = (
    <div>
      {status === "LOCKED" && !isFreePreview ? (
        <Button
          disabled
          variant="secondary"
          size="lg"
          className="w-full"
          leftIcon={<Lock className="w-4 h-4" />}
        >
          Требуются пререквизиты
        </Button>
      ) : (
        <Link href={ROUTES.TOPIC(courseSlug, slug)} className="block w-full">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            leftIcon={
              status === "COMPLETED" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : status === "IN_PROGRESS" ? (
                <Zap className="w-4 h-4" />
              ) : (
                <BookOpen className="w-4 h-4" />
              )
            }
            rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
          >
            {status === "COMPLETED"
              ? "Повторить материал"
              : status === "IN_PROGRESS"
              ? "Продолжить изучение"
              : "Начать изучение"}
          </Button>
        </Link>
      )}
    </div>
  );

  return (
    <Drawer
      isOpen={isDrawerOpen}
      onClose={closeDrawer}
      title={title}
      description={`${tier.title} • Уровень ${tier.order}`}
      footer={drawerFooter}
    >
      <div className="space-y-6">
        {/* Badges bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusBadgeVariant}>{statusLabel}</Badge>
          <Badge variant="outline">{difficulty}</Badge>
          {isFreePreview && <Badge variant="available">Демо-доступ</Badge>}
        </div>

        {/* Update Notification Card */}
        {progress.hasUpdate && (
          <Card variant="elevated" className="border-status-diff/40 bg-status-diff/10">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm text-status-diff flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Доступна версия v{progress.currentVersion}</span>
              </CardTitle>
            </CardHeader>
            <CardDescription className="text-text-secondary text-xs">
              Материал темы был обновлен. Рекомендуем пройти тему повторно для
              актуализации знаний.
            </CardDescription>
          </Card>
        )}

        {/* Locked Fog of War Explanation */}
        {status === "LOCKED" && !isFreePreview && (
          <Card variant="default" className="border-border-subtle bg-surface-card">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm text-status-progress flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                <span>Тема скрыта туманом войны (Fog of War)</span>
              </CardTitle>
            </CardHeader>
            <CardDescription className="text-text-secondary text-xs">
              Для открытия этого узла необходимо завершить все обязательные
              предшествующие темы в графе курса.
            </CardDescription>
          </Card>
        )}

        {/* Free Preview Explanation */}
        {isFreePreview && status === "LOCKED" && (
          <Card variant="default" className="border-status-available/30 bg-status-available/10">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm text-status-available flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Бесплатный предпросмотр</span>
              </CardTitle>
            </CardHeader>
            <CardDescription className="text-text-secondary text-xs">
              Вы можете ознакомиться с этой темой прямо сейчас, даже если
              пререквизиты еще не пройдены.
            </CardDescription>
          </Card>
        )}

        {/* Progress details */}
        <Card variant="default">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-text-muted">
              Параметры темы
            </CardTitle>
          </CardHeader>
          <div className="space-y-2 text-xs text-text-secondary pt-1">
            <div className="flex justify-between">
              <span>Идентификатор темы:</span>
              <span className="font-mono text-text-primary">{slug}</span>
            </div>
            <div className="flex justify-between">
              <span>Текущая версия материала:</span>
              <span className="font-mono text-text-primary">v{progress.currentVersion}</span>
            </div>
            <div className="flex justify-between">
              <span>Уровень роадмапа:</span>
              <span className="text-text-primary">{tier.title}</span>
            </div>
          </div>
        </Card>
      </div>
    </Drawer>
  );
}
