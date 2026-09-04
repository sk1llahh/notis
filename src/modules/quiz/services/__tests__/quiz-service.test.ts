import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateQuizResult,
  type EvaluatableQuestion,
} from "../quiz-service";
import { GAMIFICATION_RULES } from "@/shared/config";

const mockQuestions: EvaluatableQuestion[] = [
  {
    id: "q1",
    type: "SINGLE_CHOICE",
    options: [
      { id: "opt-0", text: "Стек (Stack)" },
      { id: "opt-1", text: "Куча (Heap)" },
      { id: "opt-2", text: "Регистры процессора" },
    ],
    correctAnswerIndexes: [0], // "opt-0" is correct
    explanation: "Локальные переменные фиксированного размера размещаются на стеке.",
  },
  {
    id: "q2",
    type: "MULTIPLE_CHOICE",
    options: [
      { id: "opt-0", text: "Динамический размер" },
      { id: "opt-1", text: "Ручное или GC управление памятью" },
      { id: "opt-2", text: "LIFO доступ" },
      { id: "opt-3", text: "Случайный доступ по указателям" },
    ],
    correctAnswerIndexes: [0, 1, 3], // "opt-0", "opt-1", "opt-3"
    explanation: "Куча используется для динамических структур с произвольным доступом.",
  },
  {
    id: "q3",
    type: "SINGLE_CHOICE",
    options: [
      { id: "opt-0", text: "Смещение относительно базы" },
      { id: "opt-1", text: "Адрес ячейки памяти" },
    ],
    correctAnswerIndexes: [1], // "opt-1"
    explanation: "Указатель хранит адрес памяти.",
  },
];

describe("Quiz Evaluation Service", () => {
  test("1. Perfect score (100%): marks all passed and awards bonus XP", () => {
    const submission = {
      answers: {
        q1: ["opt-0"],
        q2: ["opt-0", "opt-1", "opt-3"],
        q3: ["opt-1"],
      },
    };

    const result = calculateQuizResult(mockQuestions, submission);

    assert.equal(result.score, 100);
    assert.equal(result.passed, true);
    assert.equal(result.correctQuestions, 3);
    assert.equal(result.totalQuestions, 3);
    assert.equal(result.xpEarned, GAMIFICATION_RULES.XP_QUIZ_PERFECT_SCORE);
    assert.equal(result.breakdown.length, 3);
    assert.ok(result.breakdown.every((b) => b.isCorrect));
    assert.equal(result.breakdown[0].explanation, mockQuestions[0].explanation);
  });

  test("2. Partial failure (<80%): fails test and awards 0 XP", () => {
    // 1 correct out of 3 = 33%
    const submission = {
      answers: {
        q1: ["opt-0"], // Correct
        q2: ["opt-2"], // Incorrect
        q3: ["opt-0"], // Incorrect
      },
    };

    const result = calculateQuizResult(mockQuestions, submission);

    assert.equal(result.score, 33);
    assert.equal(result.passed, false);
    assert.equal(result.correctQuestions, 1);
    assert.equal(result.xpEarned, 0);
    assert.equal(result.breakdown[0].isCorrect, true);
    assert.equal(result.breakdown[1].isCorrect, false);
    assert.equal(result.breakdown[2].isCorrect, false);
  });

  test("3. Multiple choice requires exact set match: extra or missing answers fail", () => {
    // Missing one correct option: selected [opt-0, opt-1] instead of [opt-0, opt-1, opt-3]
    const submissionMissing = {
      answers: {
        q1: ["opt-0"],
        q2: ["opt-0", "opt-1"],
        q3: ["opt-1"],
      },
    };
    const resMissing = calculateQuizResult(mockQuestions, submissionMissing);
    assert.equal(resMissing.breakdown[1].isCorrect, false);

    // Extra wrong option added: selected [opt-0, opt-1, opt-2, opt-3]
    const submissionExtra = {
      answers: {
        q1: ["opt-0"],
        q2: ["opt-0", "opt-1", "opt-2", "opt-3"],
        q3: ["opt-1"],
      },
    };
    const resExtra = calculateQuizResult(mockQuestions, submissionExtra);
    assert.equal(resExtra.breakdown[1].isCorrect, false);
  });

  test("4. Passed with non-perfect score (e.g. 80-99%) does NOT award perfect bonus XP", () => {
    // 4 questions setup where 3/4 = 75% or 4/5 = 80%
    const fiveQuestions: EvaluatableQuestion[] = [
      ...mockQuestions,
      {
        id: "q4",
        type: "SINGLE_CHOICE",
        options: [{ id: "opt-0", text: "A" }, { id: "opt-1", text: "B" }],
        correctAnswerIndexes: [0],
      },
      {
        id: "q5",
        type: "SINGLE_CHOICE",
        options: [{ id: "opt-0", text: "A" }, { id: "opt-1", text: "B" }],
        correctAnswerIndexes: [0],
      },
    ];

    // 4 of 5 correct = 80% (Passed, but not 100%)
    const submission80 = {
      answers: {
        q1: ["opt-0"],
        q2: ["opt-0", "opt-1", "opt-3"],
        q3: ["opt-1"],
        q4: ["opt-0"],
        q5: ["opt-1"], // Wrong
      },
    };

    const result = calculateQuizResult(fiveQuestions, submission80);
    assert.equal(result.score, 80);
    assert.equal(result.passed, true);
    assert.equal(result.xpEarned, 0); // No bonus for non-100%
  });

  test("5. Evaluates SHORT_ANSWER and CODE questions correctly", () => {
    const mixedQuestions: EvaluatableQuestion[] = [
      {
        id: "q-short",
        type: "SHORT_ANSWER",
        options: [],
        correctAnswerIndexes: [],
        acceptedAnswers: ["стек", "stack"],
      },
      {
        id: "q-code",
        type: "CODE",
        options: [],
        correctAnswerIndexes: [],
        testCases: [
          { name: "double", input: [4], expected: 8 },
        ],
      },
    ];

    const validSubmission = {
      answers: {
        "q-short": "  STACK  ",
        "q-code": "function solution(n) { return n * 2; }",
      },
    };

    const result = calculateQuizResult(mixedQuestions, validSubmission);
    assert.equal(result.score, 100);
    assert.equal(result.passed, true);
    assert.equal(result.correctQuestions, 2);
  });

  test("6. Supports polymorphic array format Array<{ questionId, answer }>", () => {
    const polymorphicSubmission = {
      answers: [
        { questionId: "q1", answer: 0 },
        { questionId: "q2", answer: [0, 1, 3] },
        { questionId: "q3", answer: 1 },
      ],
    };

    const result = calculateQuizResult(mockQuestions, polymorphicSubmission);
    assert.equal(result.score, 100);
    assert.equal(result.passed, true);
    assert.equal(result.correctQuestions, 3);
  });
});
