"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/shared/ui";
import { ROUTES } from "@/shared/config";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log unexpected errors for client-side diagnostics
    console.error("[Notis Global Error Boundary]:", error);
  }, [error]);

  return (
    <main className="w-full min-h-[calc(100vh-4rem)] bg-surface-canvas text-text-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-xl bg-surface-card border border-border-subtle shadow-2xl text-center flex flex-col items-center animate-in fade-in zoom-in duration-200">
        <div className="w-16 h-16 rounded-full bg-status-diff/10 border border-status-diff/30 flex items-center justify-center mb-6 shadow-inner">
          <AlertTriangle className="w-8 h-8 text-status-diff animate-pulse-subtle" />
        </div>

        <span className="text-xs font-semibold uppercase tracking-wider text-status-diff mb-2 px-2.5 py-1 rounded-full bg-status-diff/10 border border-status-diff/20">
          Сбой приложения
        </span>

        <h1 className="text-2xl font-bold mb-3 tracking-tight">
          Что-то пошло не так
        </h1>

        <p className="text-sm text-text-secondary leading-relaxed mb-6">
          Произошла непредвиденная ошибка при рендеринге узла. Попробуйте повторить запрос или вернуться на главную страницу.
        </p>

        {error?.digest && (
          <div className="mb-6 px-3 py-1.5 rounded bg-surface-elevated border border-border-subtle text-xs font-mono text-text-muted">
            Код сбоя: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Button
            variant="primary"
            onClick={() => reset()}
            className="w-full sm:w-auto justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Повторить попытку
          </Button>

          <Link href={ROUTES.HOME} className="w-full sm:w-auto">
            <Button
              variant="secondary"
              className="w-full justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              На главную
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
