import React, { Suspense } from "react";
import Link from "next/link";
import { getAuthSession } from "@/server/auth";
import {
  getCatalogCourses,
  CourseCard,
  CourseCatalogFilter,
} from "@/modules/roadmap";
import { Card, Button, Badge } from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import { CreateCourseModal } from "./CreateCourseModal";
import { Compass, SearchX } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Каталог курсов | Notis",
  description:
    "Структурированные интерактивные роадмапы курсов, прокачка навыков и интервальное повторение.",
};

interface CoursesPageProps {
  searchParams: Promise<{
    q?: string;
    difficulty?: string;
  }>;
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const session = await getAuthSession();
  const params = await searchParams;

  const courses = await getCatalogCourses({
    userId: session?.user?.id,
    query: params.q,
    difficulty: params.difficulty,
  });

  const canCreateCourse =
    session?.user?.role === "ADMIN" || session?.user?.role === "AUTHOR";

  return (
    <main className="w-full min-h-screen bg-surface-canvas text-text-primary flex flex-col">
      {/* Main Catalog Content */}
      <div className="w-full max-w-6xl mx-auto flex-1 p-4 sm:p-8 flex flex-col gap-8">
        {/* Hero Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <Badge variant="available" size="sm">
                <Compass className="w-3 h-3" />
                Интерактивные Роадмапы
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
              Каталог курсов
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
              Изучайте фундаментальные концепции разработки через интерактивные
              графы знаний. Прогресс открывается шаг за шагом по механике Fog of
              War.
            </p>
          </div>

          {canCreateCourse && (
            <div className="shrink-0">
              <CreateCourseModal />
            </div>
          )}
        </div>

        {/* Filter & Search Bar */}
        <Suspense fallback={<div className="h-24 w-full rounded-xl bg-surface-card animate-pulse" />}>
          <CourseCatalogFilter />
        </Suspense>

        {/* Courses Grid or Empty State */}
        {courses.length === 0 ? (
          <div className="w-full max-w-md mx-auto py-12 animate-in fade-in zoom-in-95 duration-200">
            <Card variant="default" className="p-8 text-center items-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-border-subtle flex items-center justify-center mb-4 text-text-muted">
                <SearchX className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1">
                Курсы не найдены
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed mb-5">
                По вашему запросу не найдено ни одного опубликованного курса.
                Попробуйте изменить поисковую фразу или выбрать другой уровень
                сложности.
              </p>
              <Link href={ROUTES.COURSES}>
                <Button variant="secondary" size="sm">
                  Сбросить фильтры
                </Button>
              </Link>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
