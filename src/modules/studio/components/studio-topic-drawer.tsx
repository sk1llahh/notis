"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Drawer, Card, CardHeader, CardTitle, CardContent, Button, Badge, MarkdownRenderer } from "@/shared/ui";
import {
  getTopicStudioDetailsAction,
  updateTopicContentAction,
  upsertQuizQuestionAction,
  deleteQuizQuestionAction,
  publishTopicAction,
  deleteTopicAction,
  assignTopicTierAction,
  getTopicFlashcardsAction,
} from "@/server/actions";
import {
  FileText,
  HelpCircle,
  Settings,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Radio,
  CheckSquare,
  Globe,
  EyeOff,
  BrainCircuit,
} from "lucide-react";
import { StudioFlashcardsTab } from "./StudioFlashcardsTab";
import type { TopicStudioDetailsDTO, StudioQuizQuestionDTO } from "../types";

export type StudioTab = "content" | "quiz" | "flashcards" | "status";

export interface StudioTopicDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  courseSlug: string;
  topicId: string | null;
  availableTiers?: Array<{
    id: string;
    title: string;
    level: number;
    badgeColor?: string;
  }>;
  onTopicUpdated?: (topic: {
    id: string;
    title: string;
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
    isPublished: boolean;
    version: number;
    tier?: {
      id: string;
      slug: string;
      title: string;
      badgeColor: string;
      order: number;
    };
  }) => void;
  onTopicDeleted?: (topicId: string) => void;
}

export function StudioTopicDrawer({
  isOpen,
  onClose,
  courseSlug,
  topicId,
  availableTiers = [],
  onTopicUpdated,
  onTopicDeleted,
}: StudioTopicDrawerProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>("content");
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [topicDetails, setTopicDetails] = useState<TopicStudioDetailsDTO | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [flashcardsCount, setFlashcardsCount] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Content form state
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [summaryMode, setSummaryMode] = useState<"edit" | "preview">("edit");
  const [difficulty, setDifficulty] = useState<
    "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT"
  >("BEGINNER");
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [pitfalls, setPitfalls] = useState<string[]>([]);
  const [contentStatus, setContentStatus] = useState<string | null>(null);
  const [isSavingContent, startSavingContent] = useTransition();

  // Quiz editing state
  const [questions, setQuestions] = useState<StudioQuizQuestionDTO[]>([]);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<"SINGLE_CHOICE" | "MULTIPLE_CHOICE">("SINGLE_CHOICE");
  const [qOptions, setQOptions] = useState<Array<{ text: string; codeSnippet?: string }>>([
    { text: "" },
    { text: "" },
  ]);
  const [qCorrectIndexes, setQCorrectIndexes] = useState<number[]>([0]);
  const [qExplanation, setQExplanation] = useState("");
  const [quizStatus, setQuizStatus] = useState<string | null>(null);
  const [isSavingQuiz, startSavingQuiz] = useTransition();

  // Status & Version state
  const [isPublished, setIsPublished] = useState(false);
  const [version, setVersion] = useState(1);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [isSavingPublish, startSavingPublish] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeletingTopic, startDeletingTopic] = useTransition();

  // Load details whenever drawer opens or topicId changes
  useEffect(() => {
    if (!isOpen || !topicId) {
      setTopicDetails(null);
      setConfirmDelete(false);
      return;
    }

    let isMounted = true;
    setIsLoadingDetails(true);
    setLoadError(null);
    setContentStatus(null);
    setQuizStatus(null);
    setPublishStatus(null);
    setConfirmDelete(false);

    getTopicStudioDetailsAction({ courseSlug, topicId })
      .then((res) => {
        if (!isMounted) return;
        if (res.success) {
          const d = res.data;
          setTopicDetails(d);
          setTitle(d.title);
          setSummary(d.summary);
          setDifficulty(d.difficulty);
          setKeyPoints(d.keyPoints.length > 0 ? d.keyPoints : [""]);
          setPitfalls(d.pitfalls.length > 0 ? d.pitfalls : [""]);
          setQuestions(d.questions);
          setIsPublished(d.isPublished);
          setVersion(d.version);
          setSelectedTierId(d.tierId ?? "");
        } else {
          setLoadError(res.error.message);
        }

      })
      .catch(() => {
        if (isMounted) setLoadError("Ошибка сетевого взаимодействия");
      })
      .finally(() => {
        if (isMounted) setIsLoadingDetails(false);
      });

    getTopicFlashcardsAction({ courseSlug, topicId })
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setFlashcardsCount(res.data.cards.length);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isOpen, topicId, courseSlug]);

  // Handler: Save content
  const handleSaveContent = () => {
    if (!topicId) return;

    startSavingContent(async () => {
      setContentStatus(null);
      const res = await updateTopicContentAction({
        courseSlug,
        topicId,
        title,
        summary,
        difficulty,
        keyPoints: keyPoints.filter((p) => p.trim() !== ""),
        pitfalls: pitfalls.filter((p) => p.trim() !== ""),
      });

      if (res.success) {
        let tierPayload: {
          id: string;
          slug: string;
          title: string;
          badgeColor: string;
          order: number;
        } | undefined;

        if (selectedTierId !== topicDetails?.tierId) {
          const tierRes = await assignTopicTierAction({
            courseSlug,
            topicId,
            tierId: selectedTierId || null,
          });
          if (tierRes.success) {
            const matched = availableTiers.find((t) => t.id === tierRes.data.tierId);
            if (matched) {
              tierPayload = {
                id: matched.id,
                slug: `tier-${matched.level}`,
                title: matched.title,
                badgeColor: matched.badgeColor ?? "#10b981",
                order: matched.level,
              };
            }
          }
        } else if (selectedTierId) {
          const matched = availableTiers.find((t) => t.id === selectedTierId);
          if (matched) {
            tierPayload = {
              id: matched.id,
              slug: `tier-${matched.level}`,
              title: matched.title,
              badgeColor: matched.badgeColor ?? "#10b981",
              order: matched.level,
            };
          }
        }

        setContentStatus("Сохранено");
        onTopicUpdated?.({
          id: topicId,
          title,
          difficulty,
          isPublished,
          version,
          tier: tierPayload,
        });
        setTimeout(() => setContentStatus(null), 2500);
      } else {
        setContentStatus(res.error?.message ?? "Ошибка сохранения");
      }
    });
  };

  // Handler: Open form for new question
  const handleOpenAddQuestion = () => {
    setIsAddingQuestion(true);
    setEditingQuestionId(null);
    setQText("");
    setQType("SINGLE_CHOICE");
    setQOptions([{ text: "" }, { text: "" }]);
    setQCorrectIndexes([0]);
    setQExplanation("");
    setQuizStatus(null);
  };

  // Handler: Open question for editing
  const handleEditQuestion = (q: StudioQuizQuestionDTO) => {
    setIsAddingQuestion(true);
    setEditingQuestionId(q.id);
    setQText(q.question);
    setQType(q.type);
    setQOptions(q.options.length >= 2 ? q.options : [{ text: "" }, { text: "" }]);
    setQCorrectIndexes(q.correctIndexes);
    setQExplanation(q.explanation ?? "");
    setQuizStatus(null);
  };

  // Handler: Toggle correct answer index
  const handleToggleCorrectIndex = (idx: number) => {
    if (qType === "SINGLE_CHOICE") {
      setQCorrectIndexes([idx]);
    } else {
      if (qCorrectIndexes.includes(idx)) {
        if (qCorrectIndexes.length > 1) {
          setQCorrectIndexes(qCorrectIndexes.filter((i) => i !== idx));
        }
      } else {
        setQCorrectIndexes([...qCorrectIndexes, idx].sort((a, b) => a - b));
      }
    }
  };

  // Handler: Save Question
  const handleSaveQuestion = () => {
    if (!topicId) return;

    startSavingQuiz(async () => {
      setQuizStatus(null);
      const res = await upsertQuizQuestionAction({
        courseSlug,
        topicId,
        questionId: editingQuestionId ?? undefined,
        question: qText,
        type: qType,
        options: qOptions,
        correctIndexes: qCorrectIndexes,
        explanation: qExplanation.trim() ? qExplanation : undefined,
      });

      if (res.success) {
        // Refresh question list
        const refresh = await getTopicStudioDetailsAction({ courseSlug, topicId });
        if (refresh.success && refresh.data) {
          setQuestions(refresh.data.questions);
        }
        setIsAddingQuestion(false);
        setEditingQuestionId(null);
        setQuizStatus("Вопрос сохранен");
        setTimeout(() => setQuizStatus(null), 2500);
      } else {
        setQuizStatus(res.error?.message ?? "Ошибка сохранения вопроса");
      }
    });
  };

  // Handler: Delete Question
  const handleDeleteQuestion = (questionId: string) => {
    if (!topicId) return;

    startSavingQuiz(async () => {
      const res = await deleteQuizQuestionAction({
        courseSlug,
        topicId,
        questionId,
      });

      if (res.success) {
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
        if (editingQuestionId === questionId) {
          setIsAddingQuestion(false);
          setEditingQuestionId(null);
        }
        setQuizStatus("Вопрос удален");
        setTimeout(() => setQuizStatus(null), 2500);
      } else {
        setQuizStatus(res.error?.message ?? "Ошибка удаления вопроса");
      }
    });
  };

  // Handler: Toggle Publish
  const handleTogglePublish = (publish: boolean) => {
    if (!topicId) return;

    startSavingPublish(async () => {
      setPublishStatus(null);
      const res = await publishTopicAction({
        courseSlug,
        topicId,
        isPublished: publish,
        bumpVersion: false,
      });

      if (res.success) {
        setIsPublished(res.data.isPublished);
        onTopicUpdated?.({
          id: topicId,
          title,
          difficulty,
          isPublished: res.data.isPublished,
          version,
        });
        setPublishStatus(publish ? "Опубликовано" : "Скрыто из общего доступа");
        setTimeout(() => setPublishStatus(null), 2500);
      } else {
        setPublishStatus(res.error.message);
      }
    });
  };

  // Handler: Bump Version (v+1)
  const handleBumpVersion = () => {
    if (!topicId) return;

    startSavingPublish(async () => {
      setPublishStatus(null);
      const res = await publishTopicAction({
        courseSlug,
        topicId,
        isPublished: true,
        bumpVersion: true,
      });

      if (res.success) {
        setVersion(res.data.version);
        setIsPublished(res.data.isPublished);
        onTopicUpdated?.({
          id: topicId,
          title,
          difficulty,
          isPublished: res.data.isPublished,
          version: res.data.version,
        });
        setPublishStatus(`Версия обновлена до v${res.data.version}`);
        setTimeout(() => setPublishStatus(null), 3000);
      } else {
        setPublishStatus(res.error.message);
      }
    });
  };

  // Handler: Delete Topic
  const handleDeleteTopic = () => {
    if (!topicId) return;

    startDeletingTopic(async () => {
      setPublishStatus(null);
      const res = await deleteTopicAction({
        courseSlug,
        topicId,
      });

      if (res.success) {
        setConfirmDelete(false);
        onTopicDeleted?.(topicId);
        onClose();
      } else {
        setPublishStatus(res.error.message || "Ошибка удаления темы");
      }
    });
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={topicDetails?.title ?? "Редактирование темы"}
      description={`Настройка контента, квизов и публикации (${courseSlug})`}
      className="max-w-lg"
    >
      {/* Loading state */}
      {isLoadingDetails && (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-status-available" />
          <span className="text-xs font-mono">Загрузка данных темы...</span>
        </div>
      )}

      {/* Error state */}
      {loadError && !isLoadingDetails && (
        <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {!isLoadingDetails && topicDetails && (
        <div className="flex flex-col h-full">
          {/* Tabs Navigation */}
          <div className="flex items-center gap-1 border-b border-border-subtle pb-3 mb-5">
            <button
              type="button"
              onClick={() => setActiveTab("content")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all duration-150 cursor-pointer ${
                activeTab === "content"
                  ? "bg-surface-elevated text-status-available border border-border-strong shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Контент
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("quiz")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all duration-150 cursor-pointer ${
                activeTab === "quiz"
                  ? "bg-surface-elevated text-status-available border border-border-strong shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Квиз ({questions.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("flashcards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all duration-150 cursor-pointer ${
                activeTab === "flashcards"
                  ? "bg-surface-elevated text-status-available border border-border-strong shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              Карточки SM-2 {flashcardsCount > 0 && `(${flashcardsCount})`}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("status")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all duration-150 cursor-pointer ${
                activeTab === "status"
                  ? "bg-surface-elevated text-status-available border border-border-strong shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Статус и Версия
            </button>
          </div>

          {/* TAB 1: CONTENT */}
          {activeTab === "content" && (
            <div className="space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  Заголовок темы *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Название темы"
                  className="w-full bg-surface-canvas border border-border-subtle rounded-md px-3 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                />
              </div>

              {/* Summary with Edit / Preview Switch */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-text-secondary">
                    Краткая выжимка (summary)
                  </label>
                  <div className="flex items-center gap-1 p-0.5 rounded bg-surface-canvas border border-border-subtle text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSummaryMode("edit")}
                      className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                        summaryMode === "edit"
                          ? "bg-surface-elevated text-text-primary font-medium"
                          : "text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      Редактирование
                    </button>
                    <button
                      type="button"
                      onClick={() => setSummaryMode("preview")}
                      className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                        summaryMode === "preview"
                          ? "bg-surface-elevated text-status-available font-medium"
                          : "text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      Предпросмотр
                    </button>
                  </div>
                </div>

                {summaryMode === "edit" ? (
                  <textarea
                    rows={3}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="1-2 предложения, отражающие суть темы..."
                    className="w-full bg-surface-canvas border border-border-subtle rounded-md px-3 py-2 text-text-primary text-xs placeholder:text-text-muted focus:outline-none focus:border-border-focus resize-none"
                  />
                ) : (
                  <div className="w-full min-h-[70px] bg-surface-canvas border border-border-subtle rounded-md px-3 py-2 text-xs">
                    {summary ? (
                      <MarkdownRenderer content={summary} />
                    ) : (
                      <span className="text-text-muted italic">
                        Текст выжимки пуст. Переключитесь в режим редактирования для ввода.
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1.5">
                  Сложность
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`px-2 py-1.5 rounded-sm text-[11px] font-medium border text-center transition-all cursor-pointer ${
                        difficulty === lvl
                          ? "bg-surface-elevated border-status-available text-status-available"
                          : "bg-surface-card border-border-subtle text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tier Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1.5">
                  Уровень курса (Tier)
                </label>
                <select
                  value={selectedTierId}
                  onChange={(e) => setSelectedTierId(e.target.value)}
                  className="w-full bg-surface-canvas border border-border-subtle rounded-md px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-border-focus"
                >
                  <option value="">Без тира (Основной уровень)</option>
                  {availableTiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      T{t.level}: {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Key Points */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-text-secondary">
                    Ключевые тезисы (Key Points)
                  </label>
                  <button
                    type="button"
                    onClick={() => setKeyPoints([...keyPoints, ""])}
                    className="text-[11px] text-status-available hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Добавить тезис
                  </button>
                </div>
                <div className="space-y-1.5">
                  {keyPoints.map((point, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={point}
                        onChange={(e) => {
                          const updated = [...keyPoints];
                          updated[idx] = e.target.value;
                          setKeyPoints(updated);
                        }}
                        placeholder={`Тезис #${idx + 1}`}
                        className="flex-1 bg-surface-canvas border border-border-subtle rounded-md px-2.5 py-1.5 text-text-primary text-xs focus:outline-none focus:border-border-focus"
                      />
                      {keyPoints.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setKeyPoints(keyPoints.filter((_, i) => i !== idx))}
                          className="p-1.5 text-text-muted hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pitfalls */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-text-secondary">
                    Типичные ошибки (Pitfalls)
                  </label>
                  <button
                    type="button"
                    onClick={() => setPitfalls([...pitfalls, ""])}
                    className="text-[11px] text-status-available hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Добавить ошибку
                  </button>
                </div>
                <div className="space-y-1.5">
                  {pitfalls.map((pitfall, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={pitfall}
                        onChange={(e) => {
                          const updated = [...pitfalls];
                          updated[idx] = e.target.value;
                          setPitfalls(updated);
                        }}
                        placeholder={`Ошибка #${idx + 1}`}
                        className="flex-1 bg-surface-canvas border border-border-subtle rounded-md px-2.5 py-1.5 text-text-primary text-xs focus:outline-none focus:border-border-focus"
                      />
                      {pitfalls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPitfalls(pitfalls.filter((_, i) => i !== idx))}
                          className="p-1.5 text-text-muted hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Save content action button */}
              <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                <span className="text-xs font-mono text-status-completed">
                  {contentStatus}
                </span>
                <Button
                  onClick={handleSaveContent}
                  isLoading={isSavingContent}
                  size="sm"
                  variant="primary"
                >
                  Сохранить контент
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: QUIZ */}
          {activeTab === "quiz" && (
            <div className="space-y-4 text-xs">
              {quizStatus && (
                <div className="p-2 rounded bg-surface-elevated border border-border-subtle text-status-completed text-xs">
                  {quizStatus}
                </div>
              )}

              {/* Add question toggle */}
              {!isAddingQuestion && (
                <Button
                  onClick={handleOpenAddQuestion}
                  size="sm"
                  variant="secondary"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  className="w-full"
                >
                  Добавить новый вопрос квиза
                </Button>
              )}

              {/* Question Editor Form */}
              {isAddingQuestion && (
                <div className="p-4 rounded-lg bg-surface-elevated border border-border-strong space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-text-primary text-xs">
                      {editingQuestionId ? "Редактирование вопроса" : "Новый вопрос"}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingQuestion(false);
                        setEditingQuestionId(null);
                      }}
                      className="text-text-muted hover:text-text-primary text-[11px] cursor-pointer"
                    >
                      Отмена
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                      Формулировка вопроса *
                    </label>
                    <textarea
                      rows={2}
                      value={qText}
                      onChange={(e) => setQText(e.target.value)}
                      placeholder="Минимум 5 символов..."
                      className="w-full bg-surface-canvas border border-border-subtle rounded-md px-2.5 py-1.5 text-text-primary text-xs focus:outline-none focus:border-border-focus resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                      Тип выбора
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setQType("SINGLE_CHOICE");
                          setQCorrectIndexes([qCorrectIndexes[0] ?? 0]);
                        }}
                        className={`p-2 rounded border text-left text-xs transition-colors cursor-pointer ${
                          qType === "SINGLE_CHOICE"
                            ? "border-status-available bg-surface-card text-status-available"
                            : "border-border-subtle bg-surface-canvas text-text-muted"
                        }`}
                      >
                        <span className="font-semibold block">Одиночный выбор</span>
                        <span className="text-[10px] text-text-muted">1 верный ответ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setQType("MULTIPLE_CHOICE")}
                        className={`p-2 rounded border text-left text-xs transition-colors cursor-pointer ${
                          qType === "MULTIPLE_CHOICE"
                            ? "border-status-available bg-surface-card text-status-available"
                            : "border-border-subtle bg-surface-canvas text-text-muted"
                        }`}
                      >
                        <span className="font-semibold block">Множественный выбор</span>
                        <span className="text-[10px] text-text-muted">Несколько верных</span>
                      </button>
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-text-secondary">
                        Варианты ответа (отметьте правильные) *
                      </label>
                      <button
                        type="button"
                        onClick={() => setQOptions([...qOptions, { text: "" }])}
                        className="text-[11px] text-status-available hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Вариант
                      </button>
                    </div>

                    <div className="space-y-2">
                      {qOptions.map((opt, idx) => {
                        const isCorrect = qCorrectIndexes.includes(idx);
                        return (
                          <div
                            key={idx}
                            className={`p-2 rounded border flex items-center gap-2 ${
                              isCorrect
                                ? "border-status-completed/60 bg-status-completed/5"
                                : "border-border-subtle bg-surface-canvas"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleCorrectIndex(idx)}
                              className="cursor-pointer shrink-0 text-text-muted hover:text-status-completed"
                              title="Отметить как правильный"
                            >
                              {qType === "SINGLE_CHOICE" ? (
                                <Radio
                                  className={`w-4 h-4 ${
                                    isCorrect ? "text-status-completed fill-status-completed" : ""
                                  }`}
                                />
                              ) : (
                                <CheckSquare
                                  className={`w-4 h-4 ${
                                    isCorrect ? "text-status-completed" : ""
                                  }`}
                                />
                              )}
                            </button>

                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const next = [...qOptions];
                                next[idx] = { ...next[idx], text: e.target.value };
                                setQOptions(next);
                              }}
                              placeholder={`Вариант #${idx + 1}`}
                              className="flex-1 bg-transparent border-none text-xs text-text-primary focus:outline-none"
                            />

                            {qOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setQOptions(qOptions.filter((_, i) => i !== idx));
                                  setQCorrectIndexes(
                                    qCorrectIndexes
                                      .filter((i) => i !== idx)
                                      .map((i) => (i > idx ? i - 1 : i))
                                  );
                                }}
                                className="text-text-muted hover:text-red-400 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                      Пояснение к ответу (Explanation)
                    </label>
                    <input
                      type="text"
                      value={qExplanation}
                      onChange={(e) => setQExplanation(e.target.value)}
                      placeholder="Почему этот ответ правильный..."
                      className="w-full bg-surface-canvas border border-border-subtle rounded-md px-2.5 py-1.5 text-text-primary text-xs focus:outline-none focus:border-border-focus"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Button
                      onClick={handleSaveQuestion}
                      isLoading={isSavingQuiz}
                      size="sm"
                      variant="primary"
                    >
                      Сохранить вопрос
                    </Button>
                  </div>
                </div>
              )}

              {/* List of existing questions */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  Существующие вопросы ({questions.length})
                </h4>

                {questions.length === 0 && (
                  <p className="text-xs text-text-muted italic py-4 text-center">
                    В этой теме пока нет вопросов квиза.
                  </p>
                )}

                {questions.map((q, qIndex) => {
                  const isExpanded = expandedQuestionId === q.id;
                  return (
                    <Card key={q.id} variant="default" className="p-3 bg-surface-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="font-mono text-[11px] text-text-muted pt-0.5">
                            #{qIndex + 1}
                          </span>
                          <div>
                            <p className="text-xs font-medium text-text-primary line-clamp-2">
                              {q.question}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge size="sm" variant="outline">
                                {q.type === "SINGLE_CHOICE" ? "Одиночный" : "Множественный"}
                              </Badge>
                              <span className="text-[10px] text-text-muted">
                                {q.options.length} вар.
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditQuestion(q)}
                            className="p-1 text-text-muted hover:text-text-primary cursor-pointer text-[11px]"
                          >
                            Редакт.
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1 text-text-muted hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedQuestionId(isExpanded ? null : q.id)
                            }
                            className="p-1 text-text-muted hover:text-text-primary cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border-subtle space-y-1.5 text-[11px]">
                          {q.options.map((opt, oIdx) => {
                            const isCorrect = q.correctIndexes.includes(oIdx);
                            return (
                              <div
                                key={oIdx}
                                className={`px-2 py-1 rounded flex items-center justify-between ${
                                  isCorrect
                                    ? "bg-status-completed/10 text-status-completed font-medium"
                                    : "text-text-secondary"
                                }`}
                              >
                                <span>{opt.text}</span>
                                {isCorrect && <Check className="w-3 h-3 shrink-0" />}
                              </div>
                            );
                          })}
                          {q.explanation && (
                            <p className="text-[10px] text-text-muted italic pt-1">
                              Пояснение: {q.explanation}
                            </p>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: FLASHCARDS SM-2 */}
          {activeTab === "flashcards" && topicId && (
            <StudioFlashcardsTab
              courseSlug={courseSlug}
              topicId={topicId}
              onCountChanged={setFlashcardsCount}
            />
          )}

          {/* TAB 4: STATUS & VERSION */}
          {activeTab === "status" && (
            <div className="space-y-6 text-xs">
              {publishStatus && (
                <div className="p-2.5 rounded bg-surface-elevated border border-border-subtle text-status-completed text-xs font-mono">
                  {publishStatus}
                </div>
              )}

              {/* Publication Status Card */}
              <Card variant="default" className="p-4 bg-surface-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isPublished ? (
                      <Globe className="w-4 h-4 text-status-completed" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-status-locked" />
                    )}
                    <div>
                      <h4 className="font-semibold text-text-primary text-xs">
                        {isPublished ? "Опубликовано для студентов" : "Черновик (скрыто)"}
                      </h4>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {isPublished
                          ? "Тема видна на графе курса и доступна для изучения."
                          : "Тема доступна только авторам и скрыта от студентов."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={() => handleTogglePublish(!isPublished)}
                    isLoading={isSavingPublish}
                    size="sm"
                    variant={isPublished ? "outline" : "primary"}
                  >
                    {isPublished ? "Снять с публикации" : "Опубликовать"}
                  </Button>
                </div>
              </Card>

              {/* Version Bump Card */}
              <Card variant="default" className="p-4 bg-surface-card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-text-primary text-xs">
                        Версионирование темы
                      </h4>
                      <Badge size="sm" variant="available">
                        v{version}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                      При выпуске существенных правок инкрементируйте версию. У всех ранее
                      прошедших тему студентов загорится индикатор обновления на графе.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={handleBumpVersion}
                    isLoading={isSavingPublish}
                    size="sm"
                    variant="secondary"
                    leftIcon={<Sparkles className="w-3.5 h-3.5 text-status-diff" />}
                  >
                    Опубликовать обновление (v{version + 1})
                  </Button>
                </div>
              </Card>

              {/* Danger Zone: Delete Topic */}
              <Card variant="default" className="p-4 bg-surface-card border-red-500/30 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-400 text-xs">
                      Опасная зона: Удаление темы
                    </h4>
                    <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                      Безвозвратно удаляет тему, её учебные материалы, вопросы квиза и все входящие/исходящие связи на графе.
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
                        disabled={isDeletingTopic}
                        size="sm"
                        variant="ghost"
                      >
                        Отмена
                      </Button>
                      <Button
                        type="button"
                        onClick={handleDeleteTopic}
                        isLoading={isDeletingTopic}
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                      >
                        Да, удалить
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Удалить тему
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
