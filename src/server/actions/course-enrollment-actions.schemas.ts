import { z } from "zod";

export const leaveCourseSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
});

export type LeaveCourseInput = z.infer<typeof leaveCourseSchema>;

export interface LeaveCourseOutput {
  success: boolean;
  courseSlug: string;
}

export const resetCourseProgressSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  confirmation: z.literal("СБРОСИТЬ", {
    message: 'Для подтверждения введите слово "СБРОСИТЬ"',
  }),
});

export type ResetCourseProgressInput = z.infer<
  typeof resetCourseProgressSchema
>;

export interface ResetCourseProgressOutput {
  success: boolean;
  courseSlug: string;
}
