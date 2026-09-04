"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
} from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import { enrollCourseAction } from "@/server/actions";
import type { CourseCardDTO, CourseDifficulty } from "../../services/course-catalog-service";
import {
  Clock,
  BookOpen,
  User,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export interface CourseCardProps {
  course: CourseCardDTO;
}

function getDifficultyBadge(difficulty: CourseDifficulty): {
  label: string;
  variant: "available" | "progress" | "diff" | "default";
} {
  switch (difficulty) {
    case "BEGINNER":
      return { label: "Начинающий", variant: "available" };
    case "INTERMEDIATE":
      return { label: "Средний", variant: "progress" };
    case "ADVANCED":
      return { label: "Продвинутый", variant: "diff" };
    case "EXPERT":
      return { label: "Эксперт", variant: "default" };
    default:
      return { label: "Общий", variant: "default" };
  }
}

export function CourseCard({ course }: CourseCardProps) {
  const router = useRouter();
  const [isEnrolling, setIsEnrolling] = useState(false);

  const diffInfo = getDifficultyBadge(course.difficulty);
  const isFullyCompleted = course.progressPercent === 100;

  const handleEnroll = async () => {
    try {
      setIsEnrolling(true);
      const res = await enrollCourseAction({ courseSlug: course.slug });
      if (res.success) {
        router.push(ROUTES.COURSE(course.slug));
        router.refresh();
      } else {
        // If unauthorized, redirect to login with return URL
        if (res.error?.code === "UNAUTHORIZED") {
          router.push(
            `${ROUTES.LOGIN}?callbackUrl=${encodeURIComponent(
              ROUTES.COURSE(course.slug)
            )}`
          );
        } else {
          router.push(ROUTES.COURSE(course.slug));
        }
      }
    } catch {
      router.push(ROUTES.COURSE(course.slug));
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <Card
      variant="interactive"
      className="p-5 flex flex-col justify-between h-full group hover:border-border-focus transition-all duration-200"
    >
      <div className="flex flex-col gap-3.5">
        {/* Top Header: Difficulty & Duration */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant={diffInfo.variant} size="sm">
            {diffInfo.label}
          </Badge>

          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Clock className="w-3.5 h-3.5" />
            <span>~{course.estimatedHours} ч.</span>
          </div>
        </div>

        {/* Title & Description */}
        <div className="flex flex-col gap-1.5">
          <Link href={ROUTES.COURSE(course.slug)}>
            <CardTitle className="text-base font-bold text-text-primary group-hover:text-status-available transition-colors line-clamp-1">
              {course.title}
            </CardTitle>
          </Link>
          <CardDescription className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
            {course.description || "Интерактивный граф знаний и практических тем."}
          </CardDescription>
        </div>

        {/* Tags */}
        {course.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {course.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={`${tag}-${idx}`}
                className="text-[10px] py-0.5 px-2 rounded-xs bg-surface-elevated/80 border border-border-subtle text-text-muted font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Progress Bar (Visible if user is enrolled) */}
        {course.isEnrolled && (
          <div className="flex flex-col gap-1 pt-2 border-t border-border-subtle/60">
            <div className="flex items-center justify-between text-[11px] text-text-muted">
              <span>Прогресс</span>
              <span className="font-semibold text-text-secondary">
                {course.progressPercent}%
              </span>
            </div>
            <div
              className="w-full h-1.5 rounded-full bg-surface-elevated border border-border-subtle/80 overflow-hidden"
              role="progressbar"
              aria-valuenow={course.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isFullyCompleted
                    ? "bg-status-completed"
                    : "bg-gradient-to-r from-status-available to-status-progress"
                }`}
                style={{ width: `${course.progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer: Topics, Author & Action Button */}
      <CardFooter className="p-0 pt-4 mt-4 flex items-center justify-between border-t border-border-subtle">
        <div className="flex flex-col text-[11px] text-text-muted leading-tight">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-status-available" />
            {course.topicsCount} тем
          </span>
          <span className="flex items-center gap-1 mt-0.5 truncate max-w-[120px] sm:max-w-[140px]">
            <User className="w-3 h-3 text-text-muted" />
            {course.authorName}
          </span>
        </div>

        {course.isEnrolled ? (
          <Link href={ROUTES.COURSE(course.slug)}>
            <Button
              size="sm"
              variant={isFullyCompleted ? "secondary" : "primary"}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              {isFullyCompleted ? "Повторить" : "Продолжить"}
            </Button>
          </Link>
        ) : (
          <Button
            size="sm"
            variant="primary"
            isLoading={isEnrolling}
            onClick={handleEnroll}
            rightIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Начать курс
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
