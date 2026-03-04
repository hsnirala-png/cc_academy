import { z } from "zod";
import { AppError } from "../utils/appError";

const DEFAULT_PUNJABI_TRANSLITERATION_URL = "http://127.0.0.1:8091/transliterate/punjabi";
const REQUEST_TIMEOUT_MS = 2500;

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

export const transliteratePunjabiWord = async (text: string, limit = 5): Promise<string[]> => {
  const trimmedText = String(text || "").trim();
  if (!trimmedText) return [];

  const endpoint = String(
    process.env.PUNJABI_TRANSLITERATION_URL || DEFAULT_PUNJABI_TRANSLITERATION_URL
  ).trim();
  if (!endpoint) {
    throw new AppError("Punjabi transliteration service is not configured.", 503);
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
      throw new AppError("Punjabi transliteration service request failed.", 503, undefined, payload);
    }

    const parsed = transliterationResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError("Punjabi transliteration service returned an invalid response.", 503);
    }

    return normalizeSuggestions(parsed.data.result, Math.max(1, Math.min(limit, 8)));
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError("Punjabi transliteration service timed out.", 504);
    }
    throw new AppError("Punjabi transliteration service is unavailable.", 503);
  } finally {
    clearTimeout(timeout);
  }
};
