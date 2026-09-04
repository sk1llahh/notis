"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@/shared/ui";
import {
  updateCourseSettingsAction,
  deleteCourseAction,
} from "@/server/actions";
import { ROUTES } from "@/shared/config";
import {
  Settings,
  X,
  AlertCircle,
  Trash2,
  Globe,
  EyeOff,
  Check,
} from "lucide-react";

export interface CourseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: string;
    slug: string;
    title: string;
    description?: string;
    isPublished?: boolean;
  };
  onCourseUpdated?: (updated: {
    title: string;
    description: string;
    isPublished: boolean;
  }) => void;
}

export function CourseSettingsModal({
  isOpen,
  onClose,
  course,
  onCourseUpdated,
}: CourseSettingsModalProps) {
  const router = useRouter();

  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [isPublished, setIsPublished] = useState(course.isPublished ?? false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  useEffect(() => {
    if (isOpen) {
      setTitle(course.title);
      setDescription(course.description ?? "");
      setIsPublished(course.isPublished ?? false);
      setConfirmDelete(false);
      setErrorMessage(null);
      setSuccessMessage(null);
      setFieldErrors({});
    }
  }, [isOpen, course]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSaving, isDeleting]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    startSaving(async () => {
      const result = await updateCourseSettingsAction({
        courseSlug: course.slug,
        title: title.trim(),
        description: description.trim(),
        isPublished,
      });

      if (!result.success) {
        setErrorMessage(result.error.message || "Ошибка сохранения настроек");
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        }
        return;
      }

      setSuccessMessage("Настройки курса успешно сохранены");
      onCourseUpdated?.({
        title: title.trim(),
        description: description.trim(),
        isPublished,
      });

      setTimeout(() => {
        onClose();
      }, 1200);
    });
  };

  const handleDeleteCourse = () => {
    startDeleting(async () => {
      setErrorMessage(null);
      const result = await deleteCourseAction({
        courseSlug: course.slug,
      });

      if (!result.success) {
        setErrorMessage(result.error.message || "Не удалось удалить курс");
        return;
      }

      onClose();
      router.push(ROUTES.COURSES);
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={() => !isSaving && !isDeleting && onClose()}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg rounded-xl border border-border-subtle bg-surface-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 z-10 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center text-text-primary">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                Настройки курса
              </h3>
              <p className="text-[11px] text-text-muted">
                Управление метаданными, видимостью в каталоге и удаление
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isDeleting}
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 rounded-lg bg-status-completed/10 border border-status-completed/30 flex items-center gap-2 text-xs text-status-completed font-medium">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSave} className="mt-4 space-y-5 text-xs">
          {/* Title */}
          <div className="space-y-1">
            <label className="font-medium text-text-secondary block">
              Название курса <span className="text-red-400">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving || isDeleting}
              required
            />
            {fieldErrors.title && (
              <p className="text-[11px] text-red-400 mt-1">
                {fieldErrors.title.join(", ")}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-medium text-text-secondary block">
              Описание курса <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving || isDeleting}
              rows={3}
              required
              className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-status-available focus:outline-none transition-colors"
            />
            {fieldErrors.description && (
              <p className="text-[11px] text-red-400 mt-1">
                {fieldErrors.description.join(", ")}
              </p>
            )}
          </div>

          {/* Publication Toggle */}
          <div className="p-3.5 rounded-lg bg-surface-elevated/70 border border-border-subtle flex items-center justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  isPublished
                    ? "bg-status-completed/10 text-status-completed border border-status-completed/30"
                    : "bg-surface-elevated text-text-muted border border-border-subtle"
                }`}
              >
                {isPublished ? (
                  <Globe className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="font-medium text-text-primary block">
                  Опубликован в каталоге
                </span>
                <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                  {isPublished
                    ? "Курс доступен всем студентам в общем каталоге Notis"
                    : "Курс находится в черновиках и скрыт из общего каталога"}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isPublished}
              onClick={() => setIsPublished((prev) => !prev)}
              disabled={isSaving || isDeleting}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isPublished ? "bg-status-completed" : "bg-border-strong"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isPublished ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border-subtle">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSaving || isDeleting}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              disabled={isSaving || isDeleting || !title || !description}
            >
              Сохранить настройки
            </Button>
          </div>
        </form>

        {/* Danger Zone: Delete Course */}
        <div className="mt-6 pt-5 border-t border-red-500/20">
          <Card variant="default" className="p-4 bg-surface-card border-red-500/30 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                <Trash2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="font-semibold text-red-400 text-xs">
                  Опасная зона: Удаление курса
                </h4>
                <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                  Безвозвратно удаляет курс, все его темы, учебные материалы, квизы и прогресс студентов.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-red-400 font-medium">Точно удалить?</span>
                  <Button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={isDeleting}
                    size="sm"
                    variant="ghost"
                  >
                    Отмена
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDeleteCourse}
                    isLoading={isDeleting}
                    size="sm"
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    Да, удалить курс
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isSaving}
                  size="sm"
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Удалить курс
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
