import { z } from "zod";
import { AppError } from "../utils/appError";

export const TRANSLITERATION_LANGUAGES = ["punjabi", "hindi"] as const;
export type TransliterationLanguage = (typeof TRANSLITERATION_LANGUAGES)[number];

const REQUEST_TIMEOUT_MS = 2500;

const DEFAULT_TRANSLITERATION_URLS: Record<TransliterationLanguage, string> = {
  punjabi: "http://127.0.0.1:8091/transliterate/punjabi",
  hindi: "http://127.0.0.1:8091/transliterate/hindi",
};

const TRANSLITERATION_ENV_KEYS: Record<TransliterationLanguage, string> = {
  punjabi: "PUNJABI_TRANSLITERATION_URL",
  hindi: "HINDI_TRANSLITERATION_URL",
};

const transliterationResponseSchema = z.object({
  result: z.array(z.string().trim()).default([]),
});

const normalizeSuggestions = (suggestions: string[], limit: number) => {
  const seen = new Set<string>();
  return suggestions
    .map((value) => String(value || "").trim())
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .slice(0, limit);
};

const getEndpoint = (language: TransliterationLanguage) => {
  const envKey = TRANSLITERATION_ENV_KEYS[language];
  return String(process.env[envKey] || DEFAULT_TRANSLITERATION_URLS[language]).trim();
};

export const transliterateWord = async (
  language: TransliterationLanguage,
  text: string,
  limit = 5
): Promise<string[]> => {
  const trimmedText = String(text || "").trim();
  if (!trimmedText) return [];

  const endpoint = getEndpoint(language);
  if (!endpoint) {
    throw new AppError(`${language} transliteration service is not configured.`, 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: trimmedText,
        limit: Math.max(1, Math.min(limit, 8)),
      }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AppError(`${language} transliteration service request failed.`, 503, undefined, payload);
    }

    const parsed = transliterationResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(`${language} transliteration service returned an invalid response.`, 503);
    }

    return normalizeSuggestions(parsed.data.result, Math.max(1, Math.min(limit, 8)));
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(`${language} transliteration service timed out.`, 504);
    }
    throw new AppError(`${language} transliteration service is unavailable.`, 503);
  } finally {
    clearTimeout(timeout);
  }
};
