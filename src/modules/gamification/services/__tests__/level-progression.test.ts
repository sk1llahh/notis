import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateUserLevel,
  getLevelBaseXP,
} from "../level-progression";

describe("Gamification: Level Progression Engine", () => {
  test("1. Base level thresholds match quadratic progression: 100 * (L - 1)^2", () => {
    assert.equal(getLevelBaseXP(1), 0);
    assert.equal(getLevelBaseXP(2), 100);
    assert.equal(getLevelBaseXP(3), 400);
    assert.equal(getLevelBaseXP(4), 900);
    assert.equal(getLevelBaseXP(5), 1600);
    assert.equal(getLevelBaseXP(10), 8100);
  });

  test("2. Initial user with 0 XP is at Level 1 with 0% progress", () => {
    const result = calculateUserLevel(0);
    assert.deepEqual(result, {
      level: 1,
      currentLevelXP: 0,
      nextLevelXP: 100,
      progressPercentage: 0,
    });
  });

  test("3. Negative XP or NaN safely falls back to Level 1 at 0% progress", () => {
    const resNegative = calculateUserLevel(-150);
    assert.equal(resNegative.level, 1);
    assert.equal(resNegative.currentLevelXP, 0);
    assert.equal(resNegative.nextLevelXP, 100);
    assert.equal(resNegative.progressPercentage, 0);

    const resNaN = calculateUserLevel(Number.NaN);
    assert.equal(resNaN.level, 1);
    assert.equal(resNaN.currentLevelXP, 0);
    assert.equal(resNaN.progressPercentage, 0);
  });

  test("4. Intermediate progress calculation at Level 1 (50 XP)", () => {
    const result = calculateUserLevel(50);
    assert.deepEqual(result, {
      level: 1,
      currentLevelXP: 50,
      nextLevelXP: 100,
      progressPercentage: 50,
    });
  });

  test("5. Exact level threshold transitions (100 XP -> Level 2, 400 XP -> Level 3)", () => {
    // 99 XP is still Level 1
    const res99 = calculateUserLevel(99);
    assert.equal(res99.level, 1);
    assert.equal(res99.currentLevelXP, 99);
    assert.equal(res99.nextLevelXP, 100);
    assert.equal(res99.progressPercentage, 99);

    // Exactly 100 XP unlocks Level 2 with 0% progress to Level 3
    const res100 = calculateUserLevel(100);
    assert.equal(res100.level, 2);
    assert.equal(res100.currentLevelXP, 0);
    assert.equal(res100.nextLevelXP, 400);
    assert.equal(res100.progressPercentage, 0);

    // Exactly 400 XP unlocks Level 3
    const res400 = calculateUserLevel(400);
    assert.equal(res400.level, 3);
    assert.equal(res400.currentLevelXP, 0);
    assert.equal(res400.nextLevelXP, 900);
    assert.equal(res400.progressPercentage, 0);
  });

  test("6. Intermediate progress at Level 2 (250 XP is halfway between 100 and 400)", () => {
    // Level 2 range: 100 to 400 (span = 300)
    // 250 XP = 150 into the level -> 150 / 300 = 50%
    const result = calculateUserLevel(250);
    assert.deepEqual(result, {
      level: 2,
      currentLevelXP: 150,
      nextLevelXP: 400,
      progressPercentage: 50,
    });
  });

  test("7. Progress percentage rounds to nearest whole number", () => {
    // 33 XP in Level 1 (span 100) -> 33%
    const res33 = calculateUserLevel(33);
    assert.equal(res33.progressPercentage, 33);

    // 150 XP in Level 2: 50 in tier / 300 tier span = 16.666% -> 17%
    const res150 = calculateUserLevel(150);
    assert.equal(res150.currentLevelXP, 50);
    assert.equal(res150.progressPercentage, 17);

    // 133 XP in Level 2: 33 in tier / 300 tier span = 11%
    const res133 = calculateUserLevel(133);
    assert.equal(res133.currentLevelXP, 33);
    assert.equal(res133.progressPercentage, 11);
  });
});
