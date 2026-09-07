"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { Button, Badge } from "@/shared/ui";
import { importTopicAction } from "@/server/actions/import-topic-actions";
import { generateTopicDraftAction } from "@/server/actions/ai-topic-actions";
import {
  importedTopicPayloadSchema,
  type ImportedTopicPayload,
  type ImportTopicOutput,
} from "@/server/actions/import-topic-actions.schemas";
import {
  Upload,
  FileText,
  Code,
  Sparkles,
  AlertCircle,
  Check,
  X,
  FileUp,
  Layers,
  Key,
  Eye,
  EyeOff,
  Cpu,
  Wand2,
  BookOpen,
  Loader2,
  ExternalLink,
} from "lucide-react";

export interface ImportTopicModalTierItem {
  id: string;
  title: string;
  level?: number;
  order?: number;
}

export interface ImportTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseSlug: string;
  tiers: ImportTopicModalTierItem[];
  onTopicImported: (data: ImportTopicOutput) => void;
  defaultTab?: "file" | "text" | "ai";
}

export const SAMPLE_TOPIC_JSON = JSON.stringify(
  {
    title: "Введение в квантовые вычисления",
    slug: "quantum-computing-intro",
    difficulty: "INTERMEDIATE",
    estimatedMinutes: 20,
    isFreePreview: false,
    description: `# Квантовые вычисления

Квантовые вычисления используют фундаментальные законы квантовой механики для решения задач, недоступных классическим суперкомпьютерам.

## 1. Кубит и принцип суперпозиции

В отличие от классического бита, принимающего значения $0$ или $1$, квантовый бит (**кубит**) может находиться в суперпозиции обоих состояний:

$$|\\psi\\rangle = \\alpha |0\\rangle + \\beta |1\\rangle$$

где $\\alpha, \\beta \\in \\mathbb{C}$ — амплитуды вероятности, удовлетворяющие условию нормировки:

$$|\\alpha|^2 + |\\beta|^2 = 1$$

## 2. Схема создания суперпозиции

Преобразование Адамара ($H$) переводит базисное состояние $|0\\rangle$ в равномерную суперпозицию:

\`\`\`mermaid
graph LR
    A["Вход: |0⟩"] --> B["Врата Адамара H"]
    B --> C["Выход: (|0⟩ + |1⟩) / √2"]
\`\`\`

## 3. Квантовая запутанность

Когда два кубита запутаны, состояние одного мгновенно определяет состояние другого:

$$|\\Phi^+\\rangle = \\frac{|00\\rangle + |11\\rangle}{\\sqrt{2}}$$`,
    summary: "Основы квантовых вычислений, кубиты, суперпозиция, врата Адамара и запутанность.",
    keyPoints: [
      "Кубит описывается вектором состояния в гильбертовом пространстве",
      "Врата Адамара создают равную суперпозицию базисных состояний",
      "При измерении кубит коллапсирует в одно из базисных состояний с вероятностью |α|² или |β|²"
    ],
    pitfalls: [
      "Не путайте квантовую суперпозицию с классическим вероятностным распределением",
      "Теорема о запрете клонирования запрещает создание точной копии неизвестного квантового состояния"
    ],
    questions: [
      {
        type: "SINGLE_CHOICE",
        prompt: "Какое математическое условие обязательно для амплитуд вероятности чистого кубита $|\\psi\\rangle = \\alpha |0\\rangle + \\beta |1\\rangle$?",
        options: [
          "α + β = 1",
          "|α|² + |β|² = 1",
          "α × β = 0",
          "|α| - |β| = 1"
        ],
        correctAnswerIndexes: [1],
        explanation: "Условие нормировки требует, чтобы сумма квадратов модулей амплитуд вероятности равнялась 1."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Какие из перечисленных квантовых явлений не имеют аналогов в классической физике?",
        options: [
          "Квантовая суперпозиция",
          "Квантовая запутанность (Entanglement)",
          "Теплопроводность",
          "Квантовое туннелирование"
        ],
        correctAnswerIndexes: [0, 1, 3],
        explanation: "Суперпозиция, запутанность и туннелирование — специфические квантовые феномены. Теплопроводность существует в классической физике."
      },
      {
        type: "SHORT_ANSWER",
        prompt: "Как называется квантовый вентиль, обозначаемый буквой H, создающий суперпозицию из базисных состояний?",
        acceptedAnswers: ["Адамар", "Вентиль Адамара", "Hadamard", "Hadamard gate"],
        explanation: "Вентиль Адамара (Hadamard gate) переводит состояние |0⟩ в (|0⟩ + |1⟩)/√2."
      },
      {
        type: "CODE",
        prompt: "Напишите функцию `isNormalized(alpha: number, beta: number): boolean`, проверяющую условие нормировки: $|\\alpha|^2 + |\\beta|^2 \\approx 1$ с погрешностью $10^{-4}$.",
        explanation: "Суммируйте квадраты параметров и проверьте Math.abs(alpha*alpha + beta*beta - 1) < 1e-4.",
        codeConfig: {
          language: "typescript",
          initialCode: "function isNormalized(alpha: number, beta: number): boolean {\n  // Ваш код здесь\n  return Math.abs(alpha * alpha + beta * beta - 1) < 1e-4;\n}",
          testCases: [
            {
              name: "Базисное состояние |0⟩",
              input: [1, 0],
              expectedOutput: true,
              description: "alpha=1, beta=0"
            },
            {
              name: "Равная суперпозиция",
              input: [0.7071, 0.7071],
              expectedOutput: true,
              description: "1/√2 для обоих"
            },
            {
              name: "Ненормированное состояние",
              input: [0.5, 0.5],
              expectedOutput: false,
              description: "Сумма квадратов 0.5 ≠ 1"
            }
          ]
        }
      },
      {
        type: "FLASHCARD",
        prompt: "Сформулируйте теорему о запрете клонирования (No-cloning theorem)",
        explanation: "Невозможно создать идеальную квантовую копию неизвестного произвольного квантового состояния."
      }
    ],
    flashcards: [
      {
        front: "Что такое кубит?",
        back: "Квантовый аналог классического бита, состояние которого описывается линейной суперпозицией |ψ⟩ = α|0⟩ + β|1⟩."
      },
      {
        front: "Действие врата Адамара H на состояние |0⟩",
        back: "$$H|0\\rangle = \\frac{|0\\rangle + |1\\rangle}{\\sqrt{2}}$$"
      },
      {
        front: "Теорема о запрете клонирования",
        back: "Фундаментальная теорема квантовой теории: невозможно создать точную копию неизвестного квантового состояния без его разрушения."
      }
    ]
  },
  null,
  2
);

const GENERATION_PHASES = [
  "Анализ концепции и проектирование дидактической структуры...",
  "Генерация фундаментального лонгрида, формул KaTeX и диаграмм Mermaid...",
  "Разработка полиморфного квиза (5 типов вопросов) и тестов для кода...",
  "Формирование карточек интервального повторения SM-2...",
];

export function ImportTopicModal({
  isOpen,
  onClose,
  courseSlug,
  tiers,
  onTopicImported,
  defaultTab = "file",
}: ImportTopicModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "text" | "ai">(defaultTab);
  const [selectedTierId, setSelectedTierId] = useState<string>(
    tiers[0]?.id ?? ""
  );
  const [rawJson, setRawJson] = useState<string>("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] =
    useState<ImportedTopicPayload | null>(null);

  // AI Generator Form State
  const [aiTopicTitle, setAiTopicTitle] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState<
    "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT"
  >("INTERMEDIATE");
  const [aiFocusAreas, setAiFocusAreas] = useState("");
  const [aiTargetAudience, setAiTargetAudience] = useState("");
  const [aiSourceMaterial, setAiSourceMaterial] = useState("");
  const [aiModel, setAiModel] = useState("gemini-2.5-flash");
  const [customApiKey, setCustomApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState(0);

  const [isSubmitting, startSubmitting] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved custom API key from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("notis_gemini_api_key");
      if (savedKey) {
        setCustomApiKey(savedKey);
      }
    }
  }, []);

  const handleApiKeyChange = (val: string) => {
    setCustomApiKey(val);
    if (typeof window !== "undefined") {
      if (val.trim()) {
        localStorage.setItem("notis_gemini_api_key", val.trim());
      } else {
        localStorage.removeItem("notis_gemini_api_key");
      }
    }
  };

  // Sync default tier and active tab when tiers update or modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultTab) {
        setActiveTab(defaultTab);
      }
      if (tiers.length > 0 && !selectedTierId) {
        setSelectedTierId(tiers[0].id);
      }
      setServerError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, defaultTab, tiers, selectedTierId]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting && !isGenerating) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSubmitting, isGenerating]);

  // Validate JSON on content change
  useEffect(() => {
    const trimmed = rawJson.trim();
    if (!trimmed) {
      setParsedPreview(null);
      setValidationError(null);
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      const res = importedTopicPayloadSchema.safeParse(parsed);
      if (res.success) {
        setParsedPreview(res.data);
        setValidationError(null);
      } else {
        setParsedPreview(null);
        const firstIssue = res.error.issues[0];
        const path = firstIssue?.path.join(".");
        setValidationError(
          path
            ? `Ошибка в поле "${path}": ${firstIssue.message}`
            : firstIssue.message || "Неверный формат манифеста темы"
        );
      }
    } catch (err: unknown) {
      setParsedPreview(null);
      setValidationError(
        `Синтаксическая ошибка JSON: ${
          err instanceof Error ? err.message : "Невалидный JSON"
        }`
      );
    }
  }, [rawJson]);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      setValidationError("Поддерживаются только файлы формата .json");
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setServerError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        setRawJson(text);
      }
    };
    reader.onerror = () => {
      setValidationError("Не удалось прочитать файл");
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleInsertTemplate = () => {
    setRawJson(SAMPLE_TOPIC_JSON);
    setFileName("sample-quantum-topic.json");
    setFileSize(new Blob([SAMPLE_TOPIC_JSON]).size);
    setServerError(null);
    setActiveTab("text");
  };

  const handleClear = () => {
    setRawJson("");
    setFileName(null);
    setFileSize(null);
    setParsedPreview(null);
    setValidationError(null);
    setServerError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // AI Topic Generation Handler
  const handleGenerateAI = async () => {
    const trimmedTitle = aiTopicTitle.trim();
    if (!trimmedTitle || trimmedTitle.length < 2) {
      setServerError("Укажите название темы или концепцию (от 2 символов)");
      return;
    }

    setIsGenerating(true);
    setServerError(null);
    setSuccessMessage(null);
    setGenerationPhase(0);

    const timer = setInterval(() => {
      setGenerationPhase((p) => (p < GENERATION_PHASES.length - 1 ? p + 1 : p));
    }, 4500);

    try {
      const result = await generateTopicDraftAction({
        courseSlug,
        topicTitle: trimmedTitle,
        difficulty: aiDifficulty,
        focusAreas: aiFocusAreas.trim() || undefined,
        targetAudience: aiTargetAudience.trim() || undefined,
        sourceMaterial: aiSourceMaterial.trim() || undefined,
        customApiKey: customApiKey.trim() || undefined,
        model: aiModel,
      });

      if (!result.success) {
        setServerError(result.error.message || "Ошибка генерации темы через ИИ");
        return;
      }

      const formattedJson = JSON.stringify(result.data, null, 2);
      setRawJson(formattedJson);
      setFileName(`ai-${result.data.slug}.json`);
      setFileSize(new Blob([formattedJson]).size);
      setParsedPreview(result.data);
      setSuccessMessage(
        `Тема «${result.data.title}» успешно сгенерирована! Проверьте содержание в редакторе или сразу нажмите «Импортировать тему».`
      );
    } catch (err: unknown) {
      setServerError(
        `Сбой генерации темы: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      clearInterval(timer);
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    if (!selectedTierId) {
      setServerError("Выберите целевой уровень/тир курса для размещения темы");
      return;
    }

    if (!rawJson.trim()) {
      setServerError("Предоставьте или сгенерируйте JSON-манифест темы");
      return;
    }

    if (validationError || !parsedPreview) {
      setServerError(validationError || "Исправьте ошибки в манифесте темы");
      return;
    }

    startSubmitting(async () => {
      const result = await importTopicAction({
        courseSlug,
        tierId: selectedTierId,
        ...parsedPreview,
      });

      if (!result.success) {
        setServerError(result.error.message || "Ошибка импорта темы");
        return;
      }

      setSuccessMessage(
        `Тема "${result.data.title}" успешно импортирована (${result.data.questionsCount} вопросов, ${result.data.flashcardsCount} карточек)!`
      );

      onTopicImported(result.data);

      setTimeout(() => {
        onClose();
        handleClear();
      }, 700);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={() => !isSubmitting && !isGenerating && onClose()}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-3xl rounded-xl border border-border-subtle bg-surface-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 z-10 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center text-status-progress">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                Импорт и генерация тем
                <Badge variant="outline" size="sm">
                  JSON / KaTeX / ИИ
                </Badge>
              </h3>
              <p className="text-[11px] text-text-muted">
                Создайте тему из файла, текста или сгенерируйте полную тему через Google Gemini
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-accent-primary" />}
              onClick={handleInsertTemplate}
              disabled={isSubmitting || isGenerating}
              title="Заполнить готовым примером квантовой темы"
            >
              Пример шаблона
            </Button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isGenerating}
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4 pr-1">
          {/* Notifications */}
          {serverError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Внимание: </span>
                <span>{serverError}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-status-completed/10 border border-status-completed/30 flex items-start gap-2.5 text-xs text-status-completed">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Target Tier Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-text-muted" />
              Целевой уровень / модуль курса
              <span className="text-red-400">*</span>
            </label>
            {tiers.length === 0 ? (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                В курсе нет доступных уровней. Пожалуйста, сначала создайте уровень во вкладке «Уровни».
              </div>
            ) : (
              <select
                value={selectedTierId}
                onChange={(e) => setSelectedTierId(e.target.value)}
                disabled={isSubmitting || isGenerating}
                className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-accent-primary transition-colors cursor-pointer"
              >
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} (Уровень {t.level ?? t.order ?? 1})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-border-subtle">
            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === "file"
                  ? "border-accent-primary text-text-primary bg-surface-elevated/40"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Файл (.json)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("text")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === "text"
                  ? "border-accent-primary text-text-primary bg-surface-elevated/40"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Текст / JSON
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === "ai"
                  ? "border-accent-primary text-text-primary bg-surface-elevated/40"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
              Генерация с ИИ
              <span className="px-1.5 py-0.5 text-[9px] rounded font-mono bg-accent-primary/15 text-accent-primary border border-accent-primary/20">
                Gemini
              </span>
            </button>
          </div>

          {/* Tab 1: File Dropzone */}
          {activeTab === "file" && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors duration-150 ${
                  isDragging
                    ? "border-accent-primary bg-accent-primary/5"
                    : "border-border-subtle hover:border-border-strong bg-surface-elevated/30"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center text-text-muted mb-3">
                  <FileUp className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium text-text-primary mb-1">
                  Перетащите JSON-файл темы сюда или нажмите для выбора
                </p>
                <p className="text-[11px] text-text-muted">
                  Поддерживается формат манифеста Notis Topic (.json)
                </p>
              </div>

              {fileName && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border-subtle text-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className="w-4 h-4 text-status-progress shrink-0" />
                    <span className="font-mono text-text-primary truncate">
                      {fileName}
                    </span>
                    {fileSize && (
                      <span className="text-[11px] text-text-muted shrink-0">
                        ({Math.round(fileSize / 1024)} KB)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                    className="p-1 rounded text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                    title="Удалить файл"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Raw Text / JSON Editor */}
          {activeTab === "text" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-text-muted">
                <span>Вставьте или отредактируйте JSON манифеста темы:</span>
                {rawJson && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Очистить
                  </button>
                )}
              </div>
              <textarea
                value={rawJson}
                onChange={(e) => {
                  setRawJson(e.target.value);
                  setFileName(null);
                  setServerError(null);
                }}
                disabled={isSubmitting || isGenerating}
                rows={12}
                placeholder='{\n  "title": "...",\n  "slug": "...",\n  "difficulty": "BEGINNER",\n  "description": "# Markdown..."\n}'
                className="w-full p-3 rounded-lg bg-surface-elevated border border-border-subtle text-text-primary font-mono text-xs focus:outline-none focus:border-accent-primary transition-colors resize-y leading-relaxed"
              />
            </div>
          )}

          {/* Tab 3: AI Topic Generator */}
          {activeTab === "ai" && (
            <div className="space-y-4">
              {/* Optional Custom Gemini API Key Card */}
              <div className="p-3 rounded-lg bg-surface-elevated border border-border-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-accent-primary" />
                    Персональный Gemini API Key (опционально)
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-accent-primary hover:underline flex items-center gap-1"
                  >
                    Получить ключ
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={customApiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="AIzaSy... (сохраняется в вашем браузере)"
                    className="w-full pl-3 pr-10 py-1.5 rounded-md bg-surface-canvas border border-border-subtle text-text-primary font-mono text-xs focus:outline-none focus:border-accent-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-2 text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-text-muted">
                  Если поле пустое, будет использован системный ключ GEMINI_API_KEY из файла .env сервера.
                </p>
              </div>

              {/* Topic Title & Difficulty Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-text-muted" />
                    Название темы / концепция
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={aiTopicTitle}
                    onChange={(e) => setAiTopicTitle(e.target.value)}
                    disabled={isGenerating}
                    placeholder="например: Красно-черные деревья: инварианты и балансировка"
                    className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">
                    Сложность
                  </label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value as any)}
                    disabled={isGenerating}
                    className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-accent-primary cursor-pointer"
                  >
                    <option value="BEGINNER">Базовый (Beginner)</option>
                    <option value="INTERMEDIATE">Средний (Intermediate)</option>
                    <option value="ADVANCED">Продвинутый (Advanced)</option>
                    <option value="EXPERT">Экспертный (Expert)</option>
                  </select>
                </div>
              </div>

              {/* Focus Areas & Target Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">
                    Ключевые акценты и требования
                  </label>
                  <input
                    type="text"
                    value={aiFocusAreas}
                    onChange={(e) => setAiFocusAreas(e.target.value)}
                    disabled={isGenerating}
                    placeholder="например: Разобрать левые и правые вращения, доказать логарифмическую высоту"
                    className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">
                    Целевая аудитория (опционально)
                  </label>
                  <input
                    type="text"
                    value={aiTargetAudience}
                    onChange={(e) => setAiTargetAudience(e.target.value)}
                    disabled={isGenerating}
                    placeholder="например: Студенты 2 курса CS, разработчики высоконагруженных систем"
                    className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>

              {/* Source Material Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-text-muted" />
                  Исходный конспект / выдержки из книг (опционально)
                </label>
                <textarea
                  value={aiSourceMaterial}
                  onChange={(e) => setAiSourceMaterial(e.target.value)}
                  disabled={isGenerating}
                  rows={3}
                  placeholder="Вставьте сюда черновик лекции, выдержку из статьи или свои заметки. ИИ структурирует их в полноценную тему..."
                  className="w-full p-2.5 rounded-lg bg-surface-elevated border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-accent-primary resize-y"
                />
              </div>

              {/* Model Picker & Trigger Row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Cpu className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <span className="text-xs text-text-muted">Модель:</span>
                  <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    disabled={isGenerating}
                    className="px-2.5 py-1 rounded bg-surface-elevated border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-accent-primary cursor-pointer"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (быстрая)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (глубокая)</option>
                  </select>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={
                    isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )
                  }
                  isLoading={isGenerating}
                  disabled={isGenerating || !aiTopicTitle.trim()}
                  onClick={handleGenerateAI}
                  className="w-full sm:w-auto"
                >
                  {isGenerating ? "Генерация темы..." : "Сгенерировать полную тему"}
                </Button>
              </div>

              {/* Animated Phase Progress while generating */}
              {isGenerating && (
                <div className="p-3.5 rounded-xl bg-accent-primary/10 border border-accent-primary/30 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-accent-primary">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>ИИ конструирует тему академического уровня...</span>
                  </div>
                  <div className="space-y-1.5 pl-6">
                    {GENERATION_PHASES.map((phase, idx) => {
                      const isPast = idx < generationPhase;
                      const isCurrent = idx === generationPhase;
                      return (
                        <div
                          key={phase}
                          className={`text-xs flex items-center gap-2 transition-colors duration-300 ${
                            isPast
                              ? "text-status-completed"
                              : isCurrent
                              ? "text-text-primary font-medium"
                              : "text-text-muted opacity-50"
                          }`}
                        >
                          {isPast ? (
                            <Check className="w-3 h-3 text-status-completed shrink-0" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary shrink-0" />
                          )}
                          <span>{phase}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Validation Feedback */}
          {validationError && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Проблема в манифесте: </span>
                <span>{validationError}</span>
              </div>
            </div>
          )}

          {/* Parsed Preview Card */}
          {parsedPreview && !validationError && (
            <div className="p-4 rounded-xl bg-surface-elevated/80 border border-status-completed/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-status-completed" />
                  <span className="text-xs font-bold text-text-primary">
                    Манифест валиден и готов к импорту
                  </span>
                </div>
                <Badge variant="available" size="sm">
                  {parsedPreview.difficulty}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-border-subtle/50">
                <div>
                  <span className="text-text-muted block text-[11px]">Заголовок:</span>
                  <span className="font-semibold text-text-primary">
                    {parsedPreview.title}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Слаг:</span>
                  <span className="font-mono text-text-secondary">
                    {parsedPreview.slug}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Вопросов квиза:</span>
                  <span className="text-text-primary font-medium">
                    {parsedPreview.questions.length} шт.
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Флешкарт (SM-2):</span>
                  <span className="text-text-primary font-medium">
                    {parsedPreview.flashcards.length} шт.
                  </span>
                </div>
              </div>

              {parsedPreview.questions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Array.from(
                    new Set(parsedPreview.questions.map((q) => q.type))
                  ).map((type) => (
                    <span
                      key={type}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-canvas text-text-secondary border border-border-subtle"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting || isGenerating}
          >
            Отмена
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            isLoading={isSubmitting}
            disabled={
              isSubmitting ||
              isGenerating ||
              !selectedTierId ||
              !parsedPreview ||
              Boolean(validationError)
            }
            onClick={handleSubmit}
          >
            Импортировать тему
          </Button>
        </div>
      </div>
    </div>
  );
}
