/**
 * Auth Context & Session Facade.
 */
export {
  getAuthSession,
  type AuthSession,
  type SessionUser,
  type UserRole,
} from "./session";

export {
  assertCourseAuthor,
  type AuthorRole,
  type AssertCourseAuthorResult,
} from "./rbac";

