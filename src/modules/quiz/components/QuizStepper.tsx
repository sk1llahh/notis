import React from "react";

interface QuizStepperProps {
  currentStep: number;
  totalSteps: number;
}

export function QuizStepper({ currentStep, totalSteps }: QuizStepperProps) {
  const percentage = totalSteps > 0 ? Math.round(((currentStep + 1) / totalSteps) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
        <span>
          Вопрос {currentStep + 1} из {totalSteps}
        </span>
        <span className="font-mono">{percentage}%</span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden">
        <div
          className="h-full bg-status-available transition-all duration-300 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
