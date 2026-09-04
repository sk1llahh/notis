import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { calculateStreakStatus } from "../streak-calculator";
import { GAMIFICATION_RULES } from "@/shared/config";

describe("Gamification: Streak Engine (calculateStreakStatus)", () => {
  const baseDate = new Date("2026-09-04T12:00:00.000Z");

  test("1. Null lastStudyAt returns reset streak and inactive status", () => {
    const status = calculateStreakStatus(null, 5, baseDate);
    assert.deepEqual(status, {
      streak: 0,
      isActiveToday: false,
      isExpiringSoon: false,
    });
  });

  test("2. Studied earlier today: isActiveToday = true, streak retained", () => {
    // Studied 3 hours ago on the same day (09:00 UTC)
    const threeHoursAgo = new Date("2026-09-04T09:00:00.000Z");
    const status = calculateStreakStatus(threeHoursAgo, 7, baseDate);

    assert.deepEqual(status, {
      streak: 7,
      isActiveToday: true,
      isExpiringSoon: false,
    });
  });

  test("3. Studied yesterday within 24 hours: streak retained, not expiring soon yet", () => {
    // Studied yesterday at 20:00 UTC (16 hours ago)
    const sixteenHoursAgo = new Date("2026-09-03T20:00:00.000Z");
    const status = calculateStreakStatus(sixteenHoursAgo, 10, baseDate);

    assert.deepEqual(status, {
      streak: 10,
      isActiveToday: false,
      isExpiringSoon: false,
    });
  });

  test("4. Studied 28 hours ago (in the 24-36h warning window): isExpiringSoon = true", () => {
    // Studied yesterday at 08:00 UTC (28 hours ago)
    const twentyEightHoursAgo = new Date("2026-09-03T08:00:00.000Z");
    const status = calculateStreakStatus(twentyEightHoursAgo, 14, baseDate);

    assert.deepEqual(status, {
      streak: 14,
      isActiveToday: false,
      isExpiringSoon: true,
    });
  });

  test("5. Exactly at 36 hours boundary: streak retained and still expiring soon", () => {
    // Exactly 36 hours ago: 2026-09-03T00:00:00.000Z
    const exact36hAgo = new Date("2026-09-03T00:00:00.000Z");
    const status = calculateStreakStatus(exact36hAgo, 4, baseDate);

    assert.deepEqual(status, {
      streak: 4,
      isActiveToday: false,
      isExpiringSoon: true,
    });
  });

  test("6. Exceeded 36 hours expiration window: streak burns to 0", () => {
    // 37 hours ago (1 hour past expiration)
    const thirtySevenHoursAgo = new Date("2026-09-02T23:00:00.000Z");
    const status = calculateStreakStatus(thirtySevenHoursAgo, 20, baseDate);

    assert.deepEqual(status, {
      streak: 0,
      isActiveToday: false,
      isExpiringSoon: false,
    });

    // 5 days ago
    const fiveDaysAgo = new Date("2026-08-30T12:00:00.000Z");
    const oldStatus = calculateStreakStatus(fiveDaysAgo, 50, baseDate);
    assert.deepEqual(oldStatus, {
      streak: 0,
      isActiveToday: false,
      isExpiringSoon: false,
    });
  });

  test("7. Zero streak in warning window does not trigger false expiring alert", () => {
    const thirtyHoursAgo = new Date("2026-09-03T06:00:00.000Z");
    const status = calculateStreakStatus(thirtyHoursAgo, 0, baseDate);

    assert.deepEqual(status, {
      streak: 0,
      isActiveToday: false,
      isExpiringSoon: false,
    });
  });

  test("8. Clock skew / future date is handled gracefully without crash", () => {
    const futureDate = new Date("2026-09-04T13:00:00.000Z");
    const status = calculateStreakStatus(futureDate, 3, baseDate);

    assert.equal(status.streak, 3);
    assert.equal(status.isActiveToday, true);
    assert.equal(status.isExpiringSoon, false);
  });
});
