"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { QuizContainer } from "./QuizContainer";
import type { QuizQuestionDTO } from "../types";

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseSlug: string;
  topicSlug: string;
  topicTitle: string;
  questions: QuizQuestionDTO[];
  onSuccess?: () => void;
}

export function QuizModal({
  isOpen,
  onClose,
  courseSlug,
  topicSlug,
  topicTitle,
  questions,
  onSuccess,
}: QuizModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-surface-canvas/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-surface-card border border-border-subtle shadow-2xl z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-border-subtle">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Проверка знаний
            </span>
            <h3
              id="quiz-modal-title"
              className="text-lg font-bold text-text-primary"
            >
              {topicTitle}
            </h3>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label="Закрыть окно теста"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Quiz Body */}
        <QuizContainer
          courseSlug={courseSlug}
          topicSlug={topicSlug}
          questions={questions}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
}
