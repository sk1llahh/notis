"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Badge, MarkdownRenderer } from "@/shared/ui";
import { RotateCw, CornerDownLeft } from "lucide-react";
import type { ReviewCardDTO } from "../types";

export interface FlashcardViewProps {
  card: ReviewCardDTO;
  onRate: (quality: 1 | 3 | 4 | 5) => void;
  isSubmitting?: boolean;
}

export function FlashcardView({
  card,
  onRate,
  isSubmitting = false,
}: FlashcardViewProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false);
  }, [card.id]);

  const handleFlip = useCallback(() => {
    if (!isSubmitting) {
      setIsFlipped((prev) => !prev);
    }
  }, [isSubmitting]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is focused on an input/textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        handleFlip();
        return;
      }

      if (isFlipped && !isSubmitting) {
        if (e.key === "1") {
          e.preventDefault();
          onRate(1);
        } else if (e.key === "2") {
          e.preventDefault();
          onRate(3);
        } else if (e.key === "3") {
          e.preventDefault();
          onRate(4);
        } else if (e.key === "4") {
          e.preventDefault();
          onRate(5);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip, isFlipped, isSubmitting, onRate]);

  return (
    <div className="w-full max-w-xl mx-auto [perspective:1000px] select-none">
      <div
        className={`relative w-full min-h-[380px] sm:min-h-[420px] rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] shadow-2xl cursor-pointer ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
        onClick={handleFlip}
      >
        {/* ===================================================================
            FRONT SIDE
           =================================================================== */}
        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] p-6 sm:p-8 rounded-2xl bg-surface-card border border-border-subtle flex flex-col justify-between">
          {/* Top row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-available animate-pulse" />
              <Badge size="sm" variant="outline">
                {card.topicTitle}
              </Badge>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
              <span>
                {card.interval > 0 ? `${card.interval} дн.` : "Новая"}
              </span>
            </div>
          </div>

          {/* Front Content (Question) */}
          <div className="my-auto py-6 text-center">
            <MarkdownRenderer
              content={card.front}
              className="text-lg sm:text-xl font-medium text-text-primary leading-relaxed"
            />
          </div>

          {/* Bottom Hint */}
          <div className="flex items-center justify-center gap-2 text-xs text-text-muted border-t border-border-subtle pt-4">
            <RotateCw className="w-3.5 h-3.5 text-text-secondary" />
            <span>Нажмите</span>
            <kbd className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-surface-elevated text-text-primary border border-border-strong rounded shadow-sm">
              Пробел
            </kbd>
            <span>или кликните для ответа</span>
          </div>
        </div>

        {/* ===================================================================
            BACK SIDE
           =================================================================== */}
        <div
          className="absolute inset-0 w-full h-full [transform:rotateY(180deg)] [backface-visibility:hidden] p-6 sm:p-8 rounded-2xl bg-surface-overlay border border-border-strong flex flex-col justify-between"
          onClick={(e) => {
            // Prevent flipping back when clicking evaluation buttons
            e.stopPropagation();
          }}
        >
          {/* Top row */}
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-status-available font-semibold">
              Правильный ответ
            </span>
            <button
              type="button"
              onClick={handleFlip}
              className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCw className="w-3 h-3" />
              Вопрос
            </button>
          </div>

          {/* Back Content */}
          <div className="my-auto py-4 overflow-y-auto max-h-[220px] text-left space-y-3">
            <MarkdownRenderer
              content={card.back}
              className="text-sm sm:text-base text-text-primary leading-relaxed"
            />

            {card.codeSnippet && (
              <pre className="p-3 rounded-lg bg-surface-canvas border border-border-subtle font-mono text-xs text-status-available overflow-x-auto">
                <code>{card.codeSnippet}</code>
              </pre>
            )}
          </div>

          {/* Bottom Evaluation Buttons */}
          <div className="border-t border-border-subtle pt-4">
            <p className="text-[11px] text-center text-text-muted mb-2.5">
              Оцените, насколько легко было вспомнить:
            </p>

            <div className="grid grid-cols-4 gap-2">
              {/* 1: Again (Quality: 1) */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => onRate(1)}
                className="group p-2 sm:p-2.5 rounded-lg border border-red-500/30 bg-red-500/5 hover:bg-red-500/15 hover:border-red-500/50 text-red-400 transition-all cursor-pointer flex flex-col items-center gap-1 active:scale-95 disabled:opacity-50"
              >
                <span className="text-xs font-semibold">Снова</span>
                <span className="text-[10px] font-mono opacity-60 group-hover:opacity-100 flex items-center gap-0.5">
                  [1]
                </span>
              </button>

              {/* 2: Hard (Quality: 3) */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => onRate(3)}
                className="group p-2 sm:p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 hover:border-amber-500/50 text-amber-400 transition-all cursor-pointer flex flex-col items-center gap-1 active:scale-95 disabled:opacity-50"
              >
                <span className="text-xs font-semibold">Трудно</span>
                <span className="text-[10px] font-mono opacity-60 group-hover:opacity-100 flex items-center gap-0.5">
                  [2]
                </span>
              </button>

              {/* 3: Good (Quality: 4) */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => onRate(4)}
                className="group p-2 sm:p-2.5 rounded-lg border border-status-available/30 bg-status-available/5 hover:bg-status-available/15 hover:border-status-available/50 text-status-available transition-all cursor-pointer flex flex-col items-center gap-1 active:scale-95 disabled:opacity-50"
              >
                <span className="text-xs font-semibold">Хорошо</span>
                <span className="text-[10px] font-mono opacity-60 group-hover:opacity-100 flex items-center gap-0.5">
                  [3]
                </span>
              </button>

              {/* 4: Easy (Quality: 5) */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => onRate(5)}
                className="group p-2 sm:p-2.5 rounded-lg border border-status-completed/30 bg-status-completed/5 hover:bg-status-completed/15 hover:border-status-completed/50 text-status-completed transition-all cursor-pointer flex flex-col items-center gap-1 active:scale-95 disabled:opacity-50"
              >
                <span className="text-xs font-semibold">Легко</span>
                <span className="text-[10px] font-mono opacity-60 group-hover:opacity-100 flex items-center gap-0.5">
                  [4]
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
