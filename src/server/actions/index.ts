/**
 * Server Actions Pipeline Facade.
 */
export {
  createSafeAction,
  ActionException,
  type ActionContext,
  type SafeActionHandler,
} from "./safe-action";

export type {
  ActionErrorCode,
  ActionError,
  ActionResult,
} from "./types";

export {
  completeTopicAction,
  completeTopicSchema,
  type CompleteTopicInput,
  type CompleteTopicOutput,
} from "./progress-actions";

export {
  submitQuizAction,
  submitQuizSchema,
  type SubmitQuizInput,
} from "./quiz-actions";
