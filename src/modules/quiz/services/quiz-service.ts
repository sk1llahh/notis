import { prisma } from "@/server/db";
import { GAMIFICATION_RULES } from "@/shared/config";
import type {
  QuizOptionDTO,
  QuizQuestionDTO,
  QuizQuestionResultDTO,
  QuizResultDTO,
  QuizSubmissionDTO,
} from "../types";

export interface EvaluatableQuestion {
  id: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
  options: { id: string; text: string; codeSnippet?: string }[];
  correctAnswerIndexes: number[];
  explanation?: string | null;
}

/**
 * Pure evaluation function for calculating quiz results.
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

  const breakdown: QuizQuestionResultDTO[] = [];
  let correctCount = 0;

  for (const q of questions) {
    const correctOptionIds = q.correctAnswerIndexes
      .map((idx) => q.options[idx]?.id ?? String(idx))
      .filter(Boolean);

    const userSelectedIds = submission.answers[q.id] ?? [];

    // Exact match evaluation
    const isCorrect =
      correctOptionIds.length === userSelectedIds.length &&
      correctOptionIds.every((id) => userSelectedIds.includes(id)) &&
      userSelectedIds.every((id) => correctOptionIds.includes(id));

    if (isCorrect) {
      correctCount++;
    }

    breakdown.push({
      questionId: q.id,
      isCorrect,
      selectedOptionIds: userSelectedIds,
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
 * IMPORTANT: Strictly omits `correctAnswerIndexes` to prevent client answer leakage.
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

    return {
      id: q.id,
      question: trans?.prompt ?? "Вопрос без описания",
      type: q.type === "MULTIPLE_CHOICE" ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE",
      options,
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

    return {
      id: q.id,
      type: q.type === "MULTIPLE_CHOICE" ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE",
      options,
      correctAnswerIndexes: q.correctAnswerIndexes,
      explanation: trans?.explanation,
    };
  });

  return calculateQuizResult(evaluatableQuestions, submission);
}
