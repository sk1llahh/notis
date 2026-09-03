import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  reviewCardSchema,
  reviewCardAction,
} from "../spaced-repetition-actions";

describe("Spaced Repetition Actions: Schemas & Validation", () => {
  test("1. reviewCardSchema parses valid review payloads (qualities 0 to 5)", () => {
    for (let q = 0; q <= 5; q++) {
      const parsed = reviewCardSchema.safeParse({
        cardId: `card-${q}`,
        quality: q,
      });
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.cardId, `card-${q}`);
        assert.equal(parsed.data.quality, q);
      }
    }
  });

  test("2. reviewCardSchema rejects empty cardId", () => {
    const invalid = {
      cardId: "",
      quality: 4,
    };

    const result = reviewCardSchema.safeParse(invalid);
    assert.equal(result.success, false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      assert.ok(fieldErrors.cardId);
      assert.match(fieldErrors.cardId[0], /обязателен/i);
    }
  });

  test("3. reviewCardSchema rejects quality less than 0 or greater than 5", () => {
    const underflow = reviewCardSchema.safeParse({
      cardId: "card-1",
      quality: -1,
    });
    assert.equal(underflow.success, false);

    const overflow = reviewCardSchema.safeParse({
      cardId: "card-1",
      quality: 6,
    });
    assert.equal(overflow.success, false);
  });

  test("4. reviewCardSchema rejects non-integer quality ratings", () => {
    const floatQuality = {
      cardId: "card-1",
      quality: 3.5,
    };

    const result = reviewCardSchema.safeParse(floatQuality);
    assert.equal(result.success, false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      assert.ok(fieldErrors.quality);
      assert.match(fieldErrors.quality[0], /целым числом/i);
    }
  });

  test("5. reviewCardAction returns BAD_REQUEST on invalid payload", async () => {
    const result = await reviewCardAction({
      cardId: "",
      quality: 10,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "BAD_REQUEST");
      assert.ok(result.error.fieldErrors);
      assert.ok(result.error.fieldErrors.cardId);
      assert.ok(result.error.fieldErrors.quality);
    }
  });
});
