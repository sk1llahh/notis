"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Card, Button, Badge } from "@/shared/ui";
import { FlashcardView } from "./FlashcardView";
import { reviewCardAction } from "@/server/actions";
import { ROUTES } from "@/shared/config";
import {
  Trophy,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import type { ReviewCardDTO } from "../types";

export interface PracticeDeckProps {
  initialCards: ReviewCardDTO[];
}

export function PracticeDeck({ initialCards }: PracticeDeckProps) {
  const [cards, setCards] = useState<ReviewCardDTO[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [xpGained, setXpGained] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(initialCards.length === 0);
  const [isSubmitting, startSubmitting] = useTransition();

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;
  const progressPercent =
    totalCards > 0 ? Math.round((reviewedCount / totalCards) * 100) : 100;

  const handleRate = (quality: 1 | 3 | 4 | 5) => {
    if (!currentCard || isSubmitting) return;

    startSubmitting(async () => {
      const result = await reviewCardAction({
        cardId: currentCard.id,
        quality,
      });

      if (result.success) {
        setXpGained((prev) => prev + (result.data?.xpEarned ?? 5));
        setReviewedCount((prev) => prev + 1);

        if (currentIndex + 1 < totalCards) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setIsFinished(true);
        }
      }
    });
  };

  // ===========================================================================
  // COMPLETION SCREEN
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
                {reviewedCount}
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

          {/* Navigation CTA */}
          <div className="flex flex-col gap-2.5 w-full">
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
              <Button variant="secondary" className="w-full">
                На главную
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // ===========================================================================
  // ACTIVE PRACTICE SCREEN
  // ===========================================================================
  return (
    <div className="w-full max-w-2xl mx-auto py-6 px-4 flex flex-col items-center">
      {/* Top Header: Counter & Progress */}
      <div className="w-full max-w-xl mb-6 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-text-secondary flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-status-available" />
            Осталось: {totalCards - reviewedCount} из {totalCards}
          </span>
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
