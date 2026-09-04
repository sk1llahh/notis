import { z } from "zod";

export const updateUserRoleSchema = z
  .object({
    targetUserId: z.string().min(1, "Идентификатор пользователя обязателен"),
    newRole: z
      .enum(["USER", "AUTHOR", "ADMIN"], {
        message: "Недопустимая роль пользователя",
      })
      .optional(),
    isBanned: z.boolean().optional(),
  })
  .refine(
    (data) => data.newRole !== undefined || data.isBanned !== undefined,
    {
      message: "Необходимо указать новую роль или статус блокировки",
      path: ["newRole"],
    }
  );

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export interface UpdateUserRoleOutput {
  success: boolean;
  userId: string;
  updatedRole: "USER" | "AUTHOR" | "ADMIN";
  isBanned: boolean;
}
