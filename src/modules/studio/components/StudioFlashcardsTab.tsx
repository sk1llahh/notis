"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Button, MarkdownRenderer, Badge } from "@/shared/ui";
import {
  getTopicFlashcardsAction,
  createFlashcardAction,
  updateFlashcardAction,
  deleteFlashcardAction,
  type FlashcardDTO,
} from "@/server/actions";
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  BrainCircuit,
  Eye,
  Edit3,
  HelpCircle,
  X,
} from "lucide-react";

export interface StudioFlashcardsTabProps {
  courseSlug: string;
  topicId: string;
  onCountChanged?: (count: number) => void;
}

export function StudioFlashcardsTab({
  courseSlug,
  topicId,
  onCountChanged,
}: StudioFlashcardsTabProps) {
  const [cards, setCards] = useState<FlashcardDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state for add / edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [frontMode, setFrontMode] = useState<"edit" | "preview">("edit");
  const [backMode, setBackMode] = useState<"edit" | "preview">("edit");
  const [isSaving, startSaving] = useTransition();

  // Delete state
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  // Load cards from server
  const loadCards = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await getTopicFlashcardsAction({ courseSlug, topicId });
      if (res.success) {
        setCards(res.data.cards);
        onCountChanged?.(res.data.cards.length);
      } else {
        setLoadError(res.error.message || "Ошибка загрузки карточек");
      }
    } catch {
      setLoadError("Ошибка сетевого взаимодействия");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsFormOpen(false);
    setEditingCardId(null);
    setDeletingCardId(null);
    setFrontText("");
    setBackText("");
    setErrorMessage(null);
    setStatusMessage(null);
    loadCards();
  }, [courseSlug, topicId]);

  // Open form for new card
  const handleOpenAddForm = () => {
    setIsFormOpen(true);
    setEditingCardId(null);
    setFrontText("");
    setBackText("");
    setFrontMode("edit");
    setBackMode("edit");
    setErrorMessage(null);
    setDeletingCardId(null);
  };

  // Open form for editing card
  const handleOpenEditForm = (card: FlashcardDTO) => {
    setIsFormOpen(true);
    setEditingCardId(card.id);
    setFrontText(card.front);
    setBackText(card.back);
    setFrontMode("edit");
    setBackMode("edit");
    setErrorMessage(null);
    setDeletingCardId(null);
  };

  // Close form
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCardId(null);
    setFrontText("");
    setBackText("");
    setErrorMessage(null);
  };

  // Save Card (Create or Update)
  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    const front = frontText.trim();
    const back = backText.trim();

    if (front.length < 3 || back.length < 3) {
      setErrorMessage("Лицевая и оборотная стороны должны содержать от 3 символов");
      return;
    }

    setErrorMessage(null);

    startSaving(async () => {
      if (editingCardId) {
        // Update
        const res = await updateFlashcardAction({
          courseSlug,
          questionId: editingCardId,
          front,
          back,
        });

        if (res.success) {
          setStatusMessage("Карточка обновлена");
          handleCloseForm();
          await loadCards();
          setTimeout(() => setStatusMessage(null), 2500);
        } else {
          setErrorMessage(res.error.message || "Ошибка обновления карточки");
        }
      } else {
        // Create
        const res = await createFlashcardAction({
          courseSlug,
          topicId,
          front,
          back,
        });

        if (res.success) {
          setStatusMessage("Карточка создана и синхронизирована с SM-2");
          handleCloseForm();
          await loadCards();
          setTimeout(() => setStatusMessage(null), 2500);
        } else {
          setErrorMessage(res.error.message || "Ошибка создания карточки");
        }
      }
    });
  };

  // Delete Card
  const handleDeleteCard = (cardId: string) => {
    setErrorMessage(null);

    startDeleting(async () => {
      const res = await deleteFlashcardAction({
        courseSlug,
        questionId: cardId,
      });

      if (res.success) {
        setDeletingCardId(null);
        setStatusMessage("Карточка удалена");
        await loadCards();
        setTimeout(() => setStatusMessage(null), 2500);
      } else {
        setErrorMessage(res.error.message || "Ошибка удаления карточки");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <BrainCircuit className="w-3.5 h-3.5 text-accent-primary" />
            Флешкарты темы ({cards.length})
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            Карточки для ежедневного интервального повторения в тренажере /practice
          </p>
        </div>

        {!isFormOpen && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAddForm}
            className="h-7 text-xs px-2.5"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Добавить карточку
          </Button>
        )}
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="flex items-center gap-2 p-2.5 bg-status-success/10 border border-status-success/30 text-status-success text-xs rounded-md animate-in fade-in duration-150">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 bg-status-error/10 border border-status-error/30 text-status-error text-xs rounded-md animate-in fade-in duration-150">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {loadError && (
        <div className="flex items-center gap-2 p-2.5 bg-status-error/10 border border-status-error/30 text-status-error text-xs rounded-md">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Add / Edit Form Modal / Inline Card */}
      {isFormOpen && (
        <form
          onSubmit={handleSaveCard}
          className="p-4 rounded-lg bg-surface-subtle border border-border-focus space-y-3.5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-accent-primary" />
              {editingCardId ? "Редактирование карточки" : "Новая флешкарта"}
            </h4>
            <button
              type="button"
              onClick={handleCloseForm}
              className="text-text-muted hover:text-text-primary p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Front (Question / Term) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-text-secondary">
                Лицевая сторона (Термин / Вопрос) *
              </label>
              <div className="flex items-center gap-1 p-0.5 rounded bg-surface-canvas border border-border-subtle text-[10px]">
                <button
                  type="button"
                  onClick={() => setFrontMode("edit")}
                  className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                    frontMode === "edit"
                      ? "bg-surface-elevated text-text-primary font-medium"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  Редактирование
                </button>
                <button
                  type="button"
                  onClick={() => setFrontMode("preview")}
                  className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                    frontMode === "preview"
                      ? "bg-surface-elevated text-status-available font-medium"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  Предпросмотр
                </button>
              </div>
            </div>

            {frontMode === "edit" ? (
              <textarea
                rows={2}
                value={frontText}
                onChange={(e) => setFrontText(e.target.value)}
                placeholder="Что такое ... ? / Ключевой термин (поддерживает Markdown)"
                className="w-full bg-surface-canvas border border-border-subtle rounded-md px-3 py-2 text-text-primary text-xs placeholder:text-text-muted focus:outline-none focus:border-border-focus resize-none"
                disabled={isSaving}
              />
            ) : (
              <div className="w-full min-h-[50px] bg-surface-canvas border border-border-subtle rounded-md px-3 py-2 text-xs">
                {frontText.trim() ? (
                  <MarkdownRenderer content={frontText} />
                ) : (
                  <span className="text-text-muted italic text-[11px]">
                    Лицевая сторона пуста.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Back (Answer / Definition) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-text-secondary">
                Оборотная сторона (Определение / Ответ) *
              </label>
              <div className="flex items-center gap-1 p-0.5 rounded bg-surface-canvas border border-border-subtle text-[10px]">
                <button
                  type="button"
                  onClick={() => setBackMode("edit")}
                  className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                    backMode === "edit"
                      ? "bg-surface-elevated text-text-primary font-medium"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  Редактирование
                </button>
                <button
                  type="button"
                  onClick={() => setBackMode("preview")}
                  className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                    backMode === "preview"
                      ? "bg-surface-elevated text-status-available font-medium"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  Предпросмотр
                </button>
              </div>
            </div>

            {backMode === "edit" ? (
              <textarea
                rows={3}
                value={backText}
                onChange={(e) => setBackText(e.target.value)}
                placeholder="Четкое объяснение, формула или определение (поддерживает Markdown)"
                className="w-full bg-surface-canvas border border-border-subtle rounded-md px-3 py-2 text-text-primary text-xs placeholder:text-text-muted focus:outline-none focus:border-border-focus resize-none"
                disabled={isSaving}
              />
            ) : (
              <div className="w-full min-h-[60px] bg-surface-canvas border border-border-subtle rounded-md px-3 py-2 text-xs">
                {backText.trim() ? (
                  <MarkdownRenderer content={backText} />
                ) : (
                  <span className="text-text-muted italic text-[11px]">
                    Оборотная сторона пуста.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCloseForm}
              disabled={isSaving}
              className="h-7 text-xs px-2.5"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving || !frontText.trim() || !backText.trim()}
              className="h-7 text-xs px-3"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Check className="w-3.5 h-3.5 mr-1.5" />
              )}
              {editingCardId ? "Сохранить изменения" : "Создать карточку"}
            </Button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Banner */}
      {deletingCardId && (
        <div className="p-3.5 rounded-lg bg-surface-subtle border border-status-error/40 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-status-error shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-semibold text-text-primary">
                Удалить эту флешкарту?
              </h4>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Карточка будет удалена из базы и очередей интервального повторения студентов.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingCardId(null)}
              disabled={isDeleting}
              className="h-6 text-xs px-2"
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleDeleteCard(deletingCardId)}
              disabled={isDeleting}
              className="h-6 text-xs px-2.5 bg-status-error hover:bg-status-error/90 text-white"
            >
              {isDeleting ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Trash2 className="w-3 h-3 mr-1" />
              )}
              Удалить
            </Button>
          </div>
        </div>
      )}

      {/* Cards List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-muted gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-status-available" />
          <span className="text-xs">Загрузка карточек...</span>
        </div>
      ) : cards.length === 0 && !isFormOpen ? (
        /* Empty State */
        <div className="p-6 text-center border border-dashed border-border-subtle rounded-lg bg-surface-subtle space-y-3">
          <div className="w-9 h-9 mx-auto rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center text-text-muted">
            <BrainCircuit className="w-4 h-4 text-accent-primary" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-text-primary">
              Нет ручных флешкарт
            </h4>
            <p className="text-[11px] text-text-muted max-w-sm mx-auto leading-relaxed">
              У этой темы пока нет ручных карточек для повторения. Студенты будут
              повторять только автогенерацию из квизов.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAddForm}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Создать первую карточку
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map((card, idx) => (
            <div
              key={card.id}
              className="p-3 rounded-lg bg-surface-subtle border border-border-subtle hover:border-border-strong transition-colors space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase text-text-muted tracking-wider">
                  Карточка #{idx + 1}
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEditForm(card)}
                    className="h-6 w-6 p-0 text-text-muted hover:text-text-primary"
                    title="Редактировать"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingCardId(card.id)}
                    className="h-6 w-6 p-0 text-text-muted hover:text-status-error"
                    title="Удалить"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Front Preview */}
              <div className="text-xs space-y-0.5">
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  Вопрос:
                </span>
                <p className="font-medium text-text-primary line-clamp-2">
                  {card.front}
                </p>
              </div>

              {/* Back Preview */}
              <div className="text-xs space-y-0.5 pt-1 border-t border-border-subtle/50">
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  Ответ:
                </span>
                <p className="text-text-secondary text-[11px] line-clamp-2">
                  {card.back}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
