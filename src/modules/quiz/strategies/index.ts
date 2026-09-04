/**
 * Quiz Question Strategy Registry — central initialization module.
 *
 * Imports all strategy implementations and registers them in the global registry.
 * This file must be imported once at application startup to populate the registry.
 *
 * Architecture: ARCHITECTURE_RULES §2.2 — QuestionStrategyRegistry
 */

// Registry API
export { registerStrategy, getStrategy, getRegisteredTypes, getStrategyRegistry } from "./registry";

// Strategy contract
export type {
  QuestionStrategy,
  QuizQuestionType,
  EvaluationContext,
  AnswerValidationResult,
} from "./strategy-types";

// Per-type strategy exports
export { SingleChoiceStrategy } from "./single-choice";
export { MultipleChoiceStrategy } from "./multiple-choice";
export { ShortAnswerStrategy } from "./short-answer";
export { CodeStrategy } from "./code";
export { FlashcardStrategy } from "./flashcard";

// --- Auto-registration of all strategies ---
import { registerStrategy } from "./registry";
import { SingleChoiceStrategy } from "./single-choice";
import { MultipleChoiceStrategy } from "./multiple-choice";
import { ShortAnswerStrategy } from "./short-answer";
import { CodeStrategy } from "./code";
import { FlashcardStrategy } from "./flashcard";

registerStrategy(new SingleChoiceStrategy());
registerStrategy(new MultipleChoiceStrategy());
registerStrategy(new ShortAnswerStrategy());
registerStrategy(new CodeStrategy());
registerStrategy(new FlashcardStrategy());
