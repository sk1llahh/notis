"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
} from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import { registerUserAction } from "@/server/actions";
import {
  GraduationCap,
  UserPlus,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await registerUserAction({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
      });

      if (!result.success) {
        setErrorMessage(result.error.message || "Ошибка при регистрации");
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        }
        return;
      }

      setIsSuccess(true);

      // Attempt automatic sign-in with the newly created credentials
      try {
        const signResult = await signIn("credentials", {
          email: email.trim(),
          password: password.trim(),
          redirect: false,
          callbackUrl: ROUTES.PROFILE,
        });

        if (signResult?.ok) {
          router.push(ROUTES.PROFILE);
          router.refresh();
          return;
        }
      } catch {
        // Fallback to manual login
      }

      router.push(`${ROUTES.LOGIN}?registered=true`);
    });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card variant="elevated" className="p-6 sm:p-8">
        {/* Form Header */}
        <CardHeader className="p-0 pb-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-status-available/10 border border-status-available/30 flex items-center justify-center text-status-available mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-text-primary">
            Регистрация в Notis
          </CardTitle>
          <CardDescription className="text-xs text-text-secondary mt-1">
            Создайте аккаунт для сохранения прогресса роадмапов и интервальных повторений
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {isSuccess && (
            <div className="p-3 rounded-lg bg-status-completed/10 border border-status-completed/30 flex items-center gap-2 text-xs text-status-completed font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Аккаунт успешно создан! Выполняем вход...</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary block">
                Ваше имя
              </label>
              <Input
                type="text"
                placeholder="Алексей"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending || isSuccess}
                required
                autoFocus
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-red-400 mt-0.5">
                  {fieldErrors.name.join(", ")}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary block">
                Электронная почта
              </label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending || isSuccess}
                required
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-red-400 mt-0.5">
                  {fieldErrors.email.join(", ")}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary block">
                Пароль (от 6 символов)
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending || isSuccess}
                required
              />
              {fieldErrors.password && (
                <p className="text-[11px] text-red-400 mt-0.5">
                  {fieldErrors.password.join(", ")}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center mt-2"
              isLoading={isPending || isSuccess}
              disabled={isPending || isSuccess || !name || !email || !password}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Зарегистрироваться
            </Button>
          </form>

          {/* Switch to Login */}
          <div className="pt-2 text-center text-xs text-text-muted">
            Уже есть аккаунт?{" "}
            <Link
              href={ROUTES.LOGIN}
              className="text-status-available hover:underline font-medium"
            >
              Войти
            </Link>
          </div>
        </CardContent>

        <CardFooter className="p-0 pt-6 mt-6 flex items-center justify-center border-t border-border-subtle">
          <Link
            href={ROUTES.HOME}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Вернуться на главную
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
