import Link from "next/link";
import { Compass, Home, BookOpen } from "lucide-react";
import { Button } from "@/shared/ui";
import { ROUTES } from "@/shared/config";

export default function NotFound() {
  return (
    <main className="w-full min-h-[calc(100vh-4rem)] bg-surface-canvas text-text-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-xl bg-surface-card border border-border-subtle shadow-2xl text-center flex flex-col items-center animate-in fade-in zoom-in duration-200">
        <div className="w-16 h-16 rounded-full bg-surface-elevated border border-border-strong flex items-center justify-center mb-6 shadow-inner">
          <Compass className="w-8 h-8 text-status-available animate-spin-slow" />
        </div>

        <span className="text-xs font-semibold uppercase tracking-wider text-status-available mb-2 px-2.5 py-1 rounded-full bg-status-available/10 border border-status-available/20">
          Ошибка 404
        </span>

        <h1 className="text-2xl font-bold mb-3 tracking-tight">
          Страница не найдена
        </h1>

        <p className="text-sm text-text-secondary leading-relaxed mb-8">
          Запрашиваемый узел не существует или был перемещен на карте знаний Notis. Проверьте адрес или вернитесь в каталог курсов.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Link href={ROUTES.HOME} className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full justify-center gap-2">
              <Home className="w-4 h-4" />
              На главную
            </Button>
          </Link>
          <Link href={ROUTES.COURSES} className="w-full sm:w-auto">
            <Button variant="primary" className="w-full justify-center gap-2">
              <BookOpen className="w-4 h-4" />
              Каталог курсов
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
