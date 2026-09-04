import { z } from "zod";

export const createFlashcardSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicId: z.string().min(1, "ID темы обязателен"),
  front: z.string().trim().min(3, "Вопрос должен содержать от 3 символов"),
  back: z.string().trim().min(3, "Ответ должен содержать от 3 символов"),
});

export type CreateFlashcardInput = z.infer<typeof createFlashcardSchema>;

export const updateFlashcardSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  questionId: z.string().min(1, "ID карточки обязателен"),
  front: z.string().trim().min(3, "Вопрос должен содержать от 3 символов"),
  back: z.string().trim().min(3, "Ответ должен содержать от 3 символов"),
});

export type UpdateFlashcardInput = z.infer<typeof updateFlashcardSchema>;

export const deleteFlashcardSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  questionId: z.string().min(1, "ID карточки обязателен"),
});

export type DeleteFlashcardInput = z.infer<typeof deleteFlashcardSchema>;

export const getTopicFlashcardsSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicId: z.string().min(1, "ID темы обязателен"),
});

export type GetTopicFlashcardsInput = z.infer<typeof getTopicFlashcardsSchema>;

export interface FlashcardDTO {
  id: string;
  topicId: string;
  front: string;
  back: string;
  order: number;
}
