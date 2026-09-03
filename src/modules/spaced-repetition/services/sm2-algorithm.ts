import { SM2_CONFIG } from "@/shared/config";

export interface SM2Input {
  quality: number; // 0 to 5
  repetitions: number;
  interval: number; // in days
  easinessFactor: number;
}

export interface SM2Output {
  repetitions: number;
  interval: number;
  easinessFactor: number;
  nextReviewAt: Date;
}

/**
 * Deterministic SuperMemo-2 (SM-2) Spaced Repetition Algorithm.
 *
 * Formula:
 * EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 * EF' >= 1.3
 *
 * Interval:
 * If q < 3: repetitions = 0, interval = 1
 * If q >= 3:
 *   repetitions = 0 => interval = 1
 *   repetitions = 1 => interval = 6
 *   repetitions >= 2 => interval = round(previousInterval * EF')
 *   repetitions = repetitions + 1
 */
export function calculateSM2(input: SM2Input, currentDate?: Date): SM2Output {
  const quality = Math.round(Math.max(0, Math.min(5, input.quality)));
  const currentRepetitions = Math.max(0, input.repetitions);
  const currentInterval = Math.max(0, input.interval);
  const currentEF = Math.max(
    SM2_CONFIG.MIN_EASINESS_FACTOR,
    input.easinessFactor || SM2_CONFIG.DEFAULT_EASINESS_FACTOR
  );

  // 1. Calculate new Easiness Factor (EF)
  const qDiff = 5 - quality;
  const deltaEF = 0.1 - qDiff * (0.08 + qDiff * 0.02);
  const rawEF = currentEF + deltaEF;
  const newEF = Number(
    Math.max(SM2_CONFIG.MIN_EASINESS_FACTOR, rawEF).toFixed(4)
  );

  // 2. Calculate next repetitions and interval
  let nextRepetitions = 0;
  let nextInterval: number = SM2_CONFIG.INITIAL_INTERVAL_DAYS; // 1 day

  if (quality < 3) {
    // Failure to recall: reset to initial review interval
    nextRepetitions = 0;
    nextInterval = 1;
  } else {
    // Successful recall
    if (currentRepetitions === 0) {
      nextInterval = 1;
    } else if (currentRepetitions === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(currentInterval * newEF);
    }
    nextRepetitions = currentRepetitions + 1;
  }

  // 3. Compute next review date
  const now = currentDate ? new Date(currentDate.getTime()) : new Date();
  const nextReviewAt = new Date(
    now.getTime() + nextInterval * 24 * 60 * 60 * 1000
  );

  return {
    repetitions: nextRepetitions,
    interval: nextInterval,
    easinessFactor: newEF,
    nextReviewAt,
  };
}
