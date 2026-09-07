import { z } from "zod";
import type { ImportedTopicPayload } from "./import-topic-actions.schemas";

/**
 * Zod validation schema for requesting AI-assisted topic draft generation.
 * Isolated from "use server" to ensure safe client-side and server-side usage.
 */
export const generateTopicInputSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicTitle: z
    .string()
    .trim()
    .min(2, "Название темы должно содержать минимум 2 символа")
    .max(150, "Название темы не может превышать 150 символов"),
  difficulty: z
    .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"])
    .default("INTERMEDIATE"),
  targetAudience: z.string().trim().max(200).optional(),
  focusAreas: z
    .string()
    .trim()
    .max(1000, "Ключевые акценты не могут превышать 1000 символов")
    .optional(),
  sourceMaterial: z
    .string()
    .trim()
    .max(30000, "Конспект / исходный материал не может превышать 30000 символов")
    .optional(),
  customApiKey: z.string().trim().optional(),
  model: z.string().default("gemini-2.5-flash"),
});

export type GenerateTopicInput = z.infer<typeof generateTopicInputSchema>;
export type GenerateTopicRawInput = z.input<typeof generateTopicInputSchema>;
export type GenerateTopicOutput = ImportedTopicPayload;
