"use client";

import React, { useEffect, useState, useId } from "react";
import { Check, Copy, AlertTriangle, Workflow, Code2, Eye } from "lucide-react";

export interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

let mermaidInitialized = false;

async function getMermaid() {
  const mermaidModule = await import("mermaid");
  const mermaid = mermaidModule.default;

  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      themeVariables: {
        darkMode: true,
        background: "#10121a",
        primaryColor: "#1c202c",
        primaryTextColor: "#f3f5fa",
        primaryBorderColor: "#2b3247",
        lineColor: "#0ea5e9",
        secondaryColor: "#161922",
        tertiaryColor: "#08090d",
        fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
      },
      securityLevel: "strict",
    });
    mermaidInitialized = true;
  }

  return mermaid;
}

export function MermaidDiagram({ chart, className = "" }: MermaidDiagramProps) {
  const rawId = useId();
  const safeId = "mermaid-" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");

  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSource, setShowSource] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    async function renderChart() {
      setLoading(true);
      setError(null);

      try {
        const trimmedChart = chart.trim();
        if (!trimmedChart) {
          setError("Пустая диаграмма Mermaid");
          setLoading(false);
          return;
        }

        const mermaid = await getMermaid();
        // Unique container ID per render cycle to avoid DOM collisions
        const uniqueRenderId = `${safeId}-${Date.now().toString(36)}`;
        const { svg: renderedSvg } = await mermaid.render(uniqueRenderId, trimmedChart);

        if (!isCancelled) {
          setSvg(renderedSvg);
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : String(err);
          // Remove any error SVG appended to body by Mermaid
          const errEl = document.getElementById(`d${safeId}`);
          if (errEl) {
            errEl.remove();
          }
          setError(message);
          setLoading(false);
        }
      }
    }

    renderChart();

    return () => {
      isCancelled = true;
    };
  }, [chart, safeId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(chart);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  return (
    <div
      className={`my-4 rounded-lg overflow-hidden border border-border-subtle bg-surface-card shadow-md ${className}`}
    >
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-surface-elevated/80 border-b border-border-subtle text-xs select-none">
        <div className="flex items-center gap-2 text-text-primary font-medium">
          <Workflow className="w-4 h-4 text-status-available" />
          <span className="font-mono uppercase tracking-wider text-[11px] text-text-secondary">
            Mermaid Схема
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowSource((prev) => !prev)}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-text-secondary hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer"
            title={showSource ? "Показать диаграмму" : "Показать исходный код"}
          >
            {showSource ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Схема</span>
              </>
            ) : (
              <>
                <Code2 className="w-3.5 h-3.5" />
                <span>Исходный код</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-text-secondary hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer"
            title="Скопировать код схемы"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-status-completed" />
                <span className="text-status-completed font-medium">Скопировано</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Копировать</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {showSource ? (
        <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-text-primary bg-surface-canvas">
          <code>{chart}</code>
        </pre>
      ) : error ? (
        <div className="p-4 bg-status-diff/10 border-l-4 border-status-diff text-text-primary">
          <div className="flex items-center gap-2 text-status-diff font-semibold text-xs mb-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Синтаксическая ошибка в диаграмме Mermaid</span>
          </div>
          <p className="text-xs text-text-secondary font-mono whitespace-pre-wrap break-words">
            {error}
          </p>
          <div className="mt-3 pt-3 border-t border-border-subtle/50">
            <div className="text-[11px] text-text-muted mb-1 font-mono uppercase">
              Исходный код диаграммы:
            </div>
            <pre className="p-2.5 rounded bg-surface-canvas text-xs font-mono text-text-secondary overflow-x-auto border border-border-subtle">
              <code>{chart}</code>
            </pre>
          </div>
        </div>
      ) : loading ? (
        <div className="p-8 flex flex-col items-center justify-center gap-3 bg-surface-canvas text-text-muted animate-pulse-subtle min-h-[140px]">
          <Workflow className="w-6 h-6 animate-spin text-status-available opacity-60" />
          <span className="text-xs">Отрисовка архитектурной диаграммы...</span>
        </div>
      ) : (
        <div
          className="p-4 overflow-x-auto flex justify-center items-center bg-surface-canvas [&>svg]:max-w-full [&>svg]:h-auto select-none"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
}
