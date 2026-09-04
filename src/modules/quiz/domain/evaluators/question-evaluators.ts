import { executeCodeNodeFallback } from "@/modules/code-runner/lib/worker-runner";
import type { TestCase } from "@/modules/code-runner/types";

export type QuizQuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "SHORT_ANSWER"
  | "CODE";

export interface EvaluationContext {
  correctAnswerIndexes?: number[];
  acceptedAnswers?: string[];
  testCases?: TestCase[];
  codeTemplate?: string;
  options?: Array<{ id: string; text: string; codeSnippet?: string }>;
}

export interface AnswerValidationResult<TAnswer = unknown> {
  valid: boolean;
  error?: string;
  parsed?: TAnswer;
}

export interface QuestionEvaluator<TAnswer = unknown> {
  readonly type: QuizQuestionType;
  validateAnswer(raw: unknown): AnswerValidationResult<TAnswer>;
  evaluate(answer: TAnswer, context: EvaluationContext): boolean;
}

/**
 * Evaluator for SINGLE_CHOICE questions.
 * Compares selected index with correctAnswerIndexes[0].
 * Also supports legacy string option IDs for backwards compatibility.
 */
export class SingleChoiceEvaluator implements QuestionEvaluator<number | string> {
  readonly type = "SINGLE_CHOICE" as const;

  validateAnswer(raw: unknown): AnswerValidationResult<number | string> {
    // Unwrap single item array if passed
    const candidate = Array.isArray(raw) && raw.length === 1 ? raw[0] : raw;

    if (typeof candidate === "number") {
      if (!Number.isInteger(candidate) || candidate < 0) {
        return { valid: false, error: "Индекс ответа должен быть неотрицательным целым числом" };
      }
      return { valid: true, parsed: candidate };
    }

    if (typeof candidate === "string" && candidate.trim().length > 0) {
      const trimmed = candidate.trim();
      const num = Number(trimmed);
      if (Number.isInteger(num) && num >= 0 && String(num) === trimmed) {
        return { valid: true, parsed: num };
      }
      return { valid: true, parsed: trimmed };
    }

    return {
      valid: false,
      error: "Ответ для одиночного выбора должен быть числовым индексом или идентификатором варианта",
    };
  }

  evaluate(answer: number | string, context: EvaluationContext): boolean {
    const correctIdx = context.correctAnswerIndexes?.[0];
    if (correctIdx === undefined || correctIdx < 0) {
      return false;
    }

    // Number index comparison
    if (typeof answer === "number") {
      return answer === correctIdx;
    }

    // String comparison: could be stringified index or option.id
    if (String(correctIdx) === answer) {
      return true;
    }

    const correctOptionId = context.options?.[correctIdx]?.id;
    if (correctOptionId && correctOptionId === answer) {
      return true;
    }

    return false;
  }
}

/**
 * Evaluator for MULTIPLE_CHOICE questions.
 * Ensures that the student's selected indexes match exactly the correct indexes set.
 */
export class MultipleChoiceEvaluator implements QuestionEvaluator<Array<number | string>> {
  readonly type = "MULTIPLE_CHOICE" as const;

  validateAnswer(raw: unknown): AnswerValidationResult<Array<number | string>> {
    if (!Array.isArray(raw)) {
      return {
        valid: false,
        error: "Ответ для множественного выбора должен быть массивом",
      };
    }

    const parsed: Array<number | string> = [];
    for (const item of raw) {
      if (typeof item === "number" && Number.isInteger(item) && item >= 0) {
        parsed.push(item);
      } else if (typeof item === "string" && item.trim().length > 0) {
        const trimmed = item.trim();
        const num = Number(trimmed);
        if (Number.isInteger(num) && num >= 0 && String(num) === trimmed) {
          parsed.push(num);
        } else {
          parsed.push(trimmed);
        }
      } else {
        return {
          valid: false,
          error: "Элементы ответа должны быть индексами или строковыми идентификаторами",
        };
      }
    }

    return { valid: true, parsed };
  }

  evaluate(answer: Array<number | string>, context: EvaluationContext): boolean {
    const correctIndexes = context.correctAnswerIndexes ?? [];
    if (correctIndexes.length === 0) {
      return answer.length === 0;
    }

    // Check if user answered with numbers
    const allNumeric = answer.every((a) => typeof a === "number");

    if (allNumeric) {
      const userUniqueSorted = Array.from(new Set(answer as number[])).sort((a, b) => a - b);
      const correctSorted = Array.from(new Set(correctIndexes)).sort((a, b) => a - b);

      if (userUniqueSorted.length !== correctSorted.length) {
        return false;
      }

      return userUniqueSorted.every((val, idx) => val === correctSorted[idx]);
    }

    // String / option IDs fallback
    const correctOptionIds = correctIndexes
      .map((idx) => context.options?.[idx]?.id ?? String(idx))
      .filter(Boolean);

    const userSelectedStrings = answer.map(String);

    if (userSelectedStrings.length !== correctOptionIds.length) {
      return false;
    }

    const correctSet = new Set(correctOptionIds);
    const userSet = new Set(userSelectedStrings);

    if (correctSet.size !== userSet.size) {
      return false;
    }

    for (const id of correctSet) {
      if (!userSet.has(id)) return false;
    }

    return true;
  }
}

/**
 * Evaluator for SHORT_ANSWER questions.
 * Normalizes user input (trim, lowercase) and checks against acceptedAnswers list.
 */
export class ShortAnswerEvaluator implements QuestionEvaluator<string> {
  readonly type = "SHORT_ANSWER" as const;

  validateAnswer(raw: unknown): AnswerValidationResult<string> {
    const candidate = Array.isArray(raw) && raw.length === 1 ? raw[0] : raw;

    if (typeof candidate !== "string") {
      return {
        valid: false,
        error: "Текстовый ответ должен быть строкой",
      };
    }

    const trimmed = candidate.trim();
    if (trimmed.length === 0) {
      return {
        valid: false,
        error: "Текстовый ответ не может быть пустым",
      };
    }

    return { valid: true, parsed: trimmed };
  }

  evaluate(answer: string, context: EvaluationContext): boolean {
    const normalizedInput = answer.trim().toLowerCase();
    const acceptedAnswers = context.acceptedAnswers ?? [];

    if (acceptedAnswers.length === 0) {
      return false;
    }

    return acceptedAnswers.some(
      (accepted) => accepted.trim().toLowerCase() === normalizedInput
    );
  }
}

/**
 * Evaluator for CODE questions.
 * Validates non-empty code and executes test cases in isolated runner.
 */
export class CodeEvaluator implements QuestionEvaluator<string> {
  readonly type = "CODE" as const;

  validateAnswer(raw: unknown): AnswerValidationResult<string> {
    const candidate = Array.isArray(raw) && raw.length === 1 ? raw[0] : raw;

    if (typeof candidate !== "string") {
      return {
        valid: false,
        error: "Решение должно быть строковым кодом",
      };
    }

    if (candidate.trim().length === 0) {
      return {
        valid: false,
        error: "Код решения не может быть пустым",
      };
    }

    return { valid: true, parsed: candidate };
  }

  evaluate(answer: string, context: EvaluationContext): boolean {
    const testCases = context.testCases;

    if (!testCases || testCases.length === 0) {
      return answer.trim().length > 0;
    }

    const runResult = executeCodeNodeFallback({
      code: answer,
      testCases,
    });

    return Boolean(runResult.success && runResult.allTestsPassed);
  }
}

/**
 * Question Strategy Evaluator Registry
 */
export const questionEvaluatorRegistry: Record<
  QuizQuestionType,
  QuestionEvaluator<any>
> = {
  SINGLE_CHOICE: new SingleChoiceEvaluator(),
  MULTIPLE_CHOICE: new MultipleChoiceEvaluator(),
  SHORT_ANSWER: new ShortAnswerEvaluator(),
  CODE: new CodeEvaluator(),
};

/**
 * Resolves the evaluator for a given question type.
 * Maps legacy OPEN_TEXT to SHORT_ANSWER.
 */
export function getQuestionEvaluator(type: string): QuestionEvaluator<any> {
  const normalizedType =
    type === "OPEN_TEXT" ? "SHORT_ANSWER" : (type as QuizQuestionType);

  const evaluator = questionEvaluatorRegistry[normalizedType];
  if (!evaluator) {
    throw new Error(`Unsupported question type evaluator: ${type}`);
  }

  return evaluator;
}
