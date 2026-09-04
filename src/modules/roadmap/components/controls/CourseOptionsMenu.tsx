"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  leaveCourseAction,
  resetCourseProgressAction,
} from "@/server/actions";
import { Button, Input, Card, Badge } from "@/shared/ui";
import {
  Settings2,
  RotateCcw,
  LogOut,
  X,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";

export interface CourseOptionsMenuProps {
  courseSlug: string;
  courseTitle: string;
}

export function CourseOptionsMenu({
  courseSlug,
  courseTitle,
}: CourseOptionsMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Modals state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Reset confirmation text
  const [resetConfirmation, setResetConfirmation] = useState("");

  // Transition & error states
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLeaveCourse = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await leaveCourseAction({ courseSlug });
      if (!result.success) {
        setErrorMessage(result.error.message);
      } else {
        setIsLeaveModalOpen(false);
        setIsOpen(false);
        router.push("/courses");
      }
    });
  };

  const handleResetProgress = () => {
    setErrorMessage(null);
    if (resetConfirmation !== "СБРОСИТЬ") {
      setErrorMessage('Для подтверждения введите слово "СБРОСИТЬ"');
      return;
    }

    startTransition(async () => {
      const result = await resetCourseProgressAction({
        courseSlug,
        confirmation: "СБРОСИТЬ",
      });

      if (!result.success) {
        setErrorMessage(result.error.message);
      } else {
        setIsResetModalOpen(false);
        setResetConfirmation("");
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      {/* Dropdown Trigger Button */}
      <div className="relative" ref={menuRef}>
        <Button
          onClick={() => setIsOpen((prev) => !prev)}
          variant="secondary"
          size="sm"
          leftIcon={<Settings2 className="w-3.5 h-3.5" />}
          title="Опции курса"
        >
          <span className="hidden sm:inline">Опции</span>
        </Button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 mt-2 w-56 rounded-xl border border-border-subtle bg-surface-elevated p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2.5 py-1.5 border-b border-border-subtle text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Управление курсом
            </div>

            <div className="space-y-0.5 py-1">
              {/* Reset Progress Option */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setErrorMessage(null);
                  setResetConfirmation("");
                  setIsResetModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs text-text-secondary hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer text-left"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Сбросить прогресс</span>
              </button>

              {/* Leave Course Option */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setErrorMessage(null);
                  setIsLeaveModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Покинуть курс</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================
         MODAL 1: Leave Course Confirmation
         ================================================================= */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <Card
            variant="default"
            className="max-w-md w-full p-6 bg-surface-card border border-border-subtle shadow-2xl flex flex-col gap-4 relative"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2 text-red-400">
                <LogOut className="w-5 h-5" />
                <h3 className="text-base font-semibold text-text-primary">
                  Покинуть курс?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Вы собираетесь отчислиться с курса{" "}
              <strong className="text-text-primary font-semibold">
                «{courseTitle}»
              </strong>
              . Курс исчезнет из вашего списка активных зачислений в личном
              кабинете, но вы всегда сможете записаться на него снова в каталоге.
            </p>

            {errorMessage && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-md">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsLeaveModalOpen(false)}
                disabled={isPending}
              >
                Отмена
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleLeaveCourse}
                isLoading={isPending}
              >
                Покинуть курс
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* =================================================================
         MODAL 2: Reset Course Progress Confirmation
         ================================================================= */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <Card
            variant="default"
            className="max-w-md w-full p-6 bg-surface-card border border-amber-500/30 shadow-2xl flex flex-col gap-4 relative"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-semibold text-text-primary">
                  Сбросить прогресс по курсу?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Все изученные темы курса{" "}
              <strong className="text-text-primary font-semibold">
                «{courseTitle}»
              </strong>{" "}
              будут сброшены в исходное состояние, а результаты квизов очищены.
              Вы сможете пройти роадмап заново с чистого листа. Заработанный общий
              опыт (XP) и стрик сохраняются.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">
                Для подтверждения сброса введите{" "}
                <span className="font-bold text-amber-400 select-all">
                  СБРОСИТЬ
                </span>
                :
              </label>
              <Input
                type="text"
                value={resetConfirmation}
                onChange={(e) => setResetConfirmation(e.target.value)}
                placeholder="СБРОСИТЬ"
                disabled={isPending}
              />
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-md">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isPending}
              >
                Отмена
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={resetConfirmation !== "СБРОСИТЬ" || isPending}
                onClick={handleResetProgress}
                isLoading={isPending}
              >
                Сбросить прогресс
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
