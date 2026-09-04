import { z } from "zod";

export const reviewCardSchema = z.object({
  cardId: z.string().min(1, "ID карточки обязателен"),
  quality: z
    .number({ message: "Оценка качества обязательна" })
    .int("Оценка должна быть целым числом")
    .min(0, "Оценка не может быть меньше 0")
    .max(5, "Оценка не может быть больше 5"),
});

export type ReviewCardInput = z.infer<typeof reviewCardSchema>;

export interface ReviewCardOutput {
  cardId: string;
  nextReviewAt: Date;
  interval: number;
  xpEarned: number;
}
