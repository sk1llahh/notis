import { z } from "zod";

export const createCourseSchema = z.object({
  title: z
    .string()
    .min(3, "Заголовок курса должен содержать не менее 3 символов"),
  slug: z
    .string()
    .min(3, "Слаг курса должен содержать не менее 3 символов")
    .regex(
      /^[a-z0-9-]+$/,
      "Слаг может содержать только строчные латинские буквы, цифры и дефис"
    ),
  description: z
    .string()
    .min(10, "Описание курса должно содержать не менее 10 символов"),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export interface CreateCourseOutput {
  slug: string;
}

export const updateCourseSettingsSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  title: z.string().min(3, "Название должно содержать не менее 3 символов"),
  description: z
    .string()
    .min(10, "Описание должно содержать не менее 10 символов"),
  isPublished: z.boolean(),
});

export type UpdateCourseSettingsInput = z.infer<typeof updateCourseSettingsSchema>;

export interface UpdateCourseSettingsOutput {
  slug: string;
  isPublished: boolean;
}

export const deleteCourseSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
});

export type DeleteCourseInput = z.infer<typeof deleteCourseSchema>;

export interface DeleteCourseOutput {
  success: boolean;
}
