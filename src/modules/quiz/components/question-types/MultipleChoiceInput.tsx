"use client";

import React from "react";
import { Check, Info } from "lucide-react";
import type { QuizQuestionDTO } from "../../types";

export interface MultipleChoiceInputProps {
  question: QuizQuestionDTO;
  value: Array<number | string> | undefined;
  onChange: (value: number[]) => void;
  disabled?: boolean;
}

export function MultipleChoiceInput({
  question,
  value = [],
  onChange,
  disabled = false,
}: MultipleChoiceInputProps) {
  const selectedValues = Array.isArray(value) ? value : [];

  const handleToggle = (idx: number, optId: string) => {
    if (disabled) return;

    // Check if idx or optId is already present
    const isPresent =
      selectedValues.includes(idx) ||
      selectedValues.includes(optId) ||
      selectedValues.includes(String(idx));

    let updatedNumeric: number[];

    if (isPresent) {
      updatedNumeric = selectedValues
        .filter((v) => v !== idx && v !== optId && String(v) !== String(idx))
        .map((v) => {
          if (typeof v === "number") return v;
          const foundIdx = question.options.findIndex((o) => o.id === v);
          return foundIdx >= 0 ? foundIdx : Number(v);
        })
        .filter((n) => Number.isInteger(n) && n >= 0);
    } else {
      const currentNumeric = selectedValues
        .map((v) => {
          if (typeof v === "number") return v;
          const foundIdx = question.options.findIndex((o) => o.id === v);
          return foundIdx >= 0 ? foundIdx : Number(v);
        })
        .filter((n) => Number.isInteger(n) && n >= 0);

      updatedNumeric = [...currentNumeric, idx].sort((a, b) => a - b);
    }

    onChange(updatedNumeric);
  };

  return (
    <div className="space-y-3">
      {/* Informative Hint Banner */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-brand-primary/10 border border-brand-primary/20 text-xs text-brand-primary">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>Выберите один или несколько верных вариантов</span>
      </div>

      <div className="space-y-2.5">
        {question.options.map((option, idx) => {
          const isSelected =
            selectedValues.includes(idx) ||
            selectedValues.includes(option.id) ||
            selectedValues.includes(String(idx));

          return (
            <div
              key={option.id || idx}
              onClick={() => handleToggle(idx, option.id)}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => {
                if (!disabled && (e.key === " " || e.key === "Enter")) {
                  e.preventDefault();
                  handleToggle(idx, option.id);
                }
              }}
              className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer select-none transition-all duration-200 outline-none ${
                disabled ? "opacity-60 cursor-not-allowed" : ""
              } ${
                isSelected
                  ? "border-status-available bg-status-available/10 text-text-primary ring-1 ring-status-available shadow-sm"
                  : "border-border-subtle bg-surface-card hover:bg-surface-hover hover:border-border-strong text-text-secondary"
              }`}
            >
              {/* Checkbox indicator */}
              <div
                className={`w-5 h-5 mt-0.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? "border-status-available bg-status-available text-surface-canvas"
                    : "border-border-strong bg-surface-elevated"
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>

              <div className="min-w-0 flex-1">
                <span className="text-sm leading-relaxed">{option.text}</span>
                {option.codeSnippet && (
                  <pre className="mt-2 p-2 rounded bg-surface-canvas text-xs font-mono text-text-primary overflow-x-auto">
                    <code>{option.codeSnippet}</code>
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
