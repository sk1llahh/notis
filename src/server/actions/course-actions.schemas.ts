import { z } from "zod";

export const enrollCourseSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
});

export type EnrollCourseInput = z.infer<typeof enrollCourseSchema>;

export interface EnrollCourseOutput {
  courseId: string;
  courseSlug: string;
  enrolled: boolean;
}
