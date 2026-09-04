import React from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/shared/ui";
import type { ActivityDayDTO } from "../types";
import { Calendar } from "lucide-react";

export interface ActivityHeatmapProps {
  activity: ActivityDayDTO[];
}

function getActivityColorClass(level: 0 | 1 | 2 | 3 | 4): string {
  switch (level) {
    case 1:
      return "bg-emerald-950/40 border-emerald-900/50 hover:border-emerald-700";
    case 2:
      return "bg-emerald-700/60 border-emerald-600/50 hover:border-emerald-500";
    case 3:
      return "bg-emerald-500 border-emerald-400/50 hover:border-emerald-300 shadow-xs shadow-emerald-500/20";
    case 4:
      return "bg-emerald-400 border-emerald-300/60 hover:border-emerald-200 shadow-sm shadow-emerald-400/40";
    case 0:
    default:
      return "bg-surface-elevated border-border-subtle/50 hover:border-border-strong";
  }
}

function pluralizeActions(count: number): string {
  const abs = Math.abs(count) % 100;
  const rem = abs % 10;
  if (abs > 10 && abs < 20) return "действий";
  if (rem > 1 && rem < 5) return "действия";
  if (rem === 1) return "действие";
  return "действий";
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

export function ActivityHeatmap({ activity }: ActivityHeatmapProps) {
  const totalCount = activity.reduce((sum, day) => sum + day.count, 0);

  // Group activity into weeks for a GitHub-style horizontal contribution grid
  // Standard week has 7 days. We pad the beginning so that Monday is row 0.
  const paddedDays: (ActivityDayDTO | null)[] = [];
  if (activity.length > 0) {
    const firstDate = new Date(activity[0].date + "T00:00:00Z");
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // In Russian locale, week starts on Monday (0)
    const dayOfWeek = (firstDate.getUTCDay() + 6) % 7;
    for (let i = 0; i < dayOfWeek; i++) {
      paddedDays.push(null);
    }
    paddedDays.push(...activity);
  }

  return (
    <Card variant="default" className="p-5">
      <CardHeader className="p-0 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-status-available" />
            <CardTitle className="text-base font-semibold">
              Активность обучения
            </CardTitle>
          </div>
          <span className="text-xs text-text-secondary">
            <strong className="text-text-primary font-semibold">
              {totalCount.toLocaleString("ru-RU")}
            </strong>{" "}
            {pluralizeActions(totalCount)} за последние 90 дней
          </span>
        </div>
        <CardDescription className="text-xs text-text-muted mt-1">
          Фиксация завершенных тем, пройденных квизов и тренировок карточек
        </CardDescription>
      </CardHeader>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2 pt-1">
        <div className="inline-grid grid-flow-col grid-rows-7 gap-1.5 min-w-max">
          {paddedDays.map((day, idx) => {
            if (!day) {
              return (
                <div
                  key={`pad-${idx}`}
                  className="w-3.5 h-3.5 rounded-xs opacity-0 pointer-events-none"
                />
              );
            }

            const formattedDate = formatDate(day.date);
            const tooltip = `${formattedDate}: ${day.count} ${pluralizeActions(day.count)}`;

            return (
              <div
                key={day.date}
                title={tooltip}
                aria-label={tooltip}
                className={`w-3.5 h-3.5 rounded-xs border transition-all duration-150 cursor-pointer ${getActivityColorClass(
                  day.level
                )}`}
              />
            );
          })}
        </div>
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-between pt-3 mt-2 border-t border-border-subtle text-[11px] text-text-muted">
        <span>Пн — Вс</span>
        <div className="flex items-center gap-1.5">
          <span>Меньше</span>
          <div className="w-2.5 h-2.5 rounded-xs bg-surface-elevated border border-border-subtle/50" />
          <div className="w-2.5 h-2.5 rounded-xs bg-emerald-950/40 border border-emerald-900/50" />
          <div className="w-2.5 h-2.5 rounded-xs bg-emerald-700/60 border border-emerald-600/50" />
          <div className="w-2.5 h-2.5 rounded-xs bg-emerald-500 border border-emerald-400/50" />
          <div className="w-2.5 h-2.5 rounded-xs bg-emerald-400 border border-emerald-300/60" />
          <span>Больше</span>
        </div>
      </div>
    </Card>
  );
}
