"use client";

import React, { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/shared/ui";
import { Search, SlidersHorizontal, X } from "lucide-react";

const DIFFICULTY_OPTIONS = [
  { value: "ALL", label: "Все уровни" },
  { value: "BEGINNER", label: "Начинающий" },
  { value: "INTERMEDIATE", label: "Средний" },
  { value: "ADVANCED", label: "Продвинутый" },
  { value: "EXPERT", label: "Эксперт" },
] as const;

export function CourseCatalogFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQuery = searchParams.get("q") || "";
  const currentDifficulty = searchParams.get("difficulty") || "ALL";

  // Updates searchParams in the URL preserving existing params
  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== "ALL" && value.trim().length > 0) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const handleClear = () => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  const hasActiveFilters =
    Boolean(currentQuery) || (currentDifficulty && currentDifficulty !== "ALL");

  return (
    <div className="flex flex-col gap-4 w-full bg-surface-card/70 border border-border-subtle rounded-xl p-4 sm:p-5">
      {/* Search Input Row */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <Input
          type="text"
          placeholder="Поиск курсов по названию, темам или тегам..."
          value={currentQuery}
          onChange={(e) => updateFilters("q", e.target.value)}
          className="pl-10 pr-9 bg-surface-elevated/70"
        />
        {currentQuery && (
          <button
            type="button"
            onClick={() => updateFilters("q", "")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 rounded-sm cursor-pointer"
            title="Очистить поиск"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Difficulty Chips Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-text-muted font-medium mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Сложность:</span>
          </div>

          {DIFFICULTY_OPTIONS.map((opt) => {
            const isSelected =
              currentDifficulty.toUpperCase() === opt.value.toUpperCase();

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateFilters("difficulty", opt.value)}
                className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-status-available/15 border-status-available/40 text-status-available shadow-xs"
                    : "bg-surface-elevated/50 border-border-subtle hover:border-border-strong text-text-secondary hover:text-text-primary"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-text-muted hover:text-text-primary self-start sm:self-auto underline transition-colors cursor-pointer"
          >
            Сбросить фильтры
          </button>
        )}
      </div>
    </div>
  );
}
