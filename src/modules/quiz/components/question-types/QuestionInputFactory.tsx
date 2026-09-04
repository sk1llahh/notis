"use client";

import React, { type ComponentType } from "react";
import type { QuizQuestionDTO } from "../../types";
import { SingleChoiceInput } from "./SingleChoiceInput";
import { MultipleChoiceInput } from "./MultipleChoiceInput";
import { ShortAnswerInput } from "./ShortAnswerInput";
import { CodeInput } from "./CodeInput";
import { FlashcardInput } from "./FlashcardInput";

export interface QuestionInputProps {
  question: QuizQuestionDTO;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

/**
 * Registry of input components keyed by question type.
 * Adding a new question type = adding one entry here.
 *
 * Replaces the former switch/case pattern per ARCHITECTURE_RULES §2.
 */
const inputComponentRegistry: Record<
  string,
  ComponentType<QuestionInputProps>
> = {
  SINGLE_CHOICE: SingleChoiceInput,
  MULTIPLE_CHOICE: MultipleChoiceInput,
  SHORT_ANSWER: ShortAnswerInput,
  CODE: CodeInput,
  FLASHCARD: FlashcardInput,
};

export interface QuestionInputFactoryProps {
  question: QuizQuestionDTO;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

/**
 * Resolves and renders the appropriate input component for the given question type.
 * Falls back to SingleChoiceInput for unrecognized types.
 */
export function QuestionInputFactory({
  question,
  value,
  onChange,
  disabled = false,
}: QuestionInputFactoryProps) {
  const InputComponent =
    inputComponentRegistry[question.type] ?? SingleChoiceInput;

  return (
    <InputComponent
      question={question}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}
