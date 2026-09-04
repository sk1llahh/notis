/**
 * Spaced Repetition Domain Module Facade.
 */

export {
  calculateSM2,
  type SM2Input,
  type SM2Output,
} from "./services/sm2-algorithm";

export { getDueFlashcards } from "./services/spaced-repetition-service";
export {
  enrollTopicIntoReviewQueue,
  type EnrollTopicResult,
} from "./services/spaced-card-service";

export { FlashcardView } from "./components/FlashcardView";
export { PracticeDeck } from "./components/PracticeDeck";

export type {
  ReviewCardDTO,
  CardReviewResultDTO,
  QualityRating,
} from "./types";

