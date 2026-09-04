import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import katex from "katex";
import { MarkdownRenderer } from "../MarkdownRenderer";

describe("MarkdownRenderer: KaTeX Math and Mermaid Integration", () => {
  describe("KaTeX Core Engine", () => {
    it("1. Renders inline formula $E = mc^2$ with semantic MathML and KaTeX classes", () => {
      const rendered = katex.renderToString("E = mc^2", {
        throwOnError: false,
      });

      assert.ok(rendered.includes("class=\"katex\""), "Output must contain .katex class");
      assert.ok(rendered.includes("<math"), "Output must contain MathML semantic markup");
      assert.ok(rendered.includes("E"), "Output must contain variable E");
    });

    it("2. Renders display formula \\sum_{i=1}^n x_i with displayMode: true", () => {
      const rendered = katex.renderToString("\\sum_{i=1}^n x_i = S", {
        displayMode: true,
        throwOnError: false,
      });

      assert.ok(rendered.includes("class=\"katex-display\""), "Output must contain .katex-display");
      assert.ok(rendered.includes("class=\"katex\""), "Output must contain .katex inner class");
    });

    it("3. Handles malformed LaTeX gracefully without throwing when throwOnError: false", () => {
      assert.doesNotThrow(() => {
        const rendered = katex.renderToString("\\frac{1}{", {
          throwOnError: false,
          errorColor: "#ec4899",
        });
        assert.ok(rendered.includes("katex-error"), "Should render error span gracefully");
        assert.ok(rendered.includes("#ec4899"), "Error span should use errorColor");
      });
    });

    it("4. Correctly preserves complex mathematical notation and matrices", () => {
      const rendered = katex.renderToString(
        "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
        { displayMode: true, throwOnError: false }
      );
      assert.ok(rendered.includes("class=\"katex-display\""), "Should render display matrix");
      assert.ok(rendered.includes("matrix"), "Should contain matrix elements");
    });
  });

  describe("MarkdownRenderer Component (React & SSR)", () => {
    it("5. Renders inline math formula $O(\\log n)$ inside markdown text", () => {
      const content = "Временная сложность поиска: $O(\\log n)$.";
      const html = renderToStaticMarkup(
        React.createElement(MarkdownRenderer, { content })
      );

      assert.ok(html.includes("class=\"katex\""), "React rendered HTML must contain KaTeX classes");
      assert.ok(html.includes("<math"), "React rendered HTML must contain MathML");
      assert.ok(html.includes("Временная сложность поиска:"), "Original text must be preserved");
    });

    it("6. Renders block display formula with double dollars on own lines", () => {
      const content = `
Вычислим сумму элементов:

$$
\\sum_{i=1}^n x_i = S
$$
`;
      const html = renderToStaticMarkup(
        React.createElement(MarkdownRenderer, { content })
      );

      assert.ok(html.includes("class=\"katex-display\""), "Must contain .katex-display class");
      assert.ok(html.includes("class=\"katex\""), "Must contain inner .katex class");
    });

    it("7. Does not crash on malformed LaTeX in markdown (throwOnError: false resilience)", () => {
      const content = "Формула с синтаксической ошибкой: $\\frac{1}{$. Текст продолжается.";
      let html = "";
      assert.doesNotThrow(() => {
        html = renderToStaticMarkup(
          React.createElement(MarkdownRenderer, { content })
        );
      });
      assert.ok(html.includes("Текст продолжается"), "Markdown must continue rendering surrounding text");
    });

    it("8. Intercepts mermaid code blocks and mounts MermaidDiagram container", () => {
      const content = `
\`\`\`mermaid
graph TD
  A[Клиент] --> B[API Gateway]
  B --> C[(PostgreSQL)]
\`\`\`
`;
      const html = renderToStaticMarkup(
        React.createElement(MarkdownRenderer, { content })
      );

      assert.ok(
        html.includes("Mermaid Схема"),
        "Should identify mermaid language and render Mermaid toolbar with badge"
      );
      assert.ok(
        html.includes("Отрисовка архитектурной диаграммы"),
        "SSR/loading placeholder should render without layout shift"
      );
    });

    it("9. Preserves standard code blocks as syntax-highlighted code without mermaid interception", () => {
      const content = `
\`\`\`typescript
const x: number = 42;
console.log(x);
\`\`\`
`;
      const html = renderToStaticMarkup(
        React.createElement(MarkdownRenderer, { content })
      );

      assert.ok(html.includes("typescript"), "Should display language tag typescript");
      assert.ok(html.includes("hljs-keyword"), "Should contain highlighted keyword span");
      assert.ok(html.includes("console"), "Should contain console token");
      assert.ok(html.includes("log"), "Should contain log token");
      assert.ok(!html.includes("Mermaid Схема"), "Should NOT treat typescript as mermaid");
    });

    it("10. Empty or null content returns null safely without errors", () => {
      const htmlEmpty = renderToStaticMarkup(
        React.createElement(MarkdownRenderer, { content: "" })
      );
      assert.equal(htmlEmpty, "");
    });
  });
});
