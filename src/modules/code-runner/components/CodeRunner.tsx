"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Terminal,
  FileCode,
  Check,
  X,
} from "lucide-react";
import { Button, Badge } from "@/shared/ui";
import { executeCode } from "../lib/worker-runner";
import type { TestCase, ExecutionResult } from "../types";

export interface CodeRunnerProps {
  initialCode?: string;
  testCases?: TestCase[];
  onSuccess?: (code: string) => void;
  onExecutionChange?: (result: ExecutionResult) => void;
  className?: string;
  readOnly?: boolean;
}

export function CodeRunner({
  initialCode = `// Напишите решение здесь\nfunction solution() {\n  return true;\n}\n`,
  testCases = [],
  onSuccess,
  onExecutionChange,
  className = "",
  readOnly = false,
}: CodeRunnerProps) {
  const [code, setCode] = useState<string>(initialCode);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [activeTab, setActiveTab] = useState<"tests" | "console">(
    testCases.length > 0 ? "tests" : "console"
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);

    try {
      const execResult = await executeCode({
        code,
        testCases,
        timeoutMs: 2000,
      });

      setResult(execResult);
      onExecutionChange?.(execResult);

      if (
        execResult.allTestsPassed ||
        (testCases.length === 0 && execResult.success)
      ) {
        onSuccess?.(code);
      }

      if (testCases.length > 0) {
        setActiveTab("tests");
      } else {
        setActiveTab("console");
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCode(initialCode);
    setResult(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Hotkey: Ctrl + Enter or Cmd + Enter to execute
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
      return;
    }

    // Support Tab key indentation (2 spaces)
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newCode = code.substring(0, start) + "  " + code.substring(end);
      setCode(newCode);

      // Restore cursor position after state update
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
            start + 2;
        }
      });
    }
  };

  const passedTestsCount =
    result?.testResults?.filter((t) => t.passed).length ?? 0;
  const totalTestsCount = testCases.length;

  return (
    <div
      className={`flex flex-col rounded-xl border border-border-subtle bg-surface-card overflow-hidden shadow-sm ${className}`}
    >
      {/* Top Header / Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface-elevated border-b border-border-subtle">
        <div className="flex items-center gap-2 text-text-secondary text-xs font-mono">
          <FileCode className="w-4 h-4 text-brand-primary" />
          <span className="font-semibold text-text-primary">solution.js</span>
          <Badge variant="outline" size="sm">
            ES2022
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isRunning || readOnly}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            title="Сбросить код к исходному состоянию"
          >
            Сбросить
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRun}
            isLoading={isRunning}
            disabled={readOnly}
            leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
            title="Запустить код (Ctrl + Enter)"
          >
            Запустить
            <span className="ml-1.5 hidden sm:inline text-[10px] opacity-75 font-mono">
              Ctrl+↵
            </span>
          </Button>
        </div>
      </div>

      {/* Editor Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          rows={10}
          className="w-full p-4 font-mono text-xs sm:text-sm leading-relaxed bg-surface-canvas text-text-primary focus:outline-none resize-y min-h-[180px] selection:bg-brand-primary/30"
          placeholder="// Напишите ваш JavaScript код..."
        />
      </div>

      {/* Execution Status Bar (if executed) */}
      {result && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-surface-elevated/70 border-t border-b border-border-subtle text-xs">
          <div className="flex items-center gap-2">
            {result.error ? (
              <Badge
                variant="outline"
                size="sm"
                className="border-red-500/40 text-red-400 bg-red-500/10"
              >
                <AlertCircle className="w-3 h-3" /> Ошибка исполнения
              </Badge>
            ) : totalTestsCount > 0 ? (
              result.allTestsPassed ? (
                <Badge variant="available" size="sm">
                  <CheckCircle2 className="w-3 h-3" /> Все тесты пройдены (
                  {passedTestsCount}/{totalTestsCount})
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  size="sm"
                  className="border-red-500/40 text-red-400 bg-red-500/10"
                >
                  <XCircle className="w-3 h-3" /> Тесты не пройдены (
                  {passedTestsCount}/{totalTestsCount})
                </Badge>
              )
            ) : (
              <Badge variant="available" size="sm">
                <CheckCircle2 className="w-3 h-3" /> Код успешно выполнен
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-text-muted font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5" />
            <span>{result.executionTimeMs} ms</span>
          </div>
        </div>
      )}

      {/* Error Message Alert */}
      {result?.error && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="whitespace-pre-wrap break-all">{result.error}</div>
        </div>
      )}

      {/* Results Tab Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border-subtle bg-surface-elevated/40">
        {totalTestsCount > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("tests")}
            className={`flex items-center gap-1.5 pb-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "tests"
                ? "border-status-available text-text-primary"
                : "border-transparent text-text-muted hover:text-text-secondary"
            }`}
          >
            <span>Тест-кейсы</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                result
                  ? result.allTestsPassed
                    ? "bg-status-available/20 text-status-available"
                    : "bg-red-500/20 text-red-400"
                  : "bg-surface-elevated text-text-muted"
              }`}
            >
              {result ? `${passedTestsCount}/${totalTestsCount}` : totalTestsCount}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("console")}
          className={`flex items-center gap-1.5 pb-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "console"
              ? "border-status-available text-text-primary"
              : "border-transparent text-text-muted hover:text-text-secondary"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Консоль (stdout)</span>
          {result && result.logs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-surface-card text-text-secondary border border-border-subtle">
              {result.logs.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-4 bg-surface-canvas/50">
        {activeTab === "tests" && (
          <div className="space-y-2.5">
            {testCases.length === 0 ? (
              <div className="text-xs text-text-muted text-center py-4">
                Тест-кейсы не заданы для этого задания.
              </div>
            ) : (
              testCases.map((tc, idx) => {
                const testRes = result?.testResults?.[idx];
                const isPassed = testRes?.passed;
                const testName =
                  tc.name || tc.description || `Тест-кейс #${idx + 1}`;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs transition-colors ${
                      !result
                        ? "border-border-subtle bg-surface-card text-text-secondary"
                        : isPassed
                        ? "border-status-available/30 bg-status-available/5 text-text-primary"
                        : "border-red-500/30 bg-red-500/5 text-text-primary"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 font-medium">
                        {result && (
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                              isPassed
                                ? "bg-status-available text-surface-canvas"
                                : "bg-red-500 text-white"
                            }`}
                          >
                            {isPassed ? (
                              <Check className="w-3 h-3 stroke-[3]" />
                            ) : (
                              <X className="w-3 h-3 stroke-[3]" />
                            )}
                          </div>
                        )}
                        <span>{testName}</span>
                      </div>

                      {result && (
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider ${
                            isPassed ? "text-status-available" : "text-red-400"
                          }`}
                        >
                          {isPassed ? "Пройден" : "Провален"}
                        </span>
                      )}
                    </div>

                    {/* Test details: inputs & expectations */}
                    <div className="mt-2 space-y-1 font-mono text-[11px] text-text-secondary">
                      <div>
                        <span className="text-text-muted">Входные данные: </span>
                        <code className="text-text-primary">
                          {tc.input.map((arg) => JSON.stringify(arg)).join(", ")}
                        </code>
                      </div>
                      <div>
                        <span className="text-text-muted">Ожидалось: </span>
                        <code className="text-status-available">
                          {JSON.stringify(tc.expected)}
                        </code>
                      </div>
                      {testRes && !isPassed && (
                        <div>
                          <span className="text-text-muted">Получено: </span>
                          <code className="text-red-400">
                            {testRes.error
                              ? `Ошибка: ${testRes.error}`
                              : JSON.stringify(testRes.actual)}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "console" && (
          <div className="rounded-lg bg-surface-canvas border border-border-subtle p-3 font-mono text-xs max-h-52 overflow-y-auto space-y-1">
            {!result || result.logs.length === 0 ? (
              <div className="text-text-muted italic text-[11px]">
                Консоль пуста. Вызовите console.log() в коде для вывода отладочных данных.
              </div>
            ) : (
              result.logs.map((log, index) => {
                const isError = log.startsWith("[ERROR]");
                const isWarn = log.startsWith("[WARN]");

                return (
                  <div
                    key={index}
                    className={`whitespace-pre-wrap break-all leading-relaxed ${
                      isError
                        ? "text-red-400"
                        : isWarn
                        ? "text-yellow-400"
                        : "text-text-secondary"
                    }`}
                  >
                    {log}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
