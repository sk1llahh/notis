import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/server/auth";
import { getDueFlashcards, PracticeDeck } from "@/modules/spaced-repetition";
import { Card, Button, Badge } from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import {
  Sparkles,
  BookOpen,
  ArrowLeft,
  GraduationCap,
  CalendarCheck2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Интервальное повторение | Notis",
  description:
    "Тренажер интервальных повторений SuperMemo-2 для долгосрочного закрепления знаний.",
};


export default async function PracticePage() {
  const session = await getAuthSession();

  // 1. Auth Guard
  if (!session?.user) {
    redirect(ROUTES.HOME);
  }

  // 2. Fetch due flashcards for the current user
  const dueCards = await getDueFlashcards(session.user.id);

  return (
    <main className="w-full min-h-screen bg-surface-canvas text-text-primary flex flex-col items-center">
      {/* Top Navigation Bar */}
      <header className="w-full border-b border-border-subtle bg-surface-canvas/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={ROUTES.COURSES}
              className="p-1.5 rounded-md hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              title="Назад к курсам"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-status-available" />
              <h1 className="text-sm sm:text-base font-semibold text-text-primary">
                Интервальное повторение
              </h1>
              <Badge size="sm" variant="available">
                SM-2
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={ROUTES.COURSES}>
              <Button size="sm" variant="ghost">
                Курсы
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        {dueCards.length === 0 ? (
          /* =================================================================
             EMPTY STATE: All cards reviewed
             ================================================================= */
          <div className="w-full max-w-md mx-auto animate-in fade-in zoom-in duration-300">
            <Card variant="elevated" className="p-8 text-center items-center">
              <div className="w-16 h-16 rounded-full bg-status-completed/10 border border-status-completed/30 flex items-center justify-center mb-5 text-status-completed">
                <CalendarCheck2 className="w-8 h-8" />
              </div>

              <Badge size="md" variant="completed" className="mb-2">
                Все темы повторены!
              </Badge>

              <h2 className="text-xl font-bold text-text-primary mb-2">
                Отличная работа
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed mb-6">
                На сегодня нет карточек, требующих повторения по алгоритму SM-2.
                Возвращайтесь позже или изучите новую тему на карте курса!
              </p>

              <div className="flex flex-col gap-2.5 w-full">
                <Link href={ROUTES.COURSES} className="w-full">
                  <Button
                    variant="primary"
                    className="w-full"
                    rightIcon={<BookOpen className="w-4 h-4" />}
                  >
                    Открыть роадмапы курсов
                  </Button>
                </Link>

                <Link href={ROUTES.HOME} className="w-full">
                  <Button variant="secondary" className="w-full">
                    На главную
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        ) : (
          /* =================================================================
             ACTIVE PRACTICE DECK
             ================================================================= */
          <div className="w-full flex flex-col items-center">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-text-primary">
                Тренировка памяти
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Оценивайте честно: это помогает алгоритму рассчитать идеальный
                интервал
              </p>
            </div>

            <PracticeDeck initialCards={dueCards} />
          </div>
        )}
      </div>
    </main>
  );
}
