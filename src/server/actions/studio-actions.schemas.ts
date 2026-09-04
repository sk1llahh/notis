import { z } from "zod";

export const updateNodePositionsSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  positions: z.record(
    z.string(),
    z.object({
      x: z.number({ message: "Координата X обязательна" }),
      y: z.number({ message: "Координата Y обязательна" }),
    })
  ),
});

export type UpdateNodePositionsInput = z.infer<typeof updateNodePositionsSchema>;

export interface UpdateNodePositionsOutput {
  updatedCount: number;
}

export const connectPrerequisiteSchema = z
  .object({
    courseSlug: z.string().min(1, "Слаг курса обязателен"),
    topicId: z.string().min(1, "ID темы обязателен"),
    prerequisiteId: z.string().min(1, "ID пререквизита обязателен"),
    type: z.enum(["REQUIRED", "RECOMMENDED"]).default("REQUIRED"),
  })
  .refine((data) => data.topicId !== data.prerequisiteId, {
    message: "Нельзя связать тему саму с собой",
    path: ["prerequisiteId"],
  });

export type ConnectPrerequisiteInput = z.infer<typeof connectPrerequisiteSchema>;

export interface ConnectPrerequisiteOutput {
  id: string;
  topicId: string;
  prerequisiteId: string;
  type: "REQUIRED" | "RECOMMENDED";
}

export const disconnectPrerequisiteSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicId: z.string().min(1, "ID темы обязателен"),
  prerequisiteId: z.string().min(1, "ID пререквизита обязателен"),
});

export type DisconnectPrerequisiteInput = z.infer<typeof disconnectPrerequisiteSchema>;

export interface DisconnectPrerequisiteOutput {
  topicId: string;
  prerequisiteId: string;
}
