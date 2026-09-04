"use client";

import React from "react";
import type { QuizQuestionDTO } from "../../types";

export interface SingleChoiceInputProps {
  question: QuizQuestionDTO;
  value: number | string | null | undefined;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function SingleChoiceInput({
  question,
  value,
  onChange,
  disabled = false,
}: SingleChoiceInputProps) {
  return (
    <div className="space-y-2.5">
      {question.options.map((option, idx) => {
        const isSelected =
          value === idx ||
          value === option.id ||
          String(value) === String(idx);

        return (
          <div
            key={option.id || idx}
            onClick={() => {
              if (!disabled) onChange(idx);
            }}
            role="radio"
            aria-checked={isSelected}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (!disabled && (e.key === " " || e.key === "Enter")) {
                e.preventDefault();
                onChange(idx);
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
            {/* Radio indicator */}
            <div
              className={`w-5 h-5 mt-0.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                isSelected
                  ? "border-status-available bg-status-available text-surface-canvas"
                  : "border-border-strong bg-surface-elevated"
              }`}
            >
              {isSelected && (
                <div className="w-2 h-2 rounded-full bg-surface-canvas" />
              )}
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
  );
}
