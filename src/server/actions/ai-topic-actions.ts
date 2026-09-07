"use server";

import { createSafeAction, ActionException } from "./safe-action";
import { assertCourseAuthor } from "@/server/auth";
import {
  generateTopicInputSchema,
  type GenerateTopicOutput,
} from "./ai-topic-actions.schemas";
import { generateTopicWithGemini } from "@/server/ai/gemini-client";

/**
 * Server Action: Generates a complete topic draft (article with KaTeX/Mermaid,
 * 5 question types, and SM-2 flashcards) via Google Gemini.
 *
 * Protected by Course Author / Admin RBAC guard.
 */
export const generateTopicDraftAction = createSafeAction(
  generateTopicInputSchema,
  async (input, { session }): Promise<GenerateTopicOutput> => {
    // 1. Session authentication guard
    if (!session?.user?.id) {
      throw new ActionException(
        "UNAUTHORIZED",
        "Для генерации темы с помощью ИИ требуется авторизация"
      );
    }

    // 2. Early validation of Gemini API key presence
    const apiKey =
      input.customApiKey?.trim() ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new ActionException(
        "BAD_REQUEST",
        "API ключ Gemini не обнаружен. Пожалуйста, укажите персональный ключ в поле ввода или настройте GEMINI_API_KEY в файле .env"
      );
    }

    // 3. Course author RBAC permissions guard
    await assertCourseAuthor(input.courseSlug, session.user.id);

    // 3. Delegate generation to Gemini Curriculum engine
    const topicDraft = await generateTopicWithGemini(input);

    return topicDraft;
  }
);
