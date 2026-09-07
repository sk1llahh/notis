/**
 * Server Actions Pipeline & Core Types.
 *
 * IMPORTANT (Next.js App Router Invariant):
 * Server Actions must ALWAYS be imported directly from their isolated "use server"
 * module files (e.g. `@/server/actions/course-actions`) and NOT through this barrel file.
 *
 * Importing actions through a non-"use server" barrel bypasses Turbopack's RPC boundary,
 * causing server-side dependencies (Prisma, Auth.js secrets) to leak into the client bundle.
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

