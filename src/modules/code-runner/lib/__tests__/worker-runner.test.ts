import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  executeCodeNodeFallback,
  findDeclaredFunctionNames,
  deepEqual,
  buildWorkerScript,
} from "../worker-runner";

describe("CodeRunner Sandbox: worker-runner.ts", () => {
  describe("1. Basic Function Execution & Discovery", () => {
    it("executes basic solution function and captures return value", () => {
      const code = `
        function solution(a, b) {
          return a + b;
        }
      `;
      const result = executeCodeNodeFallback({
        code,
        testCases: [
          { name: "Сложение 2 + 3", input: [2, 3], expected: 5 },
          { name: "Сложение -1 + 1", input: [-1, 1], expected: 0 },
        ],
      });

      assert.equal(result.success, true);
      assert.equal(result.allTestsPassed, true);
      assert.ok(result.testResults);
      assert.equal(result.testResults.length, 2);
      assert.equal(result.testResults[0].passed, true);
      assert.equal(result.testResults[0].actual, 5);
      assert.equal(result.testResults[1].passed, true);
      assert.equal(result.testResults[1].actual, 0);
    });

    it("automatically discovers named function if solution is not explicitly named", () => {
      const code = `
        function isPalindrome(str) {
          const clean = str.toLowerCase().replace(/\\s+/g, "");
          return clean === clean.split("").reverse().join("");
        }
      `;
      const result = executeCodeNodeFallback({
        code,
        testCases: [
          { name: "Палиндром radar", input: ["radar"], expected: true },
          { name: "Палиндром hello", input: ["hello"], expected: false },
          { name: "Палиндром с пробелами", input: ["A man a plan a canal Panama"], expected: true },
        ],
      });

      assert.equal(result.success, true);
      assert.equal(result.allTestsPassed, true);
      assert.ok(result.testResults);
      assert.equal(result.testResults.every((t) => t.passed), true);
    });

    it("fails gracefully when no callable function is declared", () => {
      const code = `
        const x = 42;
        const message = "Hello";
      `;
      const result = executeCodeNodeFallback({
        code,
        testCases: [{ input: [], expected: true }],
      });

      assert.equal(result.success, false);
      assert.equal(result.allTestsPassed, false);
      assert.ok(
        result.error?.includes("Функция решения не найдена"),
        "Should return informative missing function error"
      );
    });
  });

  describe("2. Test Cases Evaluation & Failed Assertions", () => {
    it("reports passed: false and details actual vs expected on incorrect answer", () => {
      const code = `
        function solution(n) {
          return n * 2; // Ошибочное решение вместо квадрата n^2
        }
      `;
      const result = executeCodeNodeFallback({
        code,
        testCases: [
          { name: "2 в квадрате", input: [2], expected: 4 }, // 2*2=4 (совпало случайно)
          { name: "3 в квадрате", input: [3], expected: 9 }, // 3*2=6 != 9
        ],
      });

      assert.equal(result.success, true);
      assert.equal(result.allTestsPassed, false);
      assert.ok(result.testResults);
      assert.equal(result.testResults[0].passed, true);
      assert.equal(result.testResults[1].passed, false);
      assert.equal(result.testResults[1].actual, 6);
      assert.equal(result.testResults[1].expected, 9);
    });

    it("captures and stringifies console.log output without polluting outer stdout", () => {
      const code = `
        function solution(arr) {
          console.log("Input array length:", arr.length);
          console.info("Processing array...");
          console.warn("Notice: demo array");
          return arr.length;
        }
      `;
      const result = executeCodeNodeFallback({
        code,
        testCases: [{ input: [[1, 2, 3]], expected: 3 }],
      });

      assert.equal(result.success, true);
      assert.ok(result.logs.some((l) => l.includes("Input array length: 3")));
      assert.ok(result.logs.some((l) => l.includes("Processing array...")));
      assert.ok(result.logs.some((l) => l.includes("[WARN] Notice: demo array")));
    });
  });

  describe("3. Deep Equality Comparison (deepEqual)", () => {
    it("compares primitive values correctly", () => {
      assert.equal(deepEqual(1, 1), true);
      assert.equal(deepEqual("abc", "abc"), true);
      assert.equal(deepEqual(true, true), true);
      assert.equal(deepEqual(null, null), true);
      assert.equal(deepEqual(undefined, undefined), true);
      assert.equal(deepEqual(1, 2), false);
      assert.equal(deepEqual("a", "b"), false);
      assert.equal(deepEqual(null, undefined), false);
    });

    it("compares nested objects and arrays correctly", () => {
      const obj1 = { a: 1, b: [2, { c: 3 }], d: "test" };
      const obj2 = { a: 1, b: [2, { c: 3 }], d: "test" };
      const obj3 = { a: 1, b: [2, { c: 4 }], d: "test" };

      assert.equal(deepEqual(obj1, obj2), true);
      assert.equal(deepEqual(obj1, obj3), false);
      assert.equal(deepEqual([1, [2, [3]]], [1, [2, [3]]]), true);
      assert.equal(deepEqual([1, [2, [3]]], [1, [2, [4]]]), false);
    });

    it("compares Date and RegExp instances", () => {
      const d1 = new Date("2026-01-01T00:00:00Z");
      const d2 = new Date("2026-01-01T00:00:00Z");
      const d3 = new Date("2026-01-02T00:00:00Z");

      assert.equal(deepEqual(d1, d2), true);
      assert.equal(deepEqual(d1, d3), false);

      const r1 = /hello/gi;
      const r2 = /hello/gi;
      const r3 = /hello/i;

      assert.equal(deepEqual(r1, r2), true);
      assert.equal(deepEqual(r1, r3), false);
    });

    it("handles complex structures in test cases inside executeCodeNodeFallback", () => {
      const code = `
        function solution(users) {
          return users.filter(u => u.age >= 18).map(u => ({ id: u.id, name: u.name.toUpperCase() }));
        }
      `;
      const input = [
        [
          { id: 1, name: "Alice", age: 20 },
          { id: 2, name: "Bob", age: 15 },
          { id: 3, name: "Charlie", age: 18 },
        ],
      ];
      const expected = [
        { id: 1, name: "ALICE" },
        { id: 3, name: "CHARLIE" },
      ];

      const result = executeCodeNodeFallback({
        code,
        testCases: [{ name: "Фильтрация совершеннолетних", input, expected }],
      });

      assert.equal(result.success, true);
      assert.equal(result.allTestsPassed, true);
    });
  });

  describe("4. Error Handling & Sandbox Resilience", () => {
    it("intercepts SyntaxError in student code and returns structured error", () => {
      const code = `
        function solution(x) {
          return x + 
        }
      `;
      const result = executeCodeNodeFallback({
        code,
        testCases: [{ input: [1], expected: 2 }],
      });

      assert.equal(result.success, false);
      assert.equal(result.allTestsPassed, false);
      assert.ok(
        result.error?.includes("Unexpected") ||
          result.error?.includes("SyntaxError") ||
          result.error?.includes("token"),
        "Should return SyntaxError details"
      );
    });

    it("intercepts runtime exceptions thrown during execution", () => {
      const code = `
        function solution(n) {
          if (n < 0) {
            throw new Error("Отрицательные числа не поддерживаются");
          }
          return n * 2;
        }
      `;
      const result = executeCodeNodeFallback({
        code,
        testCases: [
          { name: "Положительное число", input: [5], expected: 10 },
          { name: "Отрицательное число (исключение)", input: [-5], expected: -10 },
        ],
      });

      assert.equal(result.success, true);
      assert.equal(result.allTestsPassed, false);
      assert.ok(result.testResults);
      assert.equal(result.testResults[0].passed, true);
      assert.equal(result.testResults[1].passed, false);
      assert.ok(
        result.testResults[1].error?.includes("Отрицательные числа не поддерживаются")
      );
    });

    it("terminates infinite loop with execution timeout guard", () => {
      const code = `
        function solution() {
          while (true) {
            // Infinite loop
          }
        }
      `;
      const result = executeCodeNodeFallback({
        code,
        testCases: [{ name: "Бесконечный цикл", input: [], expected: 42 }],
        timeoutMs: 250, // Short timeout for unit test
      });

      assert.equal(result.allTestsPassed, false);
      assert.ok(result.testResults);
      assert.ok(
        result.error?.includes("Превышен лимит времени выполнения") ||
          result.testResults[0]?.error?.includes("Превышен лимит времени выполнения"),
        "Must flag execution timeout"
      );
    });
  });

  describe("5. Function Discovery: findDeclaredFunctionNames", () => {
    it("detects standard function declarations", () => {
      const code = `
        function calculateSum(a, b) { return a + b; }
        function processData() {}
      `;
      const names = findDeclaredFunctionNames(code);
      assert.deepEqual(names, ["calculateSum", "processData"]);
    });

    it("detects const/let/var arrow and anonymous functions", () => {
      const code = `
        const add = (a, b) => a + b;
        let multiply = function(x, y) { return x * y; };
        var helper = arg => arg.trim();
      `;
      const names = findDeclaredFunctionNames(code);
      assert.deepEqual(names, ["add", "multiply", "helper"]);
    });

    it("returns unique function names and ignores duplicates", () => {
      const code = `
        function run() {}
        const run = () => {};
      `;
      const names = findDeclaredFunctionNames(code);
      assert.deepEqual(names, ["run"]);
    });
  });

  describe("6. Web Worker Script Generator: buildWorkerScript", () => {
    it("generates self-contained valid worker script string", () => {
      const script = buildWorkerScript();
      assert.ok(typeof script === "string" && script.length > 500);
      assert.ok(script.includes("self.onmessage"));
      assert.ok(script.includes("deepEqual"));
      assert.ok(script.includes("customConsole"));
    });
  });
});
