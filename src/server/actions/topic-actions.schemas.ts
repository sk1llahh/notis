import { z } from "zod";

export const completeTopicSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicSlug: z.string().min(1, "Слаг темы обязателен"),
});

export type CompleteTopicInput = z.infer<typeof completeTopicSchema>;

export interface CompleteTopicOutput {
  success: boolean;
  topicId: string;
  status: "COMPLETED";
  xpEarned: number;
}
