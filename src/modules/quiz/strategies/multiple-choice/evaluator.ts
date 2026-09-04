import type {
  QuestionStrategy,
  EvaluationContext,
  AnswerValidationResult,
} from "../strategy-types";
import {
  multipleChoiceConfigSchema,
  multipleChoiceAnswerSchema,
  type MultipleChoiceConfig,
  type MultipleChoiceAnswer,
} from "./schema";

/**
 * Strategy for MULTIPLE_CHOICE questions.
 * Ensures that the student's selected indexes match exactly the correct indexes set.
 */
export class MultipleChoiceStrategy
  implements QuestionStrategy<MultipleChoiceConfig, MultipleChoiceAnswer>
{
  readonly type = "MULTIPLE_CHOICE" as const;
  readonly configSchema = multipleChoiceConfigSchema;
  readonly answerSchema = multipleChoiceAnswerSchema;

  validateAnswer(
    raw: unknown
  ): AnswerValidationResult<MultipleChoiceAnswer> {
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
          error:
            "Элементы ответа должны быть индексами или строковыми идентификаторами",
        };
      }
    }

    return { valid: true, parsed };
  }

  evaluate(
    answer: MultipleChoiceAnswer,
    context: EvaluationContext
  ): boolean {
    const correctIndexes = context.correctAnswerIndexes ?? [];
    if (correctIndexes.length === 0) {
      return answer.length === 0;
    }

    // Check if user answered with numbers
    const allNumeric = answer.every((a) => typeof a === "number");

    if (allNumeric) {
      const userUniqueSorted = Array.from(new Set(answer as number[])).sort(
        (a, b) => a - b
      );
      const correctSorted = Array.from(new Set(correctIndexes)).sort(
        (a, b) => a - b
      );

      if (userUniqueSorted.length !== correctSorted.length) {
        return false;
      }

      return userUniqueSorted.every(
        (val, idx) => val === correctSorted[idx]
      );
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
