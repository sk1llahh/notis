import React from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Trophy, RotateCcw, ArrowRight, AlertTriangle } from "lucide-react";
import { Badge, Button, Card, CardHeader, CardTitle, CardContent } from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import type { QuizResultDTO, QuizQuestionDTO } from "../types";

interface QuizResultViewProps {
  result: QuizResultDTO;
  questions: QuizQuestionDTO[];
  onRetry: () => void;
  courseSlug: string;
}

export function QuizResultView({
  result,
  questions,
  onRetry,
  courseSlug,
}: QuizResultViewProps) {
  const { score, passed, xpEarned, totalQuestions, correctQuestions, breakdown } =
    result;

  return (
    <div className="space-y-6">
      {/* Header Banner Card */}
      <Card
        variant="elevated"
        className={`p-6 text-center space-y-4 border ${
          passed
            ? "border-status-completed/40 bg-status-completed/5"
            : "border-status-progress/40 bg-status-progress/5"
        }`}
      >
        <div className="flex justify-center">
          <div
            className={`p-3.5 rounded-full ${
              passed
                ? "bg-status-completed/15 text-status-completed"
                : "bg-status-progress/15 text-status-progress"
            }`}
          >
            {passed ? (
              <Trophy className="w-8 h-8" />
            ) : (
              <AlertTriangle className="w-8 h-8" />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-2xl font-extrabold text-text-primary">
            {passed ? "Тест успешно пройден!" : "Тест не пройден"}
          </h3>
          <p className="text-sm text-text-secondary">
            {passed
              ? "Вы подтвердили освоение материала темы и открыли следующие шаги в роадмапе."
              : "Для зачета необходимо набрать не менее 80% правильных ответов. Изучите разбор ошибок ниже и попробуйте снова."}
          </p>
        </div>

        {/* Score & Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Badge variant={passed ? "completed" : "progress"} size="md">
            Результат: {score}% ({correctQuestions} из {totalQuestions})
          </Badge>

          {xpEarned > 0 && (
            <Badge variant="diff" size="md">
              +{xpEarned} XP идеальный результат!
            </Badge>
          )}
        </div>

        {/* Top actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Button
            variant={passed ? "secondary" : "primary"}
            size="md"
            onClick={onRetry}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Попробовать снова
          </Button>

          {passed && (
            <Link href={ROUTES.COURSE(courseSlug)}>
              <Button
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
              >
                Вернуться к роадмапу
              </Button>
            </Link>
          )}
        </div>
      </Card>

      {/* Question Breakdown Analysis */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wider text-text-muted">
          Разбор ответов ({breakdown.length})
        </h4>

        <div className="space-y-3">
          {breakdown.map((item, index) => {
            const questionDef = questions.find((q) => q.id === item.questionId);

            return (
              <Card
                key={item.questionId}
                variant="default"
                className={`p-4 border ${
                  item.isCorrect
                    ? "border-status-completed/30"
                    : "border-red-500/30"
                }`}
              >
                <CardHeader className="p-0 pb-2 flex-row items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      {item.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-status-completed shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-text-muted">
                        Вопрос {index + 1}
                      </span>
                      <CardTitle className="text-sm font-semibold text-text-primary mt-0.5">
                        {questionDef?.question ?? "Вопрос темы"}
                      </CardTitle>
                    </div>
                  </div>

                  <Badge
                    size="sm"
                    variant={item.isCorrect ? "completed" : "outline"}
                  >
                    {item.isCorrect ? "Верно" : "Ошибка"}
                  </Badge>
                </CardHeader>

                <CardContent className="p-0 pt-2 space-y-2 text-xs">
                  {/* Explanation if provided */}
                  {item.explanation && (
                    <div className="p-2.5 rounded bg-surface-elevated text-text-secondary leading-relaxed border border-border-subtle">
                      <span className="font-semibold text-text-primary">
                        Объяснение:{" "}
                      </span>
                      {item.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
