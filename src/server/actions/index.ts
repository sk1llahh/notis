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

// topic-actions
export { completeTopicAction } from "./topic-actions";
export {
  completeTopicSchema,
  type CompleteTopicInput,
  type CompleteTopicOutput,
} from "./topic-actions.schemas";

// quiz-actions
export {
  submitQuizAction,
  retakeQuizAction,
} from "./quiz-actions";
export {
  quizAnswerItemSchema,
  submitQuizSchema,
  type SubmitQuizInput,
  retakeQuizSchema,
  type RetakeQuizInput,
} from "./quiz-actions.schemas";

// studio-actions
export {
  updateNodePositionsAction,
  connectPrerequisiteAction,
  disconnectPrerequisiteAction,
} from "./studio-actions";
export {
  updateNodePositionsSchema,
  type UpdateNodePositionsInput,
  type UpdateNodePositionsOutput,
  connectPrerequisiteSchema,
  type ConnectPrerequisiteInput,
  type ConnectPrerequisiteOutput,
  disconnectPrerequisiteSchema,
  type DisconnectPrerequisiteInput,
  type DisconnectPrerequisiteOutput,
} from "./studio-actions.schemas";

// studio-topic-actions
export {
  updateTopicContentAction,
  upsertQuizQuestionAction,
  deleteQuizQuestionAction,
  publishTopicAction,
  getTopicStudioDetailsAction,
} from "./studio-topic-actions";
export {
  updateTopicContentSchema,
  type UpdateTopicContentInput,
  type UpdateTopicContentOutput,
  quizOptionSchema,
  upsertQuizQuestionSchema,
  type UpsertQuizQuestionInput,
  type UpsertQuizQuestionOutput,
  deleteQuizQuestionSchema,
  type DeleteQuizQuestionInput,
  type DeleteQuizQuestionOutput,
  publishTopicSchema,
  type PublishTopicInput,
  type PublishTopicOutput,
  getTopicStudioDetailsSchema,
  type GetTopicStudioDetailsInput,
} from "./studio-topic-actions.schemas";

// spaced-repetition-actions
export { reviewCardAction } from "./spaced-repetition-actions";
export {
  reviewCardSchema,
  type ReviewCardInput,
  type ReviewCardOutput,
} from "./spaced-repetition-actions.schemas";

// course-actions
export { enrollCourseAction } from "./course-actions";
export {
  enrollCourseSchema,
  type EnrollCourseInput,
  type EnrollCourseOutput,
} from "./course-actions.schemas";

// admin-course-actions
export {
  createCourseAction,
  updateCourseSettingsAction,
  deleteCourseAction,
} from "./admin-course-actions";
export {
  createCourseSchema,
  type CreateCourseInput,
  type CreateCourseOutput,
  updateCourseSettingsSchema,
  type UpdateCourseSettingsInput,
  type UpdateCourseSettingsOutput,
  deleteCourseSchema,
  type DeleteCourseInput,
  type DeleteCourseOutput,
} from "./admin-course-actions.schemas";

// studio-topic-lifecycle-actions
export {
  createTopicAction,
  deleteTopicAction,
} from "./studio-topic-lifecycle-actions";
export {
  createTopicSchema,
  type CreateTopicInput,
  type CreateTopicOutput,
  deleteTopicSchema,
  type DeleteTopicInput,
  type DeleteTopicOutput,
} from "./studio-topic-lifecycle-actions.schemas";

// auth-actions
export { registerUserAction } from "./auth-actions";
export {
  registerUserSchema,
  type RegisterUserInput,
  type RegisterUserOutput,
} from "./auth-actions.schemas";

// admin-user-actions
export { updateUserRoleAction } from "./admin-user-actions";
export {
  updateUserRoleSchema,
  type UpdateUserRoleInput,
  type UpdateUserRoleOutput,
} from "./admin-user-actions.schemas";

// user-settings-actions
export {
  updateProfileNameAction,
  changePasswordAction,
  deleteAccountAction,
} from "./user-settings-actions";
export {
  updateProfileNameSchema,
  type UpdateProfileNameInput,
  type UpdateProfileNameOutput,
  changePasswordSchema,
  type ChangePasswordInput,
  type ChangePasswordOutput,
  deleteAccountSchema,
  type DeleteAccountInput,
  type DeleteAccountOutput,
} from "./user-settings-actions.schemas";

// course-enrollment-actions
export {
  leaveCourseAction,
  resetCourseProgressAction,
} from "./course-enrollment-actions";
export {
  leaveCourseSchema,
  type LeaveCourseInput,
  type LeaveCourseOutput,
  resetCourseProgressSchema,
  type ResetCourseProgressInput,
  type ResetCourseProgressOutput,
} from "./course-enrollment-actions.schemas";

// admin-tier-actions
export {
  createCourseTierAction,
  updateCourseTierAction,
  deleteCourseTierAction,
  assignTopicTierAction,
  getCourseTiersAction,
} from "./admin-tier-actions";
export {
  createCourseTierSchema,
  type CreateCourseTierInput,
  updateCourseTierSchema,
  type UpdateCourseTierInput,
  deleteCourseTierSchema,
  type DeleteCourseTierInput,
  assignTopicTierSchema,
  type AssignTopicTierInput,
  getCourseTiersSchema,
  type GetCourseTiersInput,
  type CourseTierDTO,
} from "./admin-tier-actions.schemas";

// admin-flashcard-actions
export {
  createFlashcardAction,
  updateFlashcardAction,
  deleteFlashcardAction,
  getTopicFlashcardsAction,
} from "./admin-flashcard-actions";
export {
  createFlashcardSchema,
  type CreateFlashcardInput,
  updateFlashcardSchema,
  type UpdateFlashcardInput,
  deleteFlashcardSchema,
  type DeleteFlashcardInput,
  getTopicFlashcardsSchema,
  type GetTopicFlashcardsInput,
  type FlashcardDTO,
} from "./admin-flashcard-actions.schemas";
