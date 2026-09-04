import { executeCodeNodeFallback } from "@/modules/code-runner/lib/worker-runner";
import type {
  QuestionStrategy,
  EvaluationContext,
  AnswerValidationResult,
} from "../strategy-types";
import {
  codeConfigSchema,
  codeAnswerSchema,
  type CodeConfig,
  type CodeAnswer,
} from "./schema";

/**
 * Strategy for CODE questions.
 * Validates non-empty code and executes test cases in isolated runner.
 */
export class CodeStrategy
  implements QuestionStrategy<CodeConfig, CodeAnswer>
{
  readonly type = "CODE" as const;
  readonly configSchema = codeConfigSchema;
  readonly answerSchema = codeAnswerSchema;

  validateAnswer(raw: unknown): AnswerValidationResult<CodeAnswer> {
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

  evaluate(answer: CodeAnswer, context: EvaluationContext): boolean {
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
