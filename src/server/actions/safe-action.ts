import { z } from "zod";
import { getAuthSession, type AuthSession } from "@/server/auth";
import type { ActionErrorCode, ActionResult } from "./types";

export class ActionException extends Error {
  readonly code: ActionErrorCode;

  constructor(code: ActionErrorCode, message: string) {
    super(message);
    this.name = "ActionException";
    this.code = code;
    Object.setPrototypeOf(this, ActionException.prototype);
  }
}

export interface ActionContext {
  session: AuthSession;
}

export type SafeActionHandler<TInput, TOutput> = (
  input: TInput,
  ctx: ActionContext
) => Promise<TOutput>;

/**
 * Pipeline for building type-safe server actions:
 * 1. Zod input validation
 * 2. Session / Auth context injection
 * 3. Controlled ActionException handling
 * 4. Obfuscation of unhandled server exceptions
 */
export function createSafeAction<TInput, TOutput>(
  schema: z.ZodType<TInput>,
  handler: SafeActionHandler<TInput, TOutput>
) {
  return async (rawInput: unknown): Promise<ActionResult<TOutput>> => {
    // 1. Zod input validation
    const parseResult = await schema.safeParseAsync(rawInput);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parseResult.error.issues) {
        const path = issue.path.length > 0 ? issue.path.join(".") : "_form";
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      }

      return {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Ошибка валидации входных данных",
          fieldErrors,
        },
      };
    }

    // 2. Auth context injection
    const session = await getAuthSession();

    // 3. Protected handler execution
    try {
      const data = await handler(parseResult.data, { session });
      return {
        success: true,
        data,
      };
    } catch (error) {
      // Allow Next.js framework system errors (redirect, notFound) to bubble up
      if (
        error &&
        typeof error === "object" &&
        "digest" in error &&
        typeof (error as Record<string, unknown>).digest === "string" &&
        (
          (error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
          (error as { digest: string }).digest.startsWith("NEXT_NOT_FOUND")
        )
      ) {
        throw error;
      }

      if (error instanceof ActionException) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
      }

      console.error("[Action Error]:", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Внутренняя ошибка сервера",
        },
      };
    }
  };
}
