import type { TestCase } from "@/modules/code-runner";

export type QuizQuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "SHORT_ANSWER"
  | "CODE"
  | "FLASHCARD";

export interface QuizOptionDTO {
  id: string;
  text: string;
  codeSnippet?: string;
}

export interface QuizQuestionDTO {
  id: string;
  question: string;
  type: QuizQuestionType;
  codeSnippet?: string;
  options: QuizOptionDTO[];
  codeTemplate?: string;
  testCases?: TestCase[];
}

export interface QuizSubmissionAnswerItem {
  questionId: string;
  answer: unknown;
}

export interface QuizSubmissionDTO {
  answers: Array<QuizSubmissionAnswerItem> | Record<string, unknown>;
}

export interface QuizQuestionResultDTO {
  questionId: string;
  isCorrect: boolean;
  selectedAnswer?: unknown;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  explanation?: string | null;
}

export interface QuizResultDTO {
  score: number; // 0 - 100
  passed: boolean; // threshold >= 80
  xpEarned: number; // GAMIFICATION_RULES.XP_QUIZ_PERFECT_SCORE if 100%, else 0
  totalQuestions: number;
  correctQuestions: number;
  breakdown: QuizQuestionResultDTO[];
}
