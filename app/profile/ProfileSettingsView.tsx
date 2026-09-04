"use client";

import React, { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import {
  updateProfileNameAction,
  changePasswordAction,
  deleteAccountAction,
} from "@/server/actions";
import { Card, Button, Input, Badge } from "@/shared/ui";
import {
  User,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Mail,
  Lock,
} from "lucide-react";

export interface ProfileSettingsViewProps {
  initialName?: string;
  email: string;
}

export function ProfileSettingsView({
  initialName = "",
  email,
}: ProfileSettingsViewProps) {
  // 1. Personal Details State
  const [name, setName] = useState(initialName);
  const [isPendingName, startNameTransition] = useTransition();
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // 2. Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPendingPassword, startPasswordTransition] = useTransition();
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 3. Delete Account State
  const [confirmationText, setConfirmationText] = useState("");
  const [isPendingDelete, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Handlers
  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setNameSuccess(false);

    if (name.trim().length < 2) {
      setNameError("Имя должно содержать не менее 2 символов");
      return;
    }

    startNameTransition(async () => {
      const result = await updateProfileNameAction({ name });
      if (!result.success) {
        setNameError(result.error.message);
      } else {
        setNameSuccess(true);
        setTimeout(() => setNameSuccess(false), 3500);
      }
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError("Введите текущий пароль");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Новый пароль должен содержать от 6 символов");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Новый пароль и подтверждение не совпадают");
      return;
    }

    startPasswordTransition(async () => {
      const result = await changePasswordAction({
        currentPassword,
        newPassword,
      });

      if (!result.success) {
        setPasswordError(result.error.message);
      } else {
        setPasswordSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(false), 3500);
      }
    });
  };

  const handleDeleteAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    if (confirmationText !== "УДАЛИТЬ") {
      setDeleteError('Для подтверждения введите слово "УДАЛИТЬ"');
      return;
    }

    startDeleteTransition(async () => {
      const result = await deleteAccountAction({
        confirmationText: "УДАЛИТЬ",
      });

      if (!result.success) {
        setDeleteError(result.error.message);
      } else {
        await signOut({ callbackUrl: "/" });
      }
    });
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-3xl">
      {/* =================================================================
         SECTION 1: Personal Details
         ================================================================= */}
      <Card variant="default" className="p-6 flex flex-col gap-5 shadow-xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border-subtle">
          <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center text-text-primary">
            <User className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-semibold text-text-primary">
              Личные данные
            </h2>
            <p className="text-xs text-text-secondary">
              Управление именем и основной информацией учетной записи
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateName} className="flex flex-col gap-4">
          {/* Email (Readonly) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-text-muted" />
              <span>Email адрес</span>
            </label>
            <Input
              type="email"
              value={email}
              disabled
              className="bg-surface-elevated/40 text-text-muted cursor-not-allowed"
            />
            <span className="text-[11px] text-text-muted">
              Основной идентификатор аккаунта, не подлежит изменению
            </span>
          </div>

          {/* Display Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-text-muted" />
              <span>Отображаемое имя</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваше имя"
              disabled={isPendingName}
              hasError={Boolean(nameError)}
            />
          </div>

          {nameError && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{nameError}</span>
            </div>
          )}

          {nameSuccess && (
            <div className="flex items-center gap-2 text-xs text-status-available bg-status-available/10 border border-status-available/30 p-2.5 rounded-md animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Имя профиля успешно сохранено!</span>
            </div>
          )}

          <div className="pt-1 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isPendingName}
            >
              Сохранить имя
            </Button>
          </div>
        </form>
      </Card>

      {/* =================================================================
         SECTION 2: Security & Password
         ================================================================= */}
      <Card variant="default" className="p-6 flex flex-col gap-5 shadow-xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border-subtle">
          <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center text-text-primary">
            <KeyRound className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-semibold text-text-primary">
              Безопасность и пароль
            </h2>
            <p className="text-xs text-text-secondary">
              Регулярное обновление пароля защищает ваши учебные достижения
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-text-muted" />
              <span>Текущий пароль</span>
            </label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isPendingPassword}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">
                Новый пароль
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                disabled={isPendingPassword}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">
                Подтверждение пароля
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите новый пароль"
                disabled={isPendingPassword}
              />
            </div>
          </div>

          {passwordError && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="flex items-center gap-2 text-xs text-status-available bg-status-available/10 border border-status-available/30 p-2.5 rounded-md animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Пароль успешно обновлен!</span>
            </div>
          )}

          <div className="pt-1 flex justify-end">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              isLoading={isPendingPassword}
            >
              Обновить пароль
            </Button>
          </div>
        </form>
      </Card>

      {/* =================================================================
         SECTION 3: Danger Zone
         ================================================================= */}
      <Card
        variant="default"
        className="p-6 flex flex-col gap-5 border-red-500/30 bg-red-500/[0.02] shadow-xs"
      >
        <div className="flex items-center justify-between pb-3 border-b border-red-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base font-semibold text-red-400">
                Опасная зона
              </h2>
              <p className="text-xs text-text-secondary">
                Необратимые действия с учетной записью
              </p>
            </div>
          </div>
          <Badge variant="diff" size="sm">
            Необратимо
          </Badge>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Удаление учетной записи приведет к безвозвратной потере всей вашей
            истории обучения: накопленного опыта (XP), ударного режима (стриков),
            пройденных тем, результатов квизов и очереди повторений SM-2. Это
            действие нельзя отменить.
          </p>

          <form onSubmit={handleDeleteAccount} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">
                Для подтверждения введите слово{" "}
                <span className="font-bold text-red-400 select-all">УДАЛИТЬ</span>:
              </label>
              <Input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="УДАЛИТЬ"
                disabled={isPendingDelete}
                className="max-w-sm"
              />
            </div>

            {deleteError && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-md">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="pt-1">
              <Button
                type="submit"
                variant="danger"
                size="sm"
                disabled={confirmationText !== "УДАЛИТЬ" || isPendingDelete}
                isLoading={isPendingDelete}
              >
                Удалить аккаунт навсегда
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
