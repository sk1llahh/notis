/**
 * Auth Context & Session Facade.
 */
export { auth, signIn, signOut, handlers } from "./auth";

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
