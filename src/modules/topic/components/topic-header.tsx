import React from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Sparkles } from "lucide-react";
import { Badge, type BadgeVariant } from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import type { TopicDetailsDTO } from "../types";

interface TopicHeaderProps {
  topic: TopicDetailsDTO;
}

export function TopicHeader({ topic }: TopicHeaderProps) {
  const {
    courseSlug,
    courseTitle,
    title,
    summary,
    difficulty,
    estimatedMinutes,
    tier,
    version,
    progress,
  } = topic;

  const statusVariant: BadgeVariant =
    progress.status === "COMPLETED"
      ? "completed"
      : progress.status === "IN_PROGRESS"
      ? "progress"
      : "outline";

  const statusText =
    progress.status === "COMPLETED"
      ? "Изучено"
      : progress.status === "IN_PROGRESS"
      ? "В процессе"
      : "Новая тема";

  const hasUpdate =
    progress.status === "COMPLETED" &&
    typeof progress.completedVersion === "number" &&
    progress.completedVersion < version;

  return (
    <header className="space-y-5 pb-8 border-b border-border-subtle">
      {/* Back navigation */}
      <nav aria-label="Хлебные крошки">
        <Link
          href={ROUTES.COURSE(courseSlug)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Курс: {courseTitle}</span>
        </Link>
      </nav>

      {/* Badges and metadata */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: tier.badgeColor }}
          />
          {tier.name}
        </Badge>
        <Badge variant="outline">{difficulty}</Badge>
        <Badge variant="default">
          <Clock className="w-3 h-3 text-text-muted" />
          <span>~{estimatedMinutes} мин</span>
        </Badge>
        <Badge variant={statusVariant}>{statusText}</Badge>

        {hasUpdate && (
          <Badge variant="diff">
            <Sparkles className="w-3 h-3" />
            <span>v{version} Обновлено</span>
          </Badge>
        )}
      </div>

      {/* Title & Summary */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight leading-tight">
          {title}
        </h1>
        {summary && (
          <p className="text-base text-text-secondary leading-relaxed max-w-2xl">
            {summary}
          </p>
        )}
      </div>
    </header>
  );
}
