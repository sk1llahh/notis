import { env } from "@/shared/config/env";
import { ActionException } from "@/server/actions/safe-action";
import {
  importedTopicPayloadSchema,
  type ImportedTopicPayload,
} from "@/server/actions/import-topic-actions.schemas";
import type { GenerateTopicInput } from "@/server/actions/ai-topic-actions.schemas";
import { slugify } from "@/shared/lib/utils";
import { SYSTEM_CURRICULUM_PROMPT, buildTopicGenerationPrompt } from "./prompts";

/**
 * Strips markdown code blocks (e.g. ```json ... ```) from model raw text response.
 */
function cleanJsonOutput(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```json")) {
    text = text.slice(7);
  } else if (text.startsWith("```")) {
    text = text.slice(3);
  }

  if (text.endsWith("```")) {
    text = text.slice(0, -3);
  }

  return text.trim();
}

/**
 * Invokes Google Gemini via Generative Language REST API to synthesize
 * a deep educational topic module adhering to Notis schema requirements.
 */
export async function generateTopicWithGemini(
  input: GenerateTopicInput
): Promise<ImportedTopicPayload> {
  const apiKey =
    input.customApiKey?.trim() ||
    env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new ActionException(
      "BAD_REQUEST",
      "API ключ Gemini не обнаружен. Пожалуйста, укажите персональный ключ в поле ввода или настройте GEMINI_API_KEY в файле .env"
    );
  }

  const model = input.model || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    systemInstruction: {
      parts: [{ text: SYSTEM_CURRICULUM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: buildTopicGenerationPrompt(input) }],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      topP: 0.95,
      responseMimeType: "application/json",
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds timeout for comprehensive generation

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new ActionException(
        "INTERNAL_SERVER_ERROR",
        "Время ожидания ответа от Google Gemini превышено (90с). Попробуйте разбить запрос или выбрать модель flash."
      );
    }
    throw new ActionException(
      "INTERNAL_SERVER_ERROR",
      `Сетевая ошибка при обращении к Gemini: ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      errorDetail =
        errJson?.error?.message ||
        JSON.stringify(errJson) ||
        response.statusText;
    } catch {
      // ignore json parse error on error response
    }

    if (response.status === 400 || response.status === 403) {
      throw new ActionException(
        "BAD_REQUEST",
        `Ошибка авторизации или параметров Gemini API: ${errorDetail}`
      );
    }

    throw new ActionException(
      "INTERNAL_SERVER_ERROR",
      `Google Gemini API вернул ошибку (${response.status}): ${errorDetail}`
    );
  }

  const responseJson = await response.json();
  const rawText =
    responseJson?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText || typeof rawText !== "string") {
    throw new ActionException(
      "INTERNAL_SERVER_ERROR",
      "Gemini вернул пустой ответ или ответ некорректного формата."
    );
  }

  const cleanedJson = cleanJsonOutput(rawText);
  let parsedPayload: Record<string, unknown>;

  try {
    parsedPayload = JSON.parse(cleanedJson);
  } catch (err) {
    throw new ActionException(
      "INTERNAL_SERVER_ERROR",
      `Модель сгенерировала синтаксически неверный JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Pre-process & sanitize fields if model drifted slightly
  if (!parsedPayload.slug || typeof parsedPayload.slug !== "string") {
    parsedPayload.slug = slugify(
      String(parsedPayload.title || input.topicTitle)
    );
  } else {
    parsedPayload.slug = slugify(parsedPayload.slug);
  }

  if (!parsedPayload.difficulty) {
    parsedPayload.difficulty = input.difficulty;
  }

  // Validate with strict topic payload schema
  const validation = importedTopicPayloadSchema.safeParse(parsedPayload);
  if (!validation.success) {
    const issues = validation.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ActionException(
      "INTERNAL_SERVER_ERROR",
      `Сгенерированный манифест не прошел валидацию схемы Notis: ${issues}`
    );
  }

  return validation.data;
}
