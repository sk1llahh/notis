import { prisma } from "@/server/db";
import { GAMIFICATION_RULES } from "@/shared/config";
import type { TestCase } from "@/modules/code-runner";
import { getQuestionEvaluator } from "../domain/evaluators/question-evaluators";
import type {
  QuizOptionDTO,
  QuizQuestionDTO,
  QuizQuestionResultDTO,
  QuizResultDTO,
  QuizSubmissionDTO,
  QuizQuestionType,
} from "../types";

export interface EvaluatableQuestion {
  id: string;
  type: QuizQuestionType;
  options: { id: string; text: string; codeSnippet?: string }[];
  correctAnswerIndexes: number[];
  acceptedAnswers?: string[];
  codeTemplate?: string;
  testCases?: TestCase[];
  explanation?: string | null;
}

/**
 * Normalizes user submission answers into a Map for fast lookup.
 * Supports both Array<{ questionId, answer }> and Record<string, unknown>.
 */
function normalizeSubmissionAnswers(answers: QuizSubmissionDTO["answers"]): Map<string, unknown> {
  const map = new Map<string, unknown>();
  if (Array.isArray(answers)) {
    for (const item of answers) {
      map.set(item.questionId, item.answer);
    }
  } else if (typeof answers === "object" && answers !== null) {
    for (const [key, val] of Object.entries(answers)) {
      map.set(key, val);
    }
  }
  return map;
}

/**
 * Pure evaluation function for calculating quiz results using the Question Strategy Engine.
 * Can be tested in isolation with zero I/O side effects.
 */
export function calculateQuizResult(
  questions: EvaluatableQuestion[],
  submission: QuizSubmissionDTO
): QuizResultDTO {
  const totalQuestions = questions.length;
  if (totalQuestions === 0) {
    return {
      score: 100,
      passed: true,
      xpEarned: 0,
      totalQuestions: 0,
      correctQuestions: 0,
      breakdown: [],
    };
  }

  const answerMap = normalizeSubmissionAnswers(submission.answers);
  const breakdown: QuizQuestionResultDTO[] = [];
  let correctCount = 0;

  for (const q of questions) {
    const rawAnswer = answerMap.get(q.id);
    const evaluator = getQuestionEvaluator(q.type);

    let isCorrect = false;
    let selectedOptionIds: string[] = [];

    const validation = evaluator.validateAnswer(rawAnswer);
    if (validation.valid && validation.parsed !== undefined) {
      isCorrect = evaluator.evaluate(validation.parsed, {
        correctAnswerIndexes: q.correctAnswerIndexes,
        acceptedAnswers: q.acceptedAnswers,
        testCases: q.testCases,
        codeTemplate: q.codeTemplate,
        options: q.options,
      });
    }

    if (Array.isArray(rawAnswer)) {
      selectedOptionIds = rawAnswer.map(String);
    } else if (rawAnswer !== undefined && rawAnswer !== null) {
      selectedOptionIds = [String(rawAnswer)];
    }

    const correctOptionIds = (q.correctAnswerIndexes ?? [])
      .map((idx) => q.options[idx]?.id ?? String(idx))
      .filter(Boolean);

    if (isCorrect) {
      correctCount++;
    }

    breakdown.push({
      questionId: q.id,
      isCorrect,
      selectedAnswer: rawAnswer,
      selectedOptionIds,
      correctOptionIds,
      explanation: q.explanation ?? null,
    });
  }

  const score = Math.round((correctCount / totalQuestions) * 100);
  const passed = score >= 80;
  const xpEarned =
    score === 100 ? GAMIFICATION_RULES.XP_QUIZ_PERFECT_SCORE : 0;

  return {
    score,
    passed,
    xpEarned,
    totalQuestions,
    correctQuestions: correctCount,
    breakdown,
  };
}

/**
 * Parses raw JSON options from Prisma into structured QuizOptionDTO array
 */
function parseQuestionOptions(rawOptions: unknown): QuizOptionDTO[] {
  if (!Array.isArray(rawOptions)) {
    return [];
  }

  return rawOptions.map((opt, index) => {
    if (typeof opt === "string") {
      return {
        id: String(index),
        text: opt,
      };
    }
    if (typeof opt === "object" && opt !== null) {
      const o = opt as Record<string, unknown>;
      return {
        id: typeof o.id === "string" ? o.id : String(index),
        text: typeof o.text === "string" ? o.text : "",
        codeSnippet:
          typeof o.codeSnippet === "string" ? o.codeSnippet : undefined,
      };
    }
    return {
      id: String(index),
      text: String(opt),
    };
  });
}

/**
 * Server Service: Fetches quiz questions for a topic.
 * IMPORTANT: Strictly omits `correctAnswerIndexes` and `acceptedAnswers` to prevent client answer leakage (Zero-Trust).
 */
export async function getQuizForTopic(
  topicId: string,
  locale = "ru"
): Promise<QuizQuestionDTO[]> {
  const questions = await prisma.question.findMany({
    where: {
      topicId,
      isArchived: false,
    },
    include: {
      translations: true,
    },
    orderBy: {
      order: "asc",
    },
  });

  return questions.map((q) => {
    const trans =
      q.translations.find((t) => t.locale === locale) ??
      q.translations.find((t) => t.locale === "ru") ??
      q.translations[0];

    const options = parseQuestionOptions(trans?.options);
    const config = trans?.gradingConfig as Record<string, unknown> | null;
    let codeTemplate: string | undefined = undefined;
    let testCases: TestCase[] | undefined = undefined;

    const normalizedType: QuizQuestionType =
      q.type === "OPEN_TEXT"
        ? "SHORT_ANSWER"
        : (q.type as QuizQuestionType);

    if (normalizedType === "CODE" && config) {
      if (typeof config.codeTemplate === "string") {
        codeTemplate = config.codeTemplate;
      }
      if (Array.isArray(config.testCases)) {
        testCases = config.testCases as TestCase[];
      }
    }

    return {
      id: q.id,
      question: trans?.prompt ?? "Вопрос без описания",
      type: normalizedType,
      options,
      codeTemplate,
      testCases,
    };
  });
}

/**
 * Server Service: Evaluates a user's quiz submission against database answers.
 */
export async function evaluateQuizSubmission(
  topicId: string,
  submission: QuizSubmissionDTO,
  locale = "ru"
): Promise<QuizResultDTO> {
  const dbQuestions = await prisma.question.findMany({
    where: {
      topicId,
      isArchived: false,
    },
    include: {
      translations: true,
    },
    orderBy: {
      order: "asc",
    },
  });

  const evaluatableQuestions: EvaluatableQuestion[] = dbQuestions.map((q) => {
    const trans =
      q.translations.find((t) => t.locale === locale) ??
      q.translations.find((t) => t.locale === "ru") ??
      q.translations[0];

    const options = parseQuestionOptions(trans?.options);
    const config = trans?.gradingConfig as Record<string, unknown> | null;
    let codeTemplate: string | undefined = undefined;
    let testCases: TestCase[] | undefined = undefined;
    let acceptedAnswers: string[] | undefined = undefined;

    const normalizedType: QuizQuestionType =
      q.type === "OPEN_TEXT"
        ? "SHORT_ANSWER"
        : (q.type as QuizQuestionType);

    if (config) {
      if (typeof config.codeTemplate === "string") {
        codeTemplate = config.codeTemplate;
      }
      if (Array.isArray(config.testCases)) {
        testCases = config.testCases as TestCase[];
      }
      if (Array.isArray(config.acceptedAnswers)) {
        acceptedAnswers = config.acceptedAnswers.map(String);
      }
    }

    return {
      id: q.id,
      type: normalizedType,
      options,
      correctAnswerIndexes: q.correctAnswerIndexes,
      acceptedAnswers,
      codeTemplate,
      testCases,
      explanation: trans?.explanation,
    };
  });

  return calculateQuizResult(evaluatableQuestions, submission);
}
