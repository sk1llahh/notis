import { z } from "zod";

export const createTopicSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  title: z.string().min(2, "Заголовок темы должен содержать не менее 2 символов"),
  tierId: z.string().optional(),
  positionX: z.number().default(100),
  positionY: z.number().default(100),
});

export type CreateTopicInput = z.infer<typeof createTopicSchema>;

export interface CreateTopicOutput {
  topic: {
    id: string;
    slug: string;
    title: string;
    difficulty: string;
    version: number;
    isPublished: boolean;
    isFreePreview: boolean;
    tierId: string;
  };
  tier: {
    id: string;
    slug: string;
    title: string;
    badgeColor: string;
    order: number;
  };
  positionX: number;
  positionY: number;
}

export const deleteTopicSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicId: z.string().min(1, "ID темы обязателен"),
});

export type DeleteTopicInput = z.infer<typeof deleteTopicSchema>;

export interface DeleteTopicOutput {
  topicId: string;
  success: boolean;
}
