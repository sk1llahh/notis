import type {
  QuestionStrategy,
  EvaluationContext,
  AnswerValidationResult,
} from "../strategy-types";
import {
  flashcardConfigSchema,
  flashcardAnswerSchema,
  type FlashcardConfig,
  type FlashcardAnswer,
} from "./schema";

/**
 * Strategy for FLASHCARD questions (self-assessment cards).
 *
 * Flashcards use the SM-2 quality rating (0-5) for self-evaluation.
 * The card is considered "correct" if the quality rating >= 3
 * (student recalled the answer successfully).
 */
export class FlashcardStrategy
  implements QuestionStrategy<FlashcardConfig, FlashcardAnswer>
{
  readonly type = "FLASHCARD" as const;
  readonly configSchema = flashcardConfigSchema;
  readonly answerSchema = flashcardAnswerSchema;

  validateAnswer(raw: unknown): AnswerValidationResult<FlashcardAnswer> {
    // Unwrap single item array
    const candidate = Array.isArray(raw) && raw.length === 1 ? raw[0] : raw;

    if (typeof candidate === "number") {
      if (!Number.isInteger(candidate) || candidate < 0 || candidate > 5) {
        return {
          valid: false,
          error: "Оценка должна быть целым числом от 0 до 5",
        };
      }
      return { valid: true, parsed: candidate };
    }

    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed.length === 0) {
        return {
          valid: false,
          error: "Ответ для карточки должен быть оценкой от 0 до 5",
        };
      }
      const num = Number(trimmed);
      if (Number.isInteger(num) && num >= 0 && num <= 5) {
        return { valid: true, parsed: num };
      }
    }

    return {
      valid: false,
      error: "Ответ для карточки должен быть оценкой от 0 до 5",
    };
  }

  evaluate(answer: FlashcardAnswer, _context: EvaluationContext): boolean {
    // SM-2: quality >= 3 means successful recall
    return typeof answer === "number" && answer >= 3;
  }
}
