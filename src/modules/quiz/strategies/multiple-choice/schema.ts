import { z } from "zod";

/**
 * Zod schema for MULTIPLE_CHOICE question configuration (Studio author side).
 * Requires at least 2 options and at least 1 correct answer index.
 */
export const multipleChoiceConfigSchema = z.object({
  options: z
    .array(
      z.object({
        text: z.string().min(1),
        codeSnippet: z.string().optional(),
      })
    )
    .min(2, "Требуется минимум 2 варианта ответа"),
  correctAnswerIndexes: z
    .array(z.number().int().nonnegative())
    .min(1, "Укажите хотя бы один правильный вариант"),
});

export type MultipleChoiceConfig = z.infer<typeof multipleChoiceConfigSchema>;

/**
 * Zod schema for MULTIPLE_CHOICE student answer.
 * Accepts an array of numeric indexes or string option IDs.
 */
export const multipleChoiceAnswerSchema = z.array(
  z.union([z.number().int().nonnegative(), z.string().min(1)])
);

export type MultipleChoiceAnswer = z.infer<typeof multipleChoiceAnswerSchema>;
