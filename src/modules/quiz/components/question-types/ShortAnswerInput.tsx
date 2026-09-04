"use client";

import React from "react";
import { HelpCircle, Check } from "lucide-react";
import type { QuizQuestionDTO } from "../../types";

export interface ShortAnswerInputProps {
  question: QuizQuestionDTO;
  value: string | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ShortAnswerInput({
  question,
  value = "",
  onChange,
  disabled = false,
}: ShortAnswerInputProps) {
  const currentText = typeof value === "string" ? value : "";
  const isFilled = currentText.trim().length > 0;

  return (
    <div className="space-y-3">
      <div className="relative flex items-center">
        <input
          type="text"
          value={currentText}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Введите ваш ответ..."
          autoComplete="off"
          spellCheck={false}
          className={`w-full px-4 py-3 rounded-lg bg-surface-canvas border text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-all ${
            isFilled
              ? "border-status-available/60 ring-1 ring-status-available/30"
              : "border-border-subtle focus:border-border-focus"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        />

        {isFilled && (
          <div className="absolute right-3.5 flex items-center text-status-available">
            <Check className="w-4 h-4 stroke-[2.5]" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
        <span>
          Регистр символов и пробелы по краям не учитываются (например, &laquo;Стек&raquo; и &laquo;стек&raquo; равнозначны).
        </span>
      </div>
    </div>
  );
}
