"use client";

import React from "react";
import type { QuizQuestionDTO } from "../../types";

export interface FlashcardInputProps {
  question: QuizQuestionDTO;
  value: number | undefined;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const QUALITY_LABELS = [
  { value: 0, label: "Не помню", color: "text-red-400 border-red-400/40 bg-red-400/10" },
  { value: 1, label: "Смутно", color: "text-orange-400 border-orange-400/40 bg-orange-400/10" },
  { value: 2, label: "Трудно", color: "text-amber-400 border-amber-400/40 bg-amber-400/10" },
  { value: 3, label: "Вспомнил", color: "text-status-available border-status-available/40 bg-status-available/10" },
  { value: 4, label: "Легко", color: "text-status-completed border-status-completed/40 bg-status-completed/10" },
  { value: 5, label: "Идеально", color: "text-brand-primary border-brand-primary/40 bg-brand-primary/10" },
] as const;

/**
 * FlashcardInput — self-assessment card for quiz context.
 * Shows the question as the "front" side and lets the student
 * rate their recall quality on the SM-2 scale (0-5).
 */
export function FlashcardInput({
  question,
  value,
  onChange,
  disabled = false,
}: FlashcardInputProps) {
  const [isFlipped, setIsFlipped] = React.useState(false);

  return (
    <div className="space-y-4">
      {/* Card */}
      <div
        onClick={() => !disabled && setIsFlipped((prev) => !prev)}
        className={`relative min-h-[120px] p-5 rounded-xl border-2 cursor-pointer transition-all duration-300 select-none ${
          isFlipped
            ? "border-brand-primary/40 bg-brand-primary/5"
            : "border-border-strong bg-surface-elevated hover:border-border-focus"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <div className="absolute top-2 right-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          {isFlipped ? "Ответ" : "Вопрос"}
        </div>

        <div className="flex items-center justify-center min-h-[80px]">
          <p className="text-sm text-text-primary text-center leading-relaxed">
            {isFlipped
              ? (question.options?.[0]?.text || "Нажмите, чтобы перевернуть")
              : question.question}
          </p>
        </div>
      </div>

      {!disabled && (
        <p className="text-[11px] text-text-muted text-center">
          Нажмите на карточку, чтобы увидеть ответ, затем оцените качество вашего воспоминания
        </p>
      )}

      {/* Quality rating buttons */}
      {isFlipped && !disabled && (
        <div className="grid grid-cols-3 gap-2">
          {QUALITY_LABELS.map(({ value: qVal, label, color }) => {
            const isSelected = value === qVal;
            return (
              <button
                key={qVal}
                type="button"
                onClick={() => onChange(qVal)}
                className={`p-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? `${color} ring-1 ring-current shadow-sm`
                    : "border-border-subtle bg-surface-canvas text-text-muted hover:bg-surface-hover"
                }`}
              >
                <span className="block font-semibold">{qVal}</span>
                <span className="block text-[10px] mt-0.5">{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
