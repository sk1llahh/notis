import React from "react";
import { ArrowLeft, ArrowRight, Check, Send } from "lucide-react";
import { Badge, Button, Card, CardHeader, CardTitle, CardContent } from "@/shared/ui";
import type { QuizQuestionDTO } from "../types";

interface QuizCardProps {
  question: QuizQuestionDTO;
  selectedOptionIds: string[];
  onToggleOption: (optionId: string) => void;
  onNext: () => void;
  onPrev?: () => void;
  isFirst: boolean;
  isLast: boolean;
  isSubmitting?: boolean;
}

export function QuizCard({
  question,
  selectedOptionIds,
  onToggleOption,
  onNext,
  onPrev,
  isFirst,
  isLast,
  isSubmitting = false,
}: QuizCardProps) {
  const isMultiple = question.type === "MULTIPLE_CHOICE";
  const hasSelection = selectedOptionIds.length > 0;

  return (
    <Card variant="elevated" className="space-y-6 p-6">
      {/* Header with question type badge */}
      <CardHeader className="p-0 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" size="sm">
            {isMultiple ? "Множественный выбор" : "Один верный ответ"}
          </Badge>
        </div>

        <CardTitle className="text-lg sm:text-xl font-bold text-text-primary leading-snug">
          {question.question}
        </CardTitle>

        {question.codeSnippet && (
          <pre className="p-3.5 rounded-md bg-surface-canvas border border-border-subtle font-mono text-xs text-text-primary overflow-x-auto">
            <code>{question.codeSnippet}</code>
          </pre>
        )}
      </CardHeader>

      {/* Options list */}
      <CardContent className="p-0 space-y-2.5">
        {question.options.map((option) => {
          const isSelected = selectedOptionIds.includes(option.id);

          return (
            <div
              key={option.id}
              onClick={() => onToggleOption(option.id)}
              role={isMultiple ? "checkbox" : "radio"}
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  onToggleOption(option.id);
                }
              }}
              className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer select-none transition-all duration-200 outline-none ${
                isSelected
                  ? "border-status-available bg-status-available/10 text-text-primary ring-1 ring-status-available shadow-sm"
                  : "border-border-subtle bg-surface-card hover:bg-surface-hover hover:border-border-strong text-text-secondary"
              }`}
            >
              {/* Checkbox / Radio Visual Indicator */}
              <div
                className={`w-5 h-5 mt-0.5 rounded-${
                  isMultiple ? "sm" : "full"
                } border flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? "border-status-available bg-status-available text-surface-canvas"
                    : "border-border-strong bg-surface-elevated"
                }`}
              >
                {isSelected && (
                  isMultiple ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-surface-canvas" />
                  )
                )}
              </div>

              <div className="min-w-0 flex-1">
                <span className="text-sm leading-relaxed">{option.text}</span>
                {option.codeSnippet && (
                  <pre className="mt-2 p-2 rounded bg-surface-canvas text-xs font-mono text-text-primary">
                    <code>{option.codeSnippet}</code>
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
        <div>
          {!isFirst && onPrev && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onPrev}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Назад
            </Button>
          )}
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={onNext}
          disabled={!hasSelection || isSubmitting}
          isLoading={isSubmitting}
          rightIcon={
            isLast ? (
              <Send className="w-4 h-4 ml-1" />
            ) : (
              <ArrowRight className="w-4 h-4 ml-1" />
            )
          }
        >
          {isLast ? "Завершить тест" : "Следующий вопрос"}
        </Button>
      </div>
    </Card>
  );
}
