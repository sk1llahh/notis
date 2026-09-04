import type { z } from "zod";
import type { QuizQuestionType } from "../types";

/**
 * Re-export the canonical QuizQuestionType from quiz types.
 */
export type { QuizQuestionType } from "../types";

/**
 * Context passed to evaluators for grading answers.
 * Contains the secret data (correct answers, test cases) that never reaches the client.
 */
export interface EvaluationContext {
  correctAnswerIndexes?: number[];
  acceptedAnswers?: string[];
  testCases?: Array<{ name?: string; input: any[]; expected: any }>;
  codeTemplate?: string;
  options?: Array<{ id: string; text: string; codeSnippet?: string }>;
}

/**
 * Result of validating a raw user answer before evaluation.
 */
export interface AnswerValidationResult<TAnswer = unknown> {
  valid: boolean;
  error?: string;
  parsed?: TAnswer;
}

/**
 * Core contract for a question type strategy (ARCHITECTURE_RULES §2.3).
 *
 * Every question type must provide:
 * 1. Zod schema for question configuration (Studio author side)
 * 2. Zod schema for student answer validation
 * 3. Pure server-side evaluator (no I/O, no answer leakage)
 */
export interface QuestionStrategy<TConfig = unknown, TAnswer = unknown> {
  /** Unique question type identifier */
  readonly type: QuizQuestionType;

  /** Zod schema validating question configuration created by authors in Studio */
  readonly configSchema: z.ZodType<TConfig>;

  /** Zod schema validating a student's submitted answer */
  readonly answerSchema: z.ZodType<TAnswer>;

  /**
   * Validates raw user input before evaluation.
   * Returns parsed answer or validation error.
   */
  validateAnswer(raw: unknown): AnswerValidationResult<TAnswer>;

  /**
   * Pure evaluation function. No I/O side effects.
   * @returns true if the answer is correct
   */
  evaluate(answer: TAnswer, context: EvaluationContext): boolean;
}
