import { z } from "zod";

export const updateProfileNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Имя должно содержать от 2 символов")
    .max(50, "Имя не должно превышать 50 символов"),
});

export type UpdateProfileNameInput = z.infer<typeof updateProfileNameSchema>;

export interface UpdateProfileNameOutput {
  success: boolean;
  name: string;
}

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Текущий пароль обязателен"),
  newPassword: z
    .string()
    .min(6, "Новый пароль должен содержать не менее 6 символов"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface ChangePasswordOutput {
  success: boolean;
}

export const deleteAccountSchema = z.object({
  confirmationText: z.literal("УДАЛИТЬ", {
    message: 'Для подтверждения введите слово "УДАЛИТЬ"',
  }),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

export interface DeleteAccountOutput {
  success: boolean;
}
