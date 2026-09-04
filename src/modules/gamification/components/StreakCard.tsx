import React from "react";
import Link from "next/link";
import { Card, Badge, Button } from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import { Flame, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

export interface StreakCardProps {
  streak: number;
  isStreakActiveToday: boolean;
  isStreakExpiringSoon: boolean;
}

function pluralizeDays(count: number): string {
  const abs = Math.abs(count) % 100;
  const rem = abs % 10;
  if (abs > 10 && abs < 20) return "дней";
  if (rem > 1 && rem < 5) return "дня";
  if (rem === 1) return "день";
  return "дней";
}

export function StreakCard({
  streak,
  isStreakActiveToday,
  isStreakExpiringSoon,
}: StreakCardProps) {
  // Determine state styling and badges
  let statusText = "Начните серию сегодня";
  let statusVariant: "default" | "completed" | "progress" = "default";
  let flameColorClass = "text-text-muted bg-surface-elevated border-border-subtle";
  let statusIcon = <Flame className="w-3.5 h-3.5" />;

  if (isStreakActiveToday) {
    statusText = "Ударный режим активен";
    statusVariant = "completed";
    flameColorClass =
      "text-status-completed bg-status-completed/10 border-status-completed/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]";
    statusIcon = <CheckCircle2 className="w-3.5 h-3.5" />;
  } else if (isStreakExpiringSoon) {
    statusText = "Стрик под угрозой! Повторите карточки сегодня";
    statusVariant = "progress";
    flameColorClass =
      "text-status-progress bg-status-progress/10 border-status-progress/30 animate-pulse";
    statusIcon = <AlertTriangle className="w-3.5 h-3.5" />;
  } else if (streak > 0) {
    statusText = "Продолжите серию сегодня";
    statusVariant = "progress";
    flameColorClass = "text-status-progress bg-status-progress/10 border-status-progress/20";
  }

  return (
    <Card variant="elevated" className="p-5 flex flex-col justify-between h-full">
      <div className="flex flex-col gap-4">
        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${flameColorClass}`}
            >
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Ударный режим
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
                  {streak}
                </span>
                <span className="text-sm font-semibold text-text-secondary">
                  {pluralizeDays(streak)}
                </span>
              </div>
            </div>
          </div>

          <Badge variant={statusVariant} size="sm" className="hidden sm:inline-flex">
            {statusIcon}
            {statusText}
          </Badge>
        </div>

        {/* Mobile Badge View */}
        <div className="sm:hidden">
          <Badge variant={statusVariant} size="sm" className="w-full justify-center">
            {statusIcon}
            {statusText}
          </Badge>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">
          {isStreakActiveToday
            ? "Вы выполнили учебную цель на сегодня. Серия дней в безопасности!"
            : isStreakExpiringSoon
            ? "До сгорания серии осталось менее 12 часов. Повторите карточки в тренажере, чтобы сохранить результат!"
            : "Занимайтесь каждый день, завершая темы или повторяя карточки, чтобы наращивать ударный режим."}
        </p>
      </div>

      {/* Footer Quick Action */}
      <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
        <span className="text-xs text-text-muted">Интервальный тренажер</span>
        <Link href={ROUTES.PRACTICE}>
          <Button
            size="sm"
            variant={isStreakActiveToday ? "ghost" : "primary"}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Повторить
          </Button>
        </Link>
      </div>
    </Card>
  );
}
