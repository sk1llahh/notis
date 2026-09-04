import { z } from "zod";

/**
 * Zod schema for SHORT_ANSWER question configuration (Studio author side).
 * Requires at least one accepted answer string.
 */
export const shortAnswerConfigSchema = z.object({
  acceptedAnswers: z
    .array(z.string().min(1))
    .min(1, "Укажите хотя бы один правильный текстовый ответ"),
});

export type ShortAnswerConfig = z.infer<typeof shortAnswerConfigSchema>;

/**
 * Zod schema for SHORT_ANSWER student answer.
 * A non-empty trimmed string.
 */
export const shortAnswerAnswerSchema = z.string().trim().min(1, "Текстовый ответ не может быть пустым");

export type ShortAnswerAnswer = z.infer<typeof shortAnswerAnswerSchema>;
