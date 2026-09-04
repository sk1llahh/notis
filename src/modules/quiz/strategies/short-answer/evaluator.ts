import type {
  QuestionStrategy,
  EvaluationContext,
  AnswerValidationResult,
} from "../strategy-types";
import {
  shortAnswerConfigSchema,
  shortAnswerAnswerSchema,
  type ShortAnswerConfig,
  type ShortAnswerAnswer,
} from "./schema";

/**
 * Strategy for SHORT_ANSWER questions.
 * Normalizes user input (trim, lowercase) and checks against acceptedAnswers list.
 */
export class ShortAnswerStrategy
  implements QuestionStrategy<ShortAnswerConfig, ShortAnswerAnswer>
{
  readonly type = "SHORT_ANSWER" as const;
  readonly configSchema = shortAnswerConfigSchema;
  readonly answerSchema = shortAnswerAnswerSchema;

  validateAnswer(raw: unknown): AnswerValidationResult<ShortAnswerAnswer> {
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

  evaluate(answer: ShortAnswerAnswer, context: EvaluationContext): boolean {
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
