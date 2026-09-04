"use client";

import React from "react";
import type { QuizQuestionDTO } from "../../types";
import { SingleChoiceInput } from "./SingleChoiceInput";
import { MultipleChoiceInput } from "./MultipleChoiceInput";
import { ShortAnswerInput } from "./ShortAnswerInput";
import { CodeInput } from "./CodeInput";

export interface QuestionInputFactoryProps {
  question: QuizQuestionDTO;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

export function QuestionInputFactory({
  question,
  value,
  onChange,
  disabled = false,
}: QuestionInputFactoryProps) {
  switch (question.type) {
    case "SINGLE_CHOICE":
      return (
        <SingleChoiceInput
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "MULTIPLE_CHOICE":
      return (
        <MultipleChoiceInput
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "SHORT_ANSWER":
      return (
        <ShortAnswerInput
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "CODE":
      return (
        <CodeInput
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );

    default:
      // Fallback for unexpected or legacy types
      return (
        <SingleChoiceInput
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );
  }
}
