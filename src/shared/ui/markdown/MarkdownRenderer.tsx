"use client";

import React, { useState, createContext, useContext } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const PreContext = createContext(false);

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (
    typeof node === "object" &&
    node !== null &&
    "props" in node &&
    (node as { props?: { children?: React.ReactNode } }).props?.children
  ) {
    return extractText(
      (node as { props: { children?: React.ReactNode } }).props.children
    );
  }
  return "";
}

interface PreBlockProps {
  children: React.ReactNode;
}

function PreBlock({ children }: PreBlockProps) {
  const [copied, setCopied] = useState(false);
  const text = extractText(children).replace(/\n$/, "");

  let language = "";
  if (
    React.isValidElement(children) &&
    typeof (children.props as { className?: string })?.className === "string"
  ) {
    const rawClass = (children.props as { className: string }).className;
    const match = /language-(\w+)/.exec(rawClass);
    if (match) {
      language = match[1];
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard permission is restricted
    }
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-border-subtle bg-surface-canvas shadow-md">
      {/* Code Header Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-surface-elevated/80 border-b border-border-subtle text-[11px] font-mono text-text-muted select-none">
        <span className="uppercase tracking-wider font-semibold">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] text-text-secondary hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer"
          title="Скопировать код в буфер обмена"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-status-completed" />
              <span className="text-status-completed font-medium">
                Скопировано
              </span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Копировать</span>
            </>
          )}
        </button>
      </div>

      {/* Code Viewport */}
      <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-text-primary">
        {children}
      </pre>
    </div>
  );
}

export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  if (!content) return null;

  return (
    <div className={`prose-notis text-text-primary ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-status-available underline hover:opacity-80 transition-opacity font-medium"
            >
              {children}
            </a>
          ),
          pre: ({ children }) => (
            <PreContext.Provider value={true}>
              <PreBlock>{children}</PreBlock>
            </PreContext.Provider>
          ),
          code: ({ className, children, ...props }) => {
            const isInsidePre = useContext(PreContext);
            if (isInsidePre) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className={`px-1.5 py-0.5 rounded bg-surface-elevated font-mono text-xs border border-border-subtle text-status-available ${
                  className || ""
                }`}
                {...props}
              >
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-status-available bg-surface-elevated/40 p-3 my-3 italic rounded-r text-text-secondary text-xs sm:text-sm">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-border-subtle">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-surface-elevated text-text-primary font-semibold border-b border-border-subtle">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border-subtle/50">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="even:bg-surface-card/40 hover:bg-surface-elevated/50 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2 font-semibold text-text-primary">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 text-text-secondary">{children}</td>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1.5 my-2 text-text-secondary text-xs sm:text-sm">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1.5 my-2 text-text-secondary text-xs sm:text-sm">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-6 mb-3 tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg sm:text-xl font-bold text-text-primary mt-5 mb-2.5 tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base sm:text-lg font-semibold text-text-primary mt-4 mb-2">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm sm:text-base font-semibold text-text-primary mt-3 mb-1.5">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="my-1.5 first:mt-0 last:mb-0 leading-relaxed text-text-primary text-xs sm:text-sm">
              {children}
            </p>
          ),
          hr: () => <hr className="my-6 border-border-subtle" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
