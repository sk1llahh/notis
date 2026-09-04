"use client";

import React from "react";
import { CodeRunner } from "@/modules/code-runner";
import type { QuizQuestionDTO } from "../../types";

export interface CodeInputProps {
  question: QuizQuestionDTO;
  value: string | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CodeInput({
  question,
  value,
  onChange,
  disabled = false,
}: CodeInputProps) {
  const initialCode =
    (typeof value === "string" && value.trim().length > 0 ? value : null) ??
    question.codeTemplate ??
    "// Напишите ваше решение здесь\nfunction solution() {\n  \n}\n";

  return (
    <div className="space-y-2">
      <CodeRunner
        initialCode={initialCode}
        testCases={question.testCases ?? []}
        onSuccess={(code) => {
          if (!disabled) {
            onChange(code);
          }
        }}
        readOnly={disabled}
      />
    </div>
  );
}
