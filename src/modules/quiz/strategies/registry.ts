import type { QuestionStrategy, QuizQuestionType } from "./strategy-types";

/**
 * Central registry for question type strategies.
 * All question types are registered here and resolved by type key.
 *
 * This eliminates hardcoded if/switch chains per ARCHITECTURE_RULES §2.
 */
const strategyMap = new Map<string, QuestionStrategy<any, any>>();

/** Legacy type mappings for backward compatibility */
const LEGACY_TYPE_MAP: Record<string, QuizQuestionType> = {
  OPEN_TEXT: "SHORT_ANSWER",
};

/**
 * Registers a question strategy in the global registry.
 * Called once per strategy at module initialization.
 */
export function registerStrategy(strategy: QuestionStrategy<any, any>): void {
  if (strategyMap.has(strategy.type)) {
    throw new Error(
      `QuestionStrategyRegistry: duplicate registration for type "${strategy.type}"`
    );
  }
  strategyMap.set(strategy.type, strategy);
}

/**
 * Resolves the strategy for a given question type.
 * Handles legacy type mappings (e.g. OPEN_TEXT → SHORT_ANSWER).
 *
 * @throws Error if the type is not registered
 */
export function getStrategy(type: string): QuestionStrategy<any, any> {
  const normalizedType = LEGACY_TYPE_MAP[type] ?? type;
  const strategy = strategyMap.get(normalizedType);

  if (!strategy) {
    throw new Error(
      `QuestionStrategyRegistry: no strategy registered for type "${type}"${
        normalizedType !== type ? ` (normalized from "${type}")` : ""
      }`
    );
  }

  return strategy;
}

/**
 * Returns all registered strategy types.
 * Useful for iteration and validation.
 */
export function getRegisteredTypes(): QuizQuestionType[] {
  return Array.from(strategyMap.keys()) as QuizQuestionType[];
}

/**
 * Returns the entire registry as a plain Record for backward compatibility.
 */
export function getStrategyRegistry(): Record<string, QuestionStrategy<any, any>> {
  return Object.fromEntries(strategyMap);
}
