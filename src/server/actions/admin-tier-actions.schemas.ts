import { z } from "zod";

export const createCourseTierSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  title: z
    .string()
    .trim()
    .min(2, "Название от 2 символов")
    .max(50, "Название до 50 символов"),
  level: z.number().int().min(1, "Уровень должен быть целым числом от 1"),
  badgeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Некорректный HEX-цвет (например, #10b981)")
    .optional(),
});

export type CreateCourseTierInput = z.infer<typeof createCourseTierSchema>;

export const updateCourseTierSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  tierId: z.string().min(1, "ID тира обязателен"),
  title: z
    .string()
    .trim()
    .min(2, "Название от 2 символов")
    .max(50, "Название до 50 символов"),
  level: z.number().int().min(1, "Уровень должен быть целым числом от 1"),
  badgeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Некорректный HEX-цвет (например, #10b981)")
    .optional(),
});

export type UpdateCourseTierInput = z.infer<typeof updateCourseTierSchema>;

export const deleteCourseTierSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  tierId: z.string().min(1, "ID тира обязателен"),
});

export type DeleteCourseTierInput = z.infer<typeof deleteCourseTierSchema>;

export const assignTopicTierSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicId: z.string().min(1, "ID темы обязателен"),
  tierId: z.string().nullable(),
});

export type AssignTopicTierInput = z.infer<typeof assignTopicTierSchema>;

export const getCourseTiersSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
});

export type GetCourseTiersInput = z.infer<typeof getCourseTiersSchema>;

export interface CourseTierDTO {
  id: string;
  slug: string;
  title: string;
  level: number;
  badgeColor: string;
  topicsCount?: number;
}
