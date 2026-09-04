import { z } from "zod";

export const quizAnswerItemSchema = z.object({
  questionId: z.string().min(1, "ID вопроса обязателен"),
  answer: z.unknown(),
});

export const submitQuizSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicSlug: z.string().min(1, "Слаг темы обязателен"),
  answers: z.union([
    z.array(quizAnswerItemSchema),
    z.record(z.string(), z.unknown()),
  ]),
});

export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;

export const retakeQuizSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicSlug: z.string().min(1, "Слаг темы обязателен"),
});

export type RetakeQuizInput = z.infer<typeof retakeQuizSchema>;
