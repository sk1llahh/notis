"use client";

import React from "react";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  MarkdownRenderer,
} from "@/shared/ui";
import type { QuizQuestionDTO, QuizQuestionType } from "../types";
import { QuestionInputFactory } from "./question-types/QuestionInputFactory";

export interface QuizCardProps {
  question: QuizQuestionDTO;
  answer?: unknown;
  selectedOptionIds?: string[];
  onAnswerChange?: (answer: unknown) => void;
  onToggleOption?: (optionId: string) => void;
  onNext: () => void;
  onPrev?: () => void;
  isFirst: boolean;
  isLast: boolean;
  isSubmitting?: boolean;
}

function checkHasAnswer(type: QuizQuestionType, answer: unknown): boolean {
  if (answer === undefined || answer === null) return false;

  switch (type) {
    case "SINGLE_CHOICE":
      if (typeof answer === "number") return true;
      if (typeof answer === "string") return answer.trim().length > 0;
      if (Array.isArray(answer)) return answer.length > 0;
      return false;

    case "MULTIPLE_CHOICE":
      return Array.isArray(answer) && answer.length > 0;

    case "SHORT_ANSWER":
      if (typeof answer === "string") return answer.trim().length > 0;
      if (Array.isArray(answer)) return answer.length > 0 && String(answer[0]).trim().length > 0;
      return false;

    case "CODE":
      if (typeof answer === "string") return answer.trim().length > 0;
      if (Array.isArray(answer)) return answer.length > 0 && String(answer[0]).trim().length > 0;
      return false;

    default:
      return false;
  }
}

function getQuestionTypeBadge(type: QuizQuestionType) {
  switch (type) {
    case "SINGLE_CHOICE":
      return <Badge variant="outline" size="sm">Один верный ответ</Badge>;
    case "MULTIPLE_CHOICE":
      return <Badge variant="outline" size="sm">Множественный выбор</Badge>;
    case "SHORT_ANSWER":
      return <Badge variant="progress" size="sm">Краткий ответ</Badge>;
    case "CODE":
      return <Badge variant="available" size="sm">Практика: Код</Badge>;
    default:
      return <Badge variant="outline" size="sm">Вопрос</Badge>;
  }
}

export function QuizCard({
  question,
  answer,
  selectedOptionIds,
  onAnswerChange,
  onToggleOption,
  onNext,
  onPrev,
  isFirst,
  isLast,
  isSubmitting = false,
}: QuizCardProps) {
  // Resolve answer from answer prop or fallback to selectedOptionIds
  const currentAnswer = answer !== undefined ? answer : selectedOptionIds;

  const handleAnswerChange = (val: unknown) => {
    if (onAnswerChange) {
      onAnswerChange(val);
    } else if (onToggleOption) {
      if (Array.isArray(val)) {
        onToggleOption(val.map(String).join(","));
      } else {
        onToggleOption(String(val));
      }
    }
  };

  const hasSelection = checkHasAnswer(question.type, currentAnswer);

  return (
    <Card variant="elevated" className="space-y-6 p-6">
      {/* Header with question type badge */}
      <CardHeader className="p-0 space-y-3">
        <div className="flex items-center justify-between">
          {getQuestionTypeBadge(question.type)}
        </div>

        <CardTitle className="text-lg sm:text-xl font-bold text-text-primary leading-snug">
          <MarkdownRenderer content={question.question} />
        </CardTitle>

        {question.codeSnippet && (
          <pre className="p-3.5 rounded-md bg-surface-canvas border border-border-subtle font-mono text-xs text-text-primary overflow-x-auto">
            <code>{question.codeSnippet}</code>
          </pre>
        )}
      </CardHeader>

      {/* Dynamic Question Input Component via Factory */}
      <CardContent className="p-0">
        <QuestionInputFactory
          question={question}
          value={currentAnswer}
          onChange={handleAnswerChange}
          disabled={isSubmitting}
        />
      </CardContent>

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-border-subtle">
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

        <div className="flex items-center justify-end gap-3">
          {question.type === "CODE" && !hasSelection && (
            <span className="text-xs text-text-muted hidden sm:inline">
              Запустите код и пройдите все тесты для продолжения
            </span>
          )}

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
      </div>
    </Card>
  );
}
