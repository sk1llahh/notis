import { z } from "zod";

/**
 * Zod schema for test cases in CODE questions during import.
 */
export const importedCodeTestCaseSchema = z.object({
  name: z.string().optional(),
  input: z.array(z.any()).default([]),
  expected: z.any().optional(),
  expectedOutput: z.any().optional(),
  description: z.string().optional(),
  isHidden: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
});

export type ImportedCodeTestCase = z.infer<typeof importedCodeTestCaseSchema>;

/**
 * Zod schema for CODE question configuration.
 */
export const importedCodeConfigSchema = z.object({
  language: z.string().optional(),
  initialCode: z.string().optional(),
  solutionTemplate: z.string().optional(),
  codeTemplate: z.string().optional(),
  testCases: z.array(importedCodeTestCaseSchema).default([]),
});

export type ImportedCodeConfig = z.infer<typeof importedCodeConfigSchema>;

/**
 * Zod schema for quiz questions during import.
 * Supports SINGLE_CHOICE, MULTIPLE_CHOICE, SHORT_ANSWER, CODE, FLASHCARD.
 * Automatically normalizes correctOptionIndex and correctOptionIndices into correctAnswerIndexes.
 */
export const importedQuestionSchema = z
  .object({
    type: z.enum([
      "SINGLE_CHOICE",
      "MULTIPLE_CHOICE",
      "SHORT_ANSWER",
      "CODE",
      "FLASHCARD",
    ]),
    prompt: z.string().min(1, "Текст вопроса обязателен"),
    options: z.array(z.string()).optional(),
    correctAnswerIndexes: z.array(z.number().int().nonnegative()).optional(),
    correctOptionIndex: z.number().int().nonnegative().optional(),
    correctOptionIndices: z.array(z.number().int().nonnegative()).optional(),
    acceptedAnswers: z.array(z.string()).optional(),
    codeConfig: importedCodeConfigSchema.optional(),
    explanation: z.string().optional(),
  })
  .transform((data) => {
    let indexes = data.correctAnswerIndexes;
    if (!indexes || indexes.length === 0) {
      if (typeof data.correctOptionIndex === "number") {
        indexes = [data.correctOptionIndex];
      } else if (Array.isArray(data.correctOptionIndices)) {
        indexes = data.correctOptionIndices;
      }
    }
    return {
      ...data,
      correctAnswerIndexes: indexes ?? [],
    };
  });

export type ImportedQuestion = z.infer<typeof importedQuestionSchema>;

/**
 * Zod schema for manual SM-2 flashcards during import.
 */
export const importedFlashcardSchema = z.object({
  front: z.string().min(1, "Лицевая сторона карточки обязательна"),
  back: z.string().min(1, "Обратная сторона карточки обязательна"),
});

export type ImportedFlashcard = z.infer<typeof importedFlashcardSchema>;

/**
 * Zod schema for the standalone topic JSON manifest (file / raw paste payload).
 * Does not require courseSlug or tierId as they are selected in the UI.
 */
export const importedTopicPayloadSchema = z.object({
  title: z
    .string()
    .min(2, "Заголовок темы должен содержать минимум 2 символа")
    .max(150, "Заголовок темы не может превышать 150 символов"),
  slug: z
    .string()
    .min(2, "Слаг должен содержать минимум 2 символа")
    .max(100, "Слаг не может превышать 100 символов")
    .regex(
      /^[a-z0-9-]+$/,
      "Слаг может содержать только строчные латинские буквы, цифры и дефис"
    ),
  difficulty: z
    .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"])
    .default("BEGINNER"),
  estimatedMinutes: z
    .number()
    .int("Время прохождения должно быть целым числом")
    .min(1, "Минимум 1 минута")
    .max(600, "Максимум 600 минут")
    .default(15),
  isFreePreview: z.boolean().default(false),
  description: z.string().min(1, "Тело статьи (Markdown) не может быть пустым"),
  summary: z
    .string()
    .max(300, "Выжимка не может превышать 300 символов")
    .optional()
    .default(""),
  keyPoints: z.array(z.string()).default([]),
  pitfalls: z.array(z.string()).default([])
    .refine((items) => Array.isArray(items), "Ошибки и ловушки должны быть массивом"),
  questions: z.array(importedQuestionSchema).default([]),
  flashcards: z.array(importedFlashcardSchema).default([]),
});

export type ImportedTopicPayload = z.infer<typeof importedTopicPayloadSchema>;

/**
 * Full root schema for the Server Action importing a topic into a course and tier.
 */
export const importTopicSchema = importedTopicPayloadSchema.extend({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  tierId: z.string().min(1, "Необходимо выбрать тир/модуль курса"),
});

export type ImportTopicInput = z.infer<typeof importTopicSchema>;

/**
 * Server Action output schema.
 */
export interface ImportTopicOutput {
  topicId: string;
  slug: string;
  title: string;
  difficulty: string;
  tierId: string;
  questionsCount: number;
  flashcardsCount: number;
  positionX: number;
  positionY: number;
}
