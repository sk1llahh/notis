import { z } from "zod";

export const registerUserSchema = z.object({
  name: z
    .string()
    .min(2, "Имя должно содержать минимум 2 символа")
    .max(50, "Имя не должно превышать 50 символов"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Некорректный адрес электронной почты"),
  password: z
    .string()
    .min(6, "Пароль должен быть не менее 6 символов"),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export interface RegisterUserOutput {
  success: boolean;
  email: string;
}
