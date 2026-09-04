import React from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
} from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import type { EnrolledCourseProgressDTO } from "../types";
import { BookOpen, Compass, ArrowRight, CheckCircle2 } from "lucide-react";

export interface CourseProgressCardProps {
  courses: EnrolledCourseProgressDTO[];
}

export function CourseProgressCard({ courses }: CourseProgressCardProps) {
  if (courses.length === 0) {
    return (
      <Card variant="default" className="p-8 text-center items-center">
        <div className="w-14 h-14 rounded-full bg-status-available/10 border border-status-available/30 flex items-center justify-center mb-4 text-status-available">
          <Compass className="w-7 h-7" />
        </div>

        <h3 className="text-base font-semibold text-text-primary mb-1">
          Курсы пока не начаты
        </h3>
        <p className="text-xs text-text-secondary max-w-md mb-5 leading-relaxed">
          Выберите подходящий роадмап в каталоге курсов, чтобы приступить к
          интерактивному обучению и прокачке навыков.
        </p>

        <Link href={ROUTES.COURSES}>
          <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Каталог курсов
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card variant="default" className="p-5">
      <CardHeader className="p-0 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-status-available" />
            <CardTitle className="text-base font-semibold">
              Текущие курсы
            </CardTitle>
          </div>
          <span className="text-xs text-text-muted">
            {courses.length}{" "}
            {courses.length === 1 ? "курс" : courses.length < 5 ? "курса" : "курсов"}
          </span>
        </div>
        <CardDescription className="text-xs text-text-muted mt-1">
          Отслеживайте прогресс изучения роадмапов и продолжайте обучение
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 flex flex-col gap-3">
        {courses.map((course) => {
          const isCompleted = course.progressPercent === 100;
          const isStarted = course.completedTopics > 0;

          return (
            <div
              key={course.id}
              className="p-4 rounded-xl bg-surface-elevated/60 border border-border-subtle hover:border-border-strong transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="text-sm font-semibold text-text-primary truncate">
                    {course.title}
                  </h4>
                  {isCompleted ? (
                    <Badge variant="completed" size="sm">
                      <CheckCircle2 className="w-3 h-3" />
                      Завершен
                    </Badge>
                  ) : isStarted ? (
                    <Badge variant="progress" size="sm">
                      В процессе
                    </Badge>
                  ) : (
                    <Badge variant="default" size="sm">
                      Не начат
                    </Badge>
                  )}
                </div>

                {/* Progress Bar and Counts */}
                <div className="flex flex-col gap-1.5 max-w-md">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>
                      {course.completedTopics} из {course.totalTopics} тем завершено
                    </span>
                    <span className="font-semibold text-text-secondary">
                      {course.progressPercent}%
                    </span>
                  </div>
                  <div
                    className="w-full h-2 rounded-full bg-surface-card border border-border-subtle overflow-hidden"
                    role="progressbar"
                    aria-valuenow={course.progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? "bg-status-completed"
                          : "bg-gradient-to-r from-status-progress to-status-available"
                      }`}
                      style={{ width: `${course.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Link */}
              <div className="shrink-0 flex items-center">
                <Link href={ROUTES.COURSE(course.slug)}>
                  <Button
                    size="sm"
                    variant={isCompleted ? "secondary" : "primary"}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    {isCompleted ? "Повторить карту" : "Продолжить"}
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
