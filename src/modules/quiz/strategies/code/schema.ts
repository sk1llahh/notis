import { z } from "zod";

/**
 * Zod schema for a single test case in CODE questions.
 */
export const testCaseSchema = z.object({
  name: z.string().optional(),
  input: z.array(z.any()),
  expected: z.any(),
  description: z.string().optional(),
});

/**
 * Zod schema for CODE question configuration (Studio author side).
 * Requires at least one test case and an optional code template.
 */
export const codeConfigSchema = z.object({
  codeTemplate: z.string().optional(),
  testCases: z.array(testCaseSchema).min(1, "Укажите хотя бы один тест-кейс"),
});

export type CodeConfig = z.infer<typeof codeConfigSchema>;

/**
 * Zod schema for CODE student answer.
 * A non-empty string containing the student's code.
 */
export const codeAnswerSchema = z.string().trim().min(1, "Код решения не может быть пустым");

export type CodeAnswer = z.infer<typeof codeAnswerSchema>;
