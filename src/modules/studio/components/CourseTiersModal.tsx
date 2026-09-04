"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Button, Input, Card, Badge } from "@/shared/ui";
import {
  getCourseTiersAction,
  createCourseTierAction,
  updateCourseTierAction,
  deleteCourseTierAction,
  type CourseTierDTO,
} from "@/server/actions";
import {
  Layers,
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  HelpCircle,
} from "lucide-react";

export interface CourseTiersModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseSlug: string;
  initialTiers?: CourseTierDTO[];
  onTiersUpdated?: (tiers: CourseTierDTO[]) => void;
}

const PRESET_COLORS = [
  "#10b981", // Emerald
  "#0ea5e9", // Sky
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#64748b", // Slate
];

export function CourseTiersModal({
  isOpen,
  onClose,
  courseSlug,
  initialTiers = [],
  onTiersUpdated,
}: CourseTiersModalProps) {
  const [tiers, setTiers] = useState<CourseTierDTO[]>(initialTiers);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Tier form state
  const [newTitle, setNewTitle] = useState("");
  const [newLevel, setNewLevel] = useState(1);
  const [newColor, setNewColor] = useState("#10b981");
  const [isCreating, startCreating] = useTransition();

  // Edit Tier state
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLevel, setEditLevel] = useState(1);
  const [editColor, setEditColor] = useState("#10b981");
  const [isUpdating, startUpdating] = useTransition();

  // Delete confirmation state
  const [deletingTierId, setDeletingTierId] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  // Load tiers from server
  const loadTiers = async () => {
    setIsLoading(true);
    const res = await getCourseTiersAction({ courseSlug });
    if (res.success && res.data) {
      setTiers(res.data.tiers);
      onTiersUpdated?.(res.data.tiers);
      // Update next suggested level
      const maxLvl = res.data.tiers.reduce((max, t) => Math.max(max, t.level), 0);
      setNewLevel(maxLvl + 1);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setEditingTierId(null);
      setDeletingTierId(null);
      setNewTitle("");
      if (initialTiers.length > 0) {
        setTiers(initialTiers);
        const maxLvl = initialTiers.reduce((max, t) => Math.max(max, t.level), 0);
        setNewLevel(maxLvl + 1);
      }
      loadTiers();
    }
  }, [isOpen, courseSlug]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isCreating && !isUpdating && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isCreating, isUpdating, isDeleting]);

  if (!isOpen) return null;

  // Handle Create Tier
  const handleCreateTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    startCreating(async () => {
      const res = await createCourseTierAction({
        courseSlug,
        title: newTitle.trim(),
        level: Number(newLevel),
        badgeColor: newColor,
      });

      if (res.success) {
        setNewTitle("");
        setSuccessMessage("Уровень успешно добавлен");
        await loadTiers();
        setTimeout(() => setSuccessMessage(null), 2500);
      } else {
        setErrorMessage(res.error?.message || "Ошибка добавления уровня");
      }
    });
  };

  // Handle Start Edit
  const handleStartEdit = (tier: CourseTierDTO) => {
    setEditingTierId(tier.id);
    setEditTitle(tier.title);
    setEditLevel(tier.level);
    setEditColor(tier.badgeColor || "#10b981");
    setDeletingTierId(null);
    setErrorMessage(null);
  };

  // Handle Cancel Edit
  const handleCancelEdit = () => {
    setEditingTierId(null);
    setErrorMessage(null);
  };

  // Handle Save Edit
  const handleSaveEdit = (tierId: string) => {
    if (!editTitle.trim()) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    startUpdating(async () => {
      const res = await updateCourseTierAction({
        courseSlug,
        tierId,
        title: editTitle.trim(),
        level: Number(editLevel),
        badgeColor: editColor,
      });

      if (res.success) {
        setEditingTierId(null);
        setSuccessMessage("Уровень обновлен");
        await loadTiers();
        setTimeout(() => setSuccessMessage(null), 2500);
      } else {
        setErrorMessage(res.error?.message || "Ошибка обновления уровня");
      }
    });
  };

  // Handle Delete Tier
  const handleDeleteTier = (tierId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startDeleting(async () => {
      const res = await deleteCourseTierAction({
        courseSlug,
        tierId,
      });

      if (res.success) {
        setDeletingTierId(null);
        setSuccessMessage("Уровень удален, темы перенесены");
        await loadTiers();
        setTimeout(() => setSuccessMessage(null), 2500);
      } else {
        setErrorMessage(res.error?.message || "Ошибка удаления уровня");
      }
    });
  };

  const tierBeingDeleted = tiers.find((t) => t.id === deletingTierId);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl bg-surface-elevated border-border-subtle shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-surface-subtle border border-border-subtle text-accent-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Уровни и модули курса
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Организуйте граф тем курса по уровням сложности (Tiers)
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-2"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Notifications */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-status-error/10 border border-status-error/30 text-status-error text-xs rounded-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-status-success/10 border border-status-success/30 text-status-success text-xs rounded-md">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Delete Confirmation Alert */}
          {deletingTierId && tierBeingDeleted && (
            <div className="p-4 rounded-lg bg-surface-subtle border border-status-error/40 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-status-error shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-text-primary">
                    Удалить уровень «{tierBeingDeleted.title}»?
                  </h4>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Темы курса не удалятся: все привязанные темы (
                    {tierBeingDeleted.topicsCount ?? 0}) будут безопасно
                    перенесены в статус «Без тира» / основной уровень.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingTierId(null)}
                  disabled={isDeleting}
                >
                  Отмена
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleDeleteTier(deletingTierId)}
                  disabled={isDeleting}
                  className="bg-status-error hover:bg-status-error/90 text-white"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Подтвердить удаление
                </Button>
              </div>
            </div>
          )}

          {/* Existing Tiers List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Текущие уровни курса ({tiers.length})
              </h3>
              {isLoading && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-text-muted" />
              )}
            </div>

            {tiers.length === 0 && !isLoading ? (
              <div className="p-6 text-center border border-dashed border-border-subtle rounded-lg text-text-muted text-xs">
                У курса пока нет уровней. Создайте первый уровень ниже.
              </div>
            ) : (
              <div className="space-y-2">
                {tiers.map((tier) => {
                  const isEditing = editingTierId === tier.id;

                  if (isEditing) {
                    return (
                      <div
                        key={tier.id}
                        className="p-3.5 rounded-lg bg-surface-subtle border border-border-focus space-y-3"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-3 space-y-1">
                            <label className="text-[11px] font-medium text-text-muted">
                              Название уровня
                            </label>
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Например: Tier 1: Основы"
                              className="h-8 text-xs"
                              disabled={isUpdating}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-text-muted">
                              Уровень (Level)
                            </label>
                            <Input
                              type="number"
                              min={1}
                              value={editLevel}
                              onChange={(e) => setEditLevel(Number(e.target.value))}
                              className="h-8 text-xs"
                              disabled={isUpdating}
                            />
                          </div>
                        </div>

                        {/* Color Selector */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-text-muted mr-1">
                              Цвет:
                            </span>
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setEditColor(color)}
                                className={`w-5 h-5 rounded-full transition-transform ${
                                  editColor === color
                                    ? "ring-2 ring-white scale-110"
                                    : "opacity-80 hover:opacity-100"
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                              disabled={isUpdating}
                              className="h-7 text-xs px-2.5"
                            >
                              Отмена
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleSaveEdit(tier.id)}
                              disabled={isUpdating || !editTitle.trim()}
                              className="h-7 text-xs px-3"
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                              ) : (
                                <Check className="w-3.5 h-3.5 mr-1" />
                              )}
                              Сохранить
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={tier.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle border border-border-subtle hover:border-border-strong transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: tier.badgeColor }}
                        />
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-surface-elevated border border-border-subtle text-text-primary">
                            T{tier.level}
                          </span>
                          <span className="text-sm font-medium text-text-primary truncate">
                            {tier.title}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-text-muted">
                          {tier.topicsCount ?? 0} тем
                        </span>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(tier)}
                            className="h-7 w-7 p-0 text-text-muted hover:text-text-primary"
                            title="Редактировать уровень"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingTierId(tier.id)}
                            className="h-7 w-7 p-0 text-text-muted hover:text-status-error"
                            title="Удалить уровень"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Add Form */}
          <div className="p-4 rounded-lg bg-surface-subtle border border-border-subtle space-y-3.5">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-accent-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                Быстрое добавление нового уровня
              </h3>
            </div>

            <form onSubmit={handleCreateTier} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[11px] font-medium text-text-muted">
                    Название («Tier 1: Основы», «Продвинутый синтаксис»)
                  </label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Например: Tier 1: Основы"
                    className="h-8 text-xs"
                    disabled={isCreating}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-text-muted">
                    Порядковый уровень
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={newLevel}
                    onChange={(e) => setNewLevel(Number(e.target.value))}
                    className="h-8 text-xs"
                    disabled={isCreating}
                  />
                </div>
              </div>

              {/* Color selection and submit button */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-text-muted mr-1">
                    Цвет бейджа:
                  </span>
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      className={`w-5 h-5 rounded-full transition-transform ${
                        newColor === color
                          ? "ring-2 ring-white scale-110"
                          : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isCreating || !newTitle.trim()}
                  className="h-8 text-xs px-3.5"
                >
                  {isCreating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Добавить уровень
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-border-subtle bg-surface-elevated shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </Card>
    </div>
  );
}
