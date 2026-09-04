"use client";

import React, { useState, useTransition } from "react";
import { QuizStepper } from "./QuizStepper";
import { QuizCard } from "./QuizCard";
import { QuizResultView } from "./QuizResultView";
import { submitQuizAction } from "@/server/actions";
import type { QuizQuestionDTO, QuizResultDTO } from "../types";

interface QuizContainerProps {
  courseSlug: string;
  topicSlug: string;
  questions: QuizQuestionDTO[];
  onSuccess?: () => void;
}

export function QuizContainer({
  courseSlug,
  topicSlug,
  questions,
  onSuccess,
}: QuizContainerProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<QuizResultDTO | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (questions.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-text-muted">
        Для этой темы тестовые задания еще не сформированы.
      </div>
    );
  }

  const currentQuestion = questions[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === questions.length - 1;

  const handleAnswerChange = (val: unknown) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: val,
    }));
  };

  const handleNext = () => {
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    setErrorMessage(null);

    startTransition(async () => {
      const polymorphicAnswers = Object.entries(answers).map(
        ([questionId, answer]) => ({
          questionId,
          answer,
        })
      );

      const res = await submitQuizAction({
        courseSlug,
        topicSlug,
        answers: polymorphicAnswers,
      });

      if (!res.success) {
        setErrorMessage(res.error.message || "Не удалось отправить тест");
        return;
      }

      setResult(res.data);
      if (res.data.passed && onSuccess) {
        onSuccess();
      }
    });
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentStep(0);
    setResult(null);
    setErrorMessage(null);
  };

  if (result) {
    return (
      <QuizResultView
        result={result}
        questions={questions}
        onRetry={handleRetry}
        courseSlug={courseSlug}
        topicSlug={topicSlug}
      />
    );
  }

  return (
    <div className="space-y-6">
      <QuizStepper
        currentStep={currentStep}
        totalSteps={questions.length}
      />

      <QuizCard
        question={currentQuestion}
        answer={answers[currentQuestion.id]}
        onAnswerChange={handleAnswerChange}
        onNext={handleNext}
        onPrev={handlePrev}
        isFirst={isFirst}
        isLast={isLast}
        isSubmitting={isPending}
      />

      {errorMessage && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-xs text-red-400 text-center">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
