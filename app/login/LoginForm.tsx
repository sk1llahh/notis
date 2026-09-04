"use client";

import React, { useState } from "react";
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
  Badge,
} from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import {
  GraduationCap,
  LogIn,
  AlertCircle,
  Shield,
  User,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

interface LoginFormProps {
  callbackUrl?: string;
  initialError?: string;
  registered?: boolean;
}

export function LoginForm({
  callbackUrl,
  initialError,
  registered,
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialError ? "Ошибка авторизации. Попробуйте снова." : null
  );

  const targetUrl = callbackUrl || ROUTES.PROFILE;

  // Handle Credentials Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage("Пожалуйста, введите адрес электронной почты");
      return;
    }

    if (!password.trim()) {
      setErrorMessage("Пожалуйста, введите пароль");
      return;
    }

    try {
      setIsLoading(true);
      const res = await signIn("credentials", {
        email: email.trim(),
        password: password.trim(),
        redirect: false,
        callbackUrl: targetUrl,
      });

      if (res?.error) {
        setErrorMessage("Неверный email или пароль");
        setIsLoading(false);
        return;
      }

      router.push(targetUrl);
      router.refresh();
    } catch {
      setErrorMessage("Произошла непредвиденная ошибка при входе");
      setIsLoading(false);
    }
  };

  // Quick Demo Account Selection
  const selectDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  // OAuth Sign In
  const handleOAuthSignIn = async (provider: "github" | "google") => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await signIn(provider, { callbackUrl: targetUrl });
    } catch {
      setErrorMessage(`Ошибка подключения к ${provider}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-200">
      <Card variant="elevated" className="p-6 sm:p-8">
        <CardHeader className="p-0 pb-6 text-center items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-status-available/20 to-surface-card border border-status-available/30 flex items-center justify-center mb-3 text-status-available shadow-inner">
            <GraduationCap className="w-7 h-7" />
          </div>

          <CardTitle className="text-xl font-bold tracking-tight text-text-primary">
            Вход в Notis
          </CardTitle>
          <CardDescription className="text-xs text-text-secondary mt-1">
            Интерактивные роадмапы, квизы и интервальное повторение
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 flex flex-col gap-5">
          {/* Quick Demo Accounts Selection */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-elevated/70 border border-border-subtle">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-center">
              Быстрый вход для тестирования
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  selectDemoAccount("admin@notis.local", "admin123")
                }
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-card hover:bg-surface-hover border border-border-subtle hover:border-border-focus text-xs font-medium text-text-primary transition-colors cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-status-diff" />
                Администратор
              </button>
              <button
                type="button"
                onClick={() =>
                  selectDemoAccount("student@notis.local", "student123")
                }
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-card hover:bg-surface-hover border border-border-subtle hover:border-border-focus text-xs font-medium text-text-primary transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-status-available" />
                Студент
              </button>
            </div>
          </div>

          {/* Success / Registered Alert */}
          {registered && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-status-completed/10 border border-status-completed/30 text-status-completed text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Регистрация завершена! Войдите в аккаунт с вашим паролем.</span>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium text-text-secondary"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                hasError={Boolean(errorMessage)}
                disabled={isLoading}
                autoComplete="email"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-medium text-text-secondary"
                >
                  Пароль
                </label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hasError={Boolean(errorMessage)}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-1"
              isLoading={isLoading}
              rightIcon={<LogIn className="w-4 h-4" />}
            >
              Войти в систему
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-surface-card px-2 text-text-muted">или</span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-center"
              disabled={isLoading}
              onClick={() => handleOAuthSignIn("github")}
              leftIcon={
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              }
            >
              Войти через GitHub
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="w-full justify-center"
              disabled={isLoading}
              onClick={() => handleOAuthSignIn("google")}
              leftIcon={
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.4 7.5 23 12 23z"
                  />
                </svg>
              }
            >
              Войти через Google
            </Button>
          </div>

          {/* Switch to Register */}
          <div className="pt-2 text-center text-xs text-text-muted">
            Нет аккаунта?{" "}
            <Link
              href={ROUTES.REGISTER}
              className="text-status-available hover:underline font-medium"
            >
              Зарегистрироваться
            </Link>
          </div>
        </CardContent>

        <CardFooter className="p-0 pt-6 mt-6 flex items-center justify-center">
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
