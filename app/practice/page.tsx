import { getDueFlashcards, PracticeDeck } from "@/modules/spaced-repetition";
import { getAuthSession } from "@/server/auth";
import { ROUTES } from "@/shared/config";
import { Badge, Button, Card } from "@/shared/ui";
import { BookOpen, CalendarCheck2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Интервальное повторение | Notis",
  description:
    "Тренажер интервальных повторений SuperMemo-2 для долгосрочного закрепления знаний.",
};

interface PracticePageProps {
  searchParams?: Promise<{
    course?: string;
  }>;
}

export default async function PracticePage({
  searchParams,
}: PracticePageProps) {
  const session = await getAuthSession();

  // 1. Auth Guard
  if (!session?.user) {
    redirect(ROUTES.HOME);
  }

  const params = searchParams ? await searchParams : undefined;
  const courseSlug = params?.course;

  // 2. Fetch due flashcards for the current user
  const dueCards = await getDueFlashcards(session.user.id);

  return (
    <main className="w-full min-h-screen bg-surface-canvas text-text-primary flex flex-col items-center">
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

              <Badge size="md" variant="completed" className="mb-3">
                Отличная работа!
              </Badge>

              <h2 className="text-xl font-bold text-text-primary mb-2">
                Все карточки на сегодня повторены!
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed mb-6">
                Завершайте новые темы в каталоге, чтобы добавлять новые карточки
                в колоду.
              </p>

              <div className="flex flex-col gap-2.5 w-full">
                <Link href={ROUTES.COURSES} className="w-full">
                  <Button
                    variant="primary"
                    className="w-full"
                    rightIcon={<BookOpen className="w-4 h-4" />}
                  >
                    Перейти в каталог курсов
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
            <PracticeDeck
              initialCards={dueCards}
              initialCourseFilter={courseSlug}
            />
          </div>
        )}
      </div>
    </main>
  );
}
