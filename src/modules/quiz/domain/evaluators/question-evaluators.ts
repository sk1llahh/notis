/**
 * Backward-compatible facade for question evaluators.
 *
 * The actual strategy implementations now live in `src/modules/quiz/strategies/`.
 * This file re-exports the legacy API to avoid breaking existing imports.
 *
 * @deprecated Import from `@/modules/quiz/strategies` instead.
 */

// Ensure all strategies are registered
import "../../strategies";

// Re-export strategy classes under their legacy names
import { SingleChoiceStrategy } from "../../strategies/single-choice";
import { MultipleChoiceStrategy } from "../../strategies/multiple-choice";
import { ShortAnswerStrategy } from "../../strategies/short-answer";
import { CodeStrategy } from "../../strategies/code";
import { FlashcardStrategy } from "../../strategies/flashcard";

// Legacy class aliases
export {
  SingleChoiceStrategy as SingleChoiceEvaluator,
  MultipleChoiceStrategy as MultipleChoiceEvaluator,
  ShortAnswerStrategy as ShortAnswerEvaluator,
  CodeStrategy as CodeEvaluator,
  FlashcardStrategy as FlashcardEvaluator,
};

// Re-export types
export type {
  QuizQuestionType,
  EvaluationContext,
  AnswerValidationResult,
  QuestionStrategy as QuestionEvaluator,
} from "../../strategies/strategy-types";

// Re-export registry functions under legacy names
import { getStrategy, getStrategyRegistry } from "../../strategies/registry";

/**
 * @deprecated Use `getStrategy` from `@/modules/quiz/strategies` instead.
 */
export function getQuestionEvaluator(type: string) {
  return getStrategy(type);
}

/**
 * @deprecated Use `getStrategyRegistry` from `@/modules/quiz/strategies` instead.
 */
export const questionEvaluatorRegistry = new Proxy(
  {} as Record<string, any>,
  {
    get(_target, prop: string) {
      try {
        return getStrategy(prop);
      } catch {
        return undefined;
      }
    },
    ownKeys() {
      const reg = getStrategyRegistry();
      return Object.keys(reg);
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      try {
        const strategy = getStrategy(prop);
        return {
          configurable: true,
          enumerable: true,
          value: strategy,
        };
      } catch {
        return undefined;
      }
    },
  }
);
