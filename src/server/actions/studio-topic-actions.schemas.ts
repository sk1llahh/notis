import { z } from "zod";

export const updateTopicContentSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicId: z.string().min(1, "ID темы обязателен"),
  title: z.string().min(2, "Заголовок должен содержать не менее 2 символов"),
  summary: z.string().default(""),
  description: z.string().optional(),
  isFreePreview: z.boolean().default(false),
  estimatedMinutes: z
    .number()
    .int()
    .min(1, "Минимум 1 минута")
    .max(300, "Максимум 300 минут")
    .default(15),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  keyPoints: z.array(z.string()).default([]),
  pitfalls: z.array(z.string()).default([]),
});

export type UpdateTopicContentInput = z.infer<typeof updateTopicContentSchema>;

export interface UpdateTopicContentOutput {
  topicId: string;
  title: string;
  difficulty: string;
  isFreePreview?: boolean;
  estimatedMinutes?: number;
}

export const quizOptionSchema = z.object({
  text: z.string().min(1, "Текст варианта ответа обязателен"),
  codeSnippet: z.string().optional(),
});

export const upsertQuizQuestionSchema = z
  .object({
    courseSlug: z.string().min(1, "Слаг курса обязателен"),
    topicId: z.string().min(1, "ID темы обязателен"),
    questionId: z.string().optional(),
    question: z
      .string()
      .min(5, "Текст вопроса должен содержать не менее 5 символов"),
    type: z
      .enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "SHORT_ANSWER", "CODE"])
      .default("SINGLE_CHOICE"),
    options: z.array(quizOptionSchema).optional().default([]),
    correctIndexes: z.array(z.number()).optional().default([]),
    acceptedAnswers: z.array(z.string()).optional().default([]),
    codeTemplate: z.string().optional(),
    testCases: z.array(z.any()).optional().default([]),
    explanation: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "SINGLE_CHOICE" || data.type === "MULTIPLE_CHOICE") {
        return data.options.length >= 2;
      }
      return true;
    },
    {
      message: "Требуется минимум 2 варианта ответа для вопроса с выбором",
      path: ["options"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "SINGLE_CHOICE" || data.type === "MULTIPLE_CHOICE") {
        return (
          data.correctIndexes.length >= 1 &&
          data.correctIndexes.every(
            (idx) =>
              Number.isInteger(idx) && idx >= 0 && idx < data.options.length
          )
        );
      }
      return true;
    },
    {
      message: "Индексы правильных ответов выходят за диапазон вариантов",
      path: ["correctIndexes"],
    }
  )
  .refine(
    (data) =>
      data.type !== "SINGLE_CHOICE" || data.correctIndexes.length === 1,
    {
      message: "Для одиночного выбора допускается строго один правильный ответ",
      path: ["correctIndexes"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "SHORT_ANSWER") {
        return (
          data.acceptedAnswers.length > 0 &&
          data.acceptedAnswers.some((a) => a.trim().length > 0)
        );
      }
      return true;
    },
    {
      message: "Укажите хотя бы один правильный текстовый ответ",
      path: ["acceptedAnswers"],
    }
  );

export type UpsertQuizQuestionInput = z.infer<typeof upsertQuizQuestionSchema>;

export interface UpsertQuizQuestionOutput {
  id: string;
  topicId: string;
}

export const deleteQuizQuestionSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicId: z.string().min(1, "ID темы обязателен"),
  questionId: z.string().min(1, "ID вопроса обязателен"),
});

export type DeleteQuizQuestionInput = z.infer<typeof deleteQuizQuestionSchema>;

export interface DeleteQuizQuestionOutput {
  questionId: string;
  topicId: string;
}

export const publishTopicSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicId: z.string().min(1, "ID темы обязателен"),
  isPublished: z.boolean(),
  bumpVersion: z.boolean(),
});

export type PublishTopicInput = z.infer<typeof publishTopicSchema>;

export interface PublishTopicOutput {
  topicId: string;
  isPublished: boolean;
  version: number;
}

export const getTopicStudioDetailsSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicId: z.string().min(1, "ID темы обязателен"),
});

export type GetTopicStudioDetailsInput = z.infer<
  typeof getTopicStudioDetailsSchema
>;
