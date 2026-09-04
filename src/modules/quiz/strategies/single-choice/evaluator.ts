import type {
  QuestionStrategy,
  EvaluationContext,
  AnswerValidationResult,
} from "../strategy-types";
import {
  singleChoiceConfigSchema,
  singleChoiceAnswerSchema,
  type SingleChoiceConfig,
  type SingleChoiceAnswer,
} from "./schema";

/**
 * Strategy for SINGLE_CHOICE questions.
 * Compares selected index with correctAnswerIndexes[0].
 * Also supports legacy string option IDs for backwards compatibility.
 */
export class SingleChoiceStrategy
  implements QuestionStrategy<SingleChoiceConfig, SingleChoiceAnswer>
{
  readonly type = "SINGLE_CHOICE" as const;
  readonly configSchema = singleChoiceConfigSchema;
  readonly answerSchema = singleChoiceAnswerSchema;

  validateAnswer(raw: unknown): AnswerValidationResult<SingleChoiceAnswer> {
    // Unwrap single item array if passed
    const candidate = Array.isArray(raw) && raw.length === 1 ? raw[0] : raw;

    if (typeof candidate === "number") {
      if (!Number.isInteger(candidate) || candidate < 0) {
        return {
          valid: false,
          error: "Индекс ответа должен быть неотрицательным целым числом",
        };
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
      error:
        "Ответ для одиночного выбора должен быть числовым индексом или идентификатором варианта",
    };
  }

  evaluate(answer: SingleChoiceAnswer, context: EvaluationContext): boolean {
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
