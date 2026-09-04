import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/server/auth";
import {
  getUserProfileData,
  ProfileHeader,
  StreakCard,
  ActivityHeatmap,
  CourseProgressCard,
} from "@/modules/gamification";
import { Card, Button } from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import { ProfileSettingsView } from "./ProfileSettingsView";
import {
  ArrowLeft,
  CheckCircle2,
  Trophy,
  Brain,
  BookOpen,
  GraduationCap,
  Settings,
  BarChart3,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Личный кабинет | Notis",
  description:
    "Геймификация, статистика обучения, ударный режим, прогресс по курсам и настройки аккаунта Notis.",
};

interface ProfilePageProps {
  searchParams: Promise<{
    tab?: string;
  }>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const session = await getAuthSession();

  // 1. Auth Guard
  if (!session?.user) {
    redirect(ROUTES.HOME);
  }

  // 2. Fetch Aggregated Profile Data
  const profileData = await getUserProfileData(session.user.id);

  if (!profileData) {
    redirect(ROUTES.HOME);
  }

  const params = await searchParams;
  const isSettingsTab = params.tab === "settings";

  const { user, stats, activity, courses } = profileData;

  return (
    <main className="w-full min-h-screen bg-surface-canvas text-text-primary flex flex-col">
      {/* Sticky Top Navigation Bar */}
      <header className="w-full border-b border-border-subtle bg-surface-canvas/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={ROUTES.COURSES}
              className="p-1.5 rounded-md hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              title="К каталогу курсов"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-status-available" />
              <h1 className="text-sm sm:text-base font-semibold text-text-primary">
                Личный кабинет
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={ROUTES.PRACTICE}>
              <Button size="sm" variant="ghost" leftIcon={<Brain className="w-4 h-4" />}>
                Тренажер
              </Button>
            </Link>
            <Link href={ROUTES.COURSES}>
              <Button size="sm" variant="secondary" leftIcon={<BookOpen className="w-4 h-4" />}>
                Курсы
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-6xl mx-auto flex-1 p-4 sm:p-8 flex flex-col gap-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-border-subtle pb-px">
          <Link
            href="/profile"
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer ${
              !isSettingsTab
                ? "border-status-available text-text-primary font-semibold"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Статистика и обучение</span>
          </Link>

          <Link
            href="/profile?tab=settings"
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer ${
              isSettingsTab
                ? "border-status-available text-text-primary font-semibold"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Настройки аккаунта</span>
          </Link>
        </div>

        {/* Tab Content */}
        {isSettingsTab ? (
          <div className="pt-2">
            <ProfileSettingsView
              initialName={user.name}
              email={user.email}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* =================================================================
               1. TOP SECTION: Profile Header & Streak Card
               ================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div className="lg:col-span-2">
                <ProfileHeader profile={user} />
              </div>
              <div className="lg:col-span-1">
                <StreakCard
                  streak={user.streak}
                  isStreakActiveToday={user.isStreakActiveToday}
                  isStreakExpiringSoon={user.isStreakExpiringSoon}
                />
              </div>
            </div>

            {/* =================================================================
               2. CENTER SECTION: Quick Stats Summary Cards
               ================================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Completed Topics */}
              <Card variant="default" className="p-5 flex flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-status-completed/10 border border-status-completed/30 flex items-center justify-center text-status-completed shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-text-primary tracking-tight">
                    {stats.completedTopicsCount}
                  </span>
                  <span className="text-xs font-medium text-text-secondary">
                    Завершено тем
                  </span>
                  <span className="text-[11px] text-text-muted mt-0.5">
                    Материалов роадмапов
                  </span>
                </div>
              </Card>

              {/* Passed Quizzes */}
              <Card variant="default" className="p-5 flex flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-status-progress/10 border border-status-progress/30 flex items-center justify-center text-status-progress shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-text-primary tracking-tight">
                    {stats.passedQuizzesCount}
                  </span>
                  <span className="text-xs font-medium text-text-secondary">
                    Пройдено квизов
                  </span>
                  <span className="text-[11px] text-text-muted mt-0.5">
                    Проверок на 100%
                  </span>
                </div>
              </Card>

              {/* Reviewed Flashcards */}
              <Card variant="default" className="p-5 flex flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-status-available/10 border border-status-available/30 flex items-center justify-center text-status-available shrink-0">
                  <Brain className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-text-primary tracking-tight">
                    {stats.reviewedCardsCount}
                  </span>
                  <span className="text-xs font-medium text-text-secondary">
                    Повторено карточек
                  </span>
                  <span className="text-[11px] text-text-muted mt-0.5">
                    Интервальные циклы SM-2
                  </span>
                </div>
              </Card>
            </div>

            {/* =================================================================
               3. ACTIVITY HEATMAP: 90-Day Contribution Grid
               ================================================================= */}
            <ActivityHeatmap activity={activity} />

            {/* =================================================================
               4. BOTTOM SECTION: Enrolled / Started Courses
               ================================================================= */}
            <CourseProgressCard courses={courses} />
          </div>
        )}
      </div>
    </main>
  );
}
