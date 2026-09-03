/**
 * Quiz domain module public facade.
 * Clean boundary: External modules import quiz logic and components ONLY from here.
 */

// Types & DTOs
export type {
  QuizQuestionType,
  QuizOptionDTO,
  QuizQuestionDTO,
  QuizSubmissionDTO,
  QuizQuestionResultDTO,
  QuizResultDTO,
} from "./types";

// Services
export {
  getQuizForTopic,
  evaluateQuizSubmission,
  calculateQuizResult,
} from "./services/quiz-service";

// UI Components
export { QuizCard } from "./components/QuizCard";
export { QuizStepper } from "./components/QuizStepper";
export { QuizResultView } from "./components/QuizResultView";
export { QuizContainer } from "./components/QuizContainer";
export { QuizModal } from "./components/QuizModal";
