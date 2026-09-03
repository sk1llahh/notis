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

export {
  updateNodePositionsAction,
  updateNodePositionsSchema,
  type UpdateNodePositionsInput,
  type UpdateNodePositionsOutput,
  connectPrerequisiteAction,
  connectPrerequisiteSchema,
  type ConnectPrerequisiteInput,
  type ConnectPrerequisiteOutput,
  disconnectPrerequisiteAction,
  disconnectPrerequisiteSchema,
  type DisconnectPrerequisiteInput,
  type DisconnectPrerequisiteOutput,
} from "./studio-actions";

