import { z } from "zod";

/**
 * Zod schema for FLASHCARD question configuration (Studio / Flashcard Builder).
 * Front = question/term, back = answer/definition (stored in prompt + explanation).
 */
export const flashcardConfigSchema = z.object({
  front: z.string().min(1, "Лицевая сторона карточки обязательна"),
  back: z.string().min(1, "Обратная сторона карточки обязательна"),
});

export type FlashcardConfig = z.infer<typeof flashcardConfigSchema>;

/**
 * Zod schema for FLASHCARD student answer.
 * Self-assessment quality rating (SM-2 scale: 0-5).
 */
export const flashcardAnswerSchema = z
  .number()
  .int()
  .min(0, "Оценка должна быть от 0 до 5")
  .max(5, "Оценка должна быть от 0 до 5");

export type FlashcardAnswer = z.infer<typeof flashcardAnswerSchema>;
