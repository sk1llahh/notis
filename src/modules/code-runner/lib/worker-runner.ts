import type {
  TestCase,
  TestResult,
  ExecutionResult,
  ExecuteCodeOptions,
} from "../types";

export const DEFAULT_TIMEOUT_MS = 2000;

/**
 * Deep equality helper for comparing test results (objects, arrays, primitives, dates).
 */
export function deepEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }
  if (typeof a !== typeof b) return false;

  if (typeof a !== "object") return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Extracts declared function names from user code to automatically discover
 * the target solution function.
 */
export function findDeclaredFunctionNames(code: string): string[] {
  const names: string[] = [];
  const fnRegex = /(?:function\s+([a-zA-Z0-9_$]+)\s*\(|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>|[a-zA-Z0-9_$]+\s*=>))/g;
  let match: RegExpExecArray | null;

  while ((match = fnRegex.exec(code)) !== null) {
    const name = match[1] || match[2];
    if (name && !names.includes(name)) {
      names.push(name);
    }
  }

  return names;
}

/**
 * Generates the self-contained Web Worker script as a string.
 */
export function buildWorkerScript(): string {
  return `
    function deepEqual(a, b) {
      if (Object.is(a, b)) return true;
      if (a === null || b === null || a === undefined || b === undefined) return a === b;
      if (typeof a !== typeof b) return false;
      if (typeof a !== "object") return false;
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
      }
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      for (const k of keysA) {
        if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
        if (!deepEqual(a[k], b[k])) return false;
      }
      return true;
    }

    function stringify(arg) {
      if (typeof arg === "object" && arg !== null) {
        try { return JSON.stringify(arg, null, 2); } catch { return String(arg); }
      }
      return String(arg);
    }

    self.onmessage = function(e) {
      const { code, testCases, functionNames } = e.data;
      const logs = [];

      const customConsole = {
        log: (...args) => logs.push(args.map(stringify).join(" ")),
        warn: (...args) => logs.push("[WARN] " + args.map(stringify).join(" ")),
        error: (...args) => logs.push("[ERROR] " + args.map(stringify).join(" ")),
        info: (...args) => logs.push(args.map(stringify).join(" ")),
      };

      try {
        const lookupChecks = (functionNames || [])
          .map(name => "if (typeof " + name + " === 'function') return " + name + ";")
          .join("\\n");

        const wrapperCode = \`
          "use strict";
          \${code}
          ;
          if (typeof solution === 'function') return solution;
          \${lookupChecks}
          return undefined;
        \`;

        const runner = new Function("console", wrapperCode);
        const targetFunc = runner(customConsole);

        const testResults = [];
        let allTestsPassed = true;

        if (Array.isArray(testCases) && testCases.length > 0) {
          if (typeof targetFunc !== "function") {
            self.postMessage({
              success: false,
              logs,
              error: "Функция решения не найдена. Объявите функцию solution(...) или именованную функцию решения.",
              testResults: [],
              allTestsPassed: false,
            });
            return;
          }

          for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            const testName = tc.name || tc.description || ("Тест #" + (i + 1));
            try {
              const actual = targetFunc(...(tc.input || []));
              const passed = deepEqual(actual, tc.expected);
              if (!passed) allTestsPassed = false;
              testResults.push({
                name: testName,
                passed,
                actual,
                expected: tc.expected,
              });
            } catch (testErr) {
              allTestsPassed = false;
              testResults.push({
                name: testName,
                passed: false,
                expected: tc.expected,
                error: testErr instanceof Error ? testErr.message : String(testErr),
              });
            }
          }
        }

        self.postMessage({
          success: true,
          logs,
          testResults,
          allTestsPassed: testCases && testCases.length > 0 ? allTestsPassed : true,
        });
      } catch (err) {
        self.postMessage({
          success: false,
          logs,
          error: err instanceof Error ? err.message : String(err),
          testResults: [],
          allTestsPassed: false,
        });
      }
    };
  `;
}

/**
 * Node.js / SSR execution fallback for unit tests and non-browser environments.
 */
export function executeCodeNodeFallback(options: ExecuteCodeOptions): ExecutionResult {
  const { code, testCases = [] } = options;
  const logs: string[] = [];
  const startTime = Date.now();

  const stringify = (arg: unknown) => {
    if (typeof arg === "object" && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  };

  const customConsole = {
    log: (...args: unknown[]) => logs.push(args.map(stringify).join(" ")),
    warn: (...args: unknown[]) => logs.push("[WARN] " + args.map(stringify).join(" ")),
    error: (...args: unknown[]) => logs.push("[ERROR] " + args.map(stringify).join(" ")),
    info: (...args: unknown[]) => logs.push(args.map(stringify).join(" ")),
  };

  try {
    const fnNames = findDeclaredFunctionNames(code);
    const lookupChecks = fnNames
      .map((name) => `if (typeof ${name} === 'function') return ${name};`)
      .join("\n");

    const wrapperCode = `
      "use strict";
      ${code}
      ;
      if (typeof solution === 'function') return solution;
      ${lookupChecks}
      return undefined;
    `;

    const runner = new Function("console", wrapperCode);
    const targetFunc = runner(customConsole);

    const testResults: TestResult[] = [];
    let allTestsPassed = true;

    if (Array.isArray(testCases) && testCases.length > 0) {
      if (typeof targetFunc !== "function") {
        return {
          success: false,
          logs,
          executionTimeMs: Date.now() - startTime,
          error: "Функция решения не найдена. Объявите функцию solution(...) или именованную функцию решения.",
          testResults: [],
          allTestsPassed: false,
        };
      }

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const testName = tc.name || tc.description || `Тест #${i + 1}`;
        try {
          const actual = targetFunc(...(tc.input || []));
          const passed = deepEqual(actual, tc.expected);
          if (!passed) allTestsPassed = false;
          testResults.push({
            name: testName,
            passed,
            actual,
            expected: tc.expected,
          });
        } catch (testErr) {
          allTestsPassed = false;
          testResults.push({
            name: testName,
            passed: false,
            expected: tc.expected,
            error: testErr instanceof Error ? testErr.message : String(testErr),
          });
        }
      }
    }

    return {
      success: true,
      logs,
      executionTimeMs: Date.now() - startTime,
      testResults,
      allTestsPassed: testCases.length > 0 ? allTestsPassed : true,
    };
  } catch (err) {
    return {
      success: false,
      logs,
      executionTimeMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : String(err),
      testResults: [],
      allTestsPassed: false,
    };
  }
}

/**
 * Executes JavaScript/TypeScript code inside an isolated Web Worker with a strict execution timeout.
 */
export async function executeCode(options: ExecuteCodeOptions): Promise<ExecutionResult> {
  const { code, testCases = [], timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  // Node.js / non-browser fallback
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return executeCodeNodeFallback(options);
  }

  return new Promise<ExecutionResult>((resolve) => {
    const startTime = performance.now();
    let worker: Worker | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let blobUrl: string | null = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (worker) {
        worker.terminate();
        worker = null;
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }
    };

    try {
      const script = buildWorkerScript();
      const blob = new Blob([script], { type: "application/javascript" });
      blobUrl = URL.createObjectURL(blob);
      worker = new Worker(blobUrl);

      // Strict infinite loop & execution timeout guard (2000 ms default)
      timeoutId = setTimeout(() => {
        const executionTimeMs = Math.round(performance.now() - startTime);
        cleanup();
        resolve({
          success: false,
          logs: [],
          executionTimeMs,
          error: `Превышен лимит времени выполнения (${Math.round(timeoutMs / 1000)} сек)`,
          testResults: [],
          allTestsPassed: false,
        });
      }, timeoutMs);

      worker.onmessage = (event) => {
        const executionTimeMs = Math.round(performance.now() - startTime);
        cleanup();
        resolve({
          ...event.data,
          executionTimeMs,
        });
      };

      worker.onerror = (err) => {
        const executionTimeMs = Math.round(performance.now() - startTime);
        cleanup();
        resolve({
          success: false,
          logs: [],
          executionTimeMs,
          error: err.message || "Ошибка в потоке выполнения Web Worker",
          testResults: [],
          allTestsPassed: false,
        });
      };

      const functionNames = findDeclaredFunctionNames(code);
      worker.postMessage({
        code,
        testCases,
        functionNames,
      });
    } catch (err) {
      const executionTimeMs = Math.round(performance.now() - startTime);
      cleanup();
      resolve({
        success: false,
        logs: [],
        executionTimeMs,
        error: err instanceof Error ? err.message : String(err),
        testResults: [],
        allTestsPassed: false,
      });
    }
  });
}
