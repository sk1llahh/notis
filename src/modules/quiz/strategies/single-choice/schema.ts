import { z } from "zod";

/**
 * Zod schema for SINGLE_CHOICE question configuration (Studio author side).
 * Requires at least 2 options and exactly 1 correct answer index.
 */
export const singleChoiceConfigSchema = z.object({
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
    .length(1, "Для одиночного выбора допускается строго один правильный ответ"),
});

export type SingleChoiceConfig = z.infer<typeof singleChoiceConfigSchema>;

/**
 * Zod schema for SINGLE_CHOICE student answer.
 * Accepts a numeric index or a string option ID.
 */
export const singleChoiceAnswerSchema = z.union([
  z.number().int().nonnegative(),
  z.string().min(1),
]);

export type SingleChoiceAnswer = z.infer<typeof singleChoiceAnswerSchema>;
