import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { calculateSM2 } from "../sm2-algorithm";
import { SM2_CONFIG } from "@/shared/config";

describe("SuperMemo-2 (SM-2) Algorithm Engine", () => {
  const baseDate = new Date("2026-09-01T12:00:00.000Z");

  test("1. Failure at quality = 1 or 2 resets interval to 1 and repetitions to 0", () => {
    const inputFailureQuality1 = {
      quality: 1,
      repetitions: 4,
      interval: 15,
      easinessFactor: 2.5,
    };

    const out1 = calculateSM2(inputFailureQuality1, baseDate);
    assert.equal(out1.repetitions, 0);
    assert.equal(out1.interval, 1);
    assert.equal(
      out1.nextReviewAt.toISOString(),
      new Date("2026-09-02T12:00:00.000Z").toISOString()
    );

    const inputFailureQuality2 = {
      quality: 2,
      repetitions: 2,
      interval: 6,
      easinessFactor: 2.3,
    };

    const out2 = calculateSM2(inputFailureQuality2, baseDate);
    assert.equal(out2.repetitions, 0);
    assert.equal(out2.interval, 1);
  });

  test("2. First successful attempt (quality >= 3) sets interval = 1, repetitions = 1", () => {
    const input = {
      quality: 4,
      repetitions: 0,
      interval: 0,
      easinessFactor: 2.5,
    };

    const out = calculateSM2(input, baseDate);
    assert.equal(out.repetitions, 1);
    assert.equal(out.interval, 1);
    // When quality = 4, deltaEF is 0, so EF remains 2.5
    assert.equal(out.easinessFactor, 2.5);
    assert.equal(
      out.nextReviewAt.toISOString(),
      new Date("2026-09-02T12:00:00.000Z").toISOString()
    );
  });

  test("3. Second successful attempt sets interval = 6, repetitions = 2", () => {
    const input = {
      quality: 5,
      repetitions: 1,
      interval: 1,
      easinessFactor: 2.5,
    };

    const out = calculateSM2(input, baseDate);
    assert.equal(out.repetitions, 2);
    assert.equal(out.interval, 6);
    // When quality = 5, EF increases by 0.1
    assert.equal(out.easinessFactor, 2.6);
    assert.equal(
      out.nextReviewAt.toISOString(),
      new Date("2026-09-07T12:00:00.000Z").toISOString()
    );
  });

  test("4. Subsequent attempts (repetitions >= 2) multiply interval by EF", () => {
    const input = {
      quality: 4,
      repetitions: 2,
      interval: 6,
      easinessFactor: 2.5,
    };

    // nextInterval = Math.round(6 * 2.5) = 15
    const out = calculateSM2(input, baseDate);
    assert.equal(out.repetitions, 3);
    assert.equal(out.interval, 15);
    assert.equal(
      out.nextReviewAt.toISOString(),
      new Date("2026-09-16T12:00:00.000Z").toISOString()
    );

    // Fourth repetition: Math.round(15 * 2.5) = 38
    const out4 = calculateSM2(
      {
        quality: 4,
        repetitions: out.repetitions,
        interval: out.interval,
        easinessFactor: out.easinessFactor,
      },
      baseDate
    );
    assert.equal(out4.repetitions, 4);
    assert.equal(out4.interval, 38);
  });

  test("5. EF does not fall below minimum (1.3) under multiple difficult responses", () => {
    let state = {
      quality: 0,
      repetitions: 3,
      interval: 10,
      easinessFactor: 1.4,
    };

    // Repeat 5 times with quality = 0 (severe failure)
    for (let i = 0; i < 5; i++) {
      const out = calculateSM2(state, baseDate);
      state = {
        quality: 0,
        repetitions: out.repetitions,
        interval: out.interval,
        easinessFactor: out.easinessFactor,
      };
    }

    assert.equal(state.easinessFactor, SM2_CONFIG.MIN_EASINESS_FACTOR);
    assert.equal(state.easinessFactor, 1.3);
  });
});
