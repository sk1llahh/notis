"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@/shared/ui";
import { createCourseAction } from "@/server/actions";
import { slugify } from "@/shared/lib/utils";
import { ROUTES } from "@/shared/config";
import { Plus, X, Sparkles, AlertCircle, Wand2 } from "lucide-react";

export function CreateCourseModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  // Auto-slugify when title changes, unless slug was manually edited
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!isSlugManuallyEdited) {
      setSlug(slugify(val));
    }
  };

  const handleRegenerateSlug = () => {
    setSlug(slugify(title));
    setIsSlugManuallyEdited(false);
  };

  const resetForm = () => {
    setTitle("");
    setSlug("");
    setDescription("");
    setIsSlugManuallyEdited(false);
    setErrorMessage(null);
    setFieldErrors({});
  };

  const handleClose = () => {
    if (isPending) return;
    setIsOpen(false);
    resetForm();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await createCourseAction({
        title,
        slug,
        description,
      });

      if (!result.success) {
        setErrorMessage(result.error.message || "Не удалось создать курс");
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        }
        return;
      }

      setIsOpen(false);
      resetForm();
      router.push(ROUTES.STUDIO(result.data.slug));
    });
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="primary"
        size="sm"
        leftIcon={<Plus className="w-4 h-4" />}
      >
        Создать курс
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={handleClose}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-lg rounded-xl border border-border-subtle bg-surface-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 z-10">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-status-available/10 border border-status-available/30 flex items-center justify-center text-status-available">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    Создание нового курса
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Курс появится в черновиках студии для наполнения темами
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              {/* Title Field */}
              <div className="space-y-1">
                <label className="font-medium text-text-secondary block">
                  Название курса <span className="text-red-400">*</span>
                </label>
                <Input
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="например, Основы архитектуры компьютеров"
                  disabled={isPending}
                  required
                />
                {fieldErrors.title && (
                  <p className="text-[11px] text-red-400 mt-1">
                    {fieldErrors.title.join(", ")}
                  </p>
                )}
              </div>

              {/* Slug Field */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-text-secondary block">
                    URL-идентификатор (slug) <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateSlug}
                    title="Сгенерировать слаг из названия"
                    className="text-[11px] text-status-available flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Wand2 className="w-3 h-3" />
                    Обновить из названия
                  </button>
                </div>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setIsSlugManuallyEdited(true);
                  }}
                  placeholder="computer-architecture"
                  disabled={isPending}
                  required
                />
                <p className="text-[10px] text-text-muted">
                  Используется в URL: /courses/{slug || "..."} и /studio/{slug || "..."}
                </p>
                {fieldErrors.slug && (
                  <p className="text-[11px] text-red-400 mt-1">
                    {fieldErrors.slug.join(", ")}
                  </p>
                )}
              </div>

              {/* Description Field */}
              <div className="space-y-1">
                <label className="font-medium text-text-secondary block">
                  Описание курса <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Краткое описание ключевых целей обучения и навыков..."
                  disabled={isPending}
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

              {/* Actions Footer */}
              <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isPending}
                  disabled={isPending || !title || !slug || !description}
                >
                  Создать и перейти в студию
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
