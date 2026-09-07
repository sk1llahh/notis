"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import { Card, Button, Badge } from "@/shared/ui";
import { FlashcardView } from "./FlashcardView";
import { reviewCardAction } from "@/server/actions/spaced-repetition-actions";
import { ROUTES } from "@/shared/config";
import {
  Trophy,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Play,
  Layers,
} from "lucide-react";
import type { ReviewCardDTO } from "../types";

export interface PracticeDeckProps {
  initialCards: ReviewCardDTO[];
  initialCourseFilter?: string;
}

export function PracticeDeck({
  initialCards,
  initialCourseFilter,
}: PracticeDeckProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>(() => {
    if (
      initialCourseFilter &&
      initialCards.some((c) => c.courseSlug === initialCourseFilter)
    ) {
      return initialCourseFilter;
    }
    return "ALL";
  });

  const [isStarted, setIsStarted] = useState(false);
  const [reviewedCardIds, setReviewedCardIds] = useState<Set<string>>(
    new Set()
  );
  const [xpGained, setXpGained] = useState(0);
  const [isSubmitting, startSubmitting] = useTransition();

  // Extract unique course filters from cards
  const filterOptions = useMemo(() => {
    const map = new Map<string, { title: string; count: number }>();

    for (const card of initialCards) {
      if (card.courseSlug) {
        const title = card.courseTitle || card.courseSlug;
        const existing = map.get(card.courseSlug);
        if (existing) {
          existing.count++;
        } else {
          map.set(card.courseSlug, { title, count: 1 });
        }
      }
    }

    const options: { key: string; label: string; count: number }[] = [
      {
        key: "ALL",
        label: "Все темы",
        count: initialCards.length,
      },
    ];

    for (const [slug, val] of map.entries()) {
      options.push({
        key: slug,
        label: val.title,
        count: val.count,
      });
    }

    return options;
  }, [initialCards]);

  // Active cards matching selected course filter
  const activeCards = useMemo(() => {
    if (selectedFilter === "ALL") return initialCards;
    return initialCards.filter((c) => c.courseSlug === selectedFilter);
  }, [initialCards, selectedFilter]);

  // Cards remaining to review in the active filter
  const unreviewedCards = useMemo(() => {
    return activeCards.filter((c) => !reviewedCardIds.has(c.id));
  }, [activeCards, reviewedCardIds]);

  const totalActiveCards = activeCards.length;
  const currentReviewedCount = totalActiveCards - unreviewedCards.length;
  const progressPercent =
    totalActiveCards > 0
      ? Math.round((currentReviewedCount / totalActiveCards) * 100)
      : 100;

  const currentCard = unreviewedCards[0];
  const isFinished = isStarted && unreviewedCards.length === 0;

  // Keyboard shortcut to start session from dashboard
  useEffect(() => {
    if (isStarted || isFinished || totalActiveCards === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        setIsStarted(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isStarted, isFinished, totalActiveCards]);

  const handleRate = (quality: 1 | 3 | 4 | 5) => {
    if (!currentCard || isSubmitting) return;

    startSubmitting(async () => {
      const result = await reviewCardAction({
        cardId: currentCard.id,
        quality,
      });

      if (result.success) {
        setXpGained((prev) => prev + (result.data?.xpEarned ?? 5));
        setReviewedCardIds((prev) => new Set(prev).add(currentCard.id));
      }
    });
  };

  // Other unreviewed cards across all filters
  const otherUnreviewedCount = initialCards.filter(
    (c) => !reviewedCardIds.has(c.id)
  ).length;

  // ===========================================================================
  // 1. START SCREEN (SESSION DASHBOARD)
  // ===========================================================================
  if (!isStarted && !isFinished) {
    return (
      <div className="w-full max-w-xl mx-auto py-8 px-4 animate-in fade-in zoom-in duration-300">
        <Card variant="elevated" className="p-6 sm:p-8 text-center items-center">
          <div className="w-16 h-16 rounded-2xl bg-status-available/10 border border-status-available/30 flex items-center justify-center mb-5 text-status-available shadow-inner">
            <GraduationCap className="w-8 h-8" />
          </div>

          <Badge size="md" variant="available" className="mb-3">
            Интервальное повторение
          </Badge>

          <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">
            Готовы к тренировке?
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed max-w-md mb-6">
            Алгоритм SuperMemo-2 подобрал карточки, которые пора освежить для
            долгосрочного закрепления материала.
          </p>

          {/* Filter Chips by Course (if multiple options available) */}
          {filterOptions.length > 2 && (
            <div className="w-full mb-6 text-left">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-status-available" />
                Выберите предмет для повторения:
              </label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((opt) => {
                  const isSelected = selectedFilter === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedFilter(opt.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-status-available text-white shadow-sm"
                          : "bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-elevated/80 border border-border-subtle"
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-surface-card text-text-muted"
                        }`}
                      >
                        {opt.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 w-full mb-6 text-left">
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border-subtle">
              <span className="text-[11px] text-text-muted block">
                Карточек к повторению
              </span>
              <span className="text-lg font-bold font-mono text-text-primary flex items-center gap-1.5 mt-0.5">
                <BookOpen className="w-4 h-4 text-status-available" />
                {totalActiveCards}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border-subtle">
              <span className="text-[11px] text-text-muted block">
                Потенциальный опыт
              </span>
              <span className="text-lg font-bold font-mono text-status-completed flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-4 h-4 text-status-completed" />
                +{totalActiveCards * 5} XP
              </span>
            </div>
          </div>

          {/* Start Button & Hotkey Hint */}
          <div className="w-full flex flex-col gap-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center"
              onClick={() => setIsStarted(true)}
              disabled={totalActiveCards === 0}
              rightIcon={<Play className="w-4 h-4 fill-current" />}
            >
              Начать тренировку ({totalActiveCards} карточек)
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted mt-2">
              <span>Нажмите</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-surface-elevated text-text-primary border border-border-strong rounded shadow-sm">
                Пробел
              </kbd>
              <span>или</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-surface-elevated text-text-primary border border-border-strong rounded shadow-sm">
                Enter
              </kbd>
              <span>для быстрого старта</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ===========================================================================
  // 2. COMPLETION SCREEN
  // ===========================================================================
  if (isFinished || !currentCard) {
    return (
      <div className="w-full max-w-md mx-auto py-12 px-4 animate-in fade-in zoom-in duration-300">
        <Card variant="elevated" className="p-8 text-center items-center">
          <div className="w-16 h-16 rounded-full bg-status-completed/10 border border-status-completed/30 flex items-center justify-center mb-5 text-status-completed">
            <Trophy className="w-8 h-8" />
          </div>

          <Badge size="md" variant="completed" className="mb-2">
            Сессия завершена!
          </Badge>

          <h2 className="text-xl font-bold text-text-primary mb-2">
            Отличная тренировка
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-6">
            Все запланированные карточки успешно повторены. Алгоритм SM-2 обновил
            интервалы воспоминания.
          </p>

          {/* Stats summary */}
          <div className="grid grid-cols-2 gap-3 w-full mb-6 text-left">
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border-subtle">
              <span className="text-[11px] text-text-muted block">
                Повторено карточек
              </span>
              <span className="text-lg font-bold font-mono text-text-primary flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-status-completed" />
                {currentReviewedCount}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border-subtle">
              <span className="text-[11px] text-text-muted block">
                Получено опыта
              </span>
              <span className="text-lg font-bold font-mono text-status-completed flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-4 h-4 text-status-completed" />
                +{xpGained} XP
              </span>
            </div>
          </div>

          {/* Navigation & continuation CTA */}
          <div className="flex flex-col gap-2.5 w-full">
            {otherUnreviewedCount > 0 && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setSelectedFilter("ALL");
                  setIsStarted(false);
                }}
                leftIcon={<Layers className="w-4 h-4" />}
              >
                Повторить другие темы ({otherUnreviewedCount})
              </Button>
            )}

            <Link href={ROUTES.COURSES} className="w-full">
              <Button
                variant="primary"
                className="w-full"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Вернуться к роадмапам
              </Button>
            </Link>

            <Link href={ROUTES.HOME} className="w-full">
              <Button variant="ghost" className="w-full">
                На главную
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // ===========================================================================
  // 3. ACTIVE PRACTICE SCREEN
  // ===========================================================================
  const activeFilterLabel =
    filterOptions.find((f) => f.key === selectedFilter)?.label || "Все темы";

  return (
    <div className="w-full max-w-2xl mx-auto py-6 px-4 flex flex-col items-center">
      {/* Top Header: Counter, Subject Badge & Progress */}
      <div className="w-full max-w-xl mb-6 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-text-secondary flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-status-available" />
              Осталось: {unreviewedCards.length} из {totalActiveCards}
            </span>
            {filterOptions.length > 2 && (
              <button
                type="button"
                onClick={() => setIsStarted(false)}
                className="text-[11px] text-text-muted hover:text-status-available underline cursor-pointer transition-colors"
                title="Сменить предмет"
              >
                ({activeFilterLabel})
              </button>
            )}
          </div>
          <span className="text-status-completed font-semibold">
            +{xpGained} XP
          </span>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden border border-border-subtle">
          <div
            className="h-full bg-status-available rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 3D Interactive Flashcard */}
      <FlashcardView
        card={currentCard}
        onRate={handleRate}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
