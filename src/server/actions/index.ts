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
} from "./topic-actions";

export {
  submitQuizAction,
  submitQuizSchema,
  type SubmitQuizInput,
  retakeQuizAction,
  retakeQuizSchema,
  type RetakeQuizInput,
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

export {
  updateTopicContentAction,
  updateTopicContentSchema,
  type UpdateTopicContentInput,
  type UpdateTopicContentOutput,
  upsertQuizQuestionAction,
  upsertQuizQuestionSchema,
  type UpsertQuizQuestionInput,
  type UpsertQuizQuestionOutput,
  deleteQuizQuestionAction,
  deleteQuizQuestionSchema,
  type DeleteQuizQuestionInput,
  type DeleteQuizQuestionOutput,
  publishTopicAction,
  publishTopicSchema,
  type PublishTopicInput,
  type PublishTopicOutput,
  getTopicStudioDetailsAction,
  getTopicStudioDetailsSchema,
  type GetTopicStudioDetailsInput,
} from "./studio-topic-actions";

export {
  reviewCardAction,
  reviewCardSchema,
  type ReviewCardInput,
  type ReviewCardOutput,
} from "./spaced-repetition-actions";

export {
  enrollCourseAction,
  enrollCourseSchema,
  type EnrollCourseInput,
  type EnrollCourseOutput,
} from "./course-actions";

export {
  createCourseAction,
  createCourseSchema,
  type CreateCourseInput,
  type CreateCourseOutput,
  updateCourseSettingsAction,
  updateCourseSettingsSchema,
  type UpdateCourseSettingsInput,
  type UpdateCourseSettingsOutput,
  deleteCourseAction,
  deleteCourseSchema,
  type DeleteCourseInput,
  type DeleteCourseOutput,
} from "./admin-course-actions";

export {
  createTopicAction,
  createTopicSchema,
  type CreateTopicInput,
  type CreateTopicOutput,
  deleteTopicAction,
  deleteTopicSchema,
  type DeleteTopicInput,
  type DeleteTopicOutput,
} from "./studio-topic-lifecycle-actions";

export {
  registerUserAction,
  registerUserSchema,
  type RegisterUserInput,
  type RegisterUserOutput,
} from "./auth-actions";
