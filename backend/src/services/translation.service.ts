import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { AppError } from "../utils/appError";

export const TRANSLATION_LANGUAGES = ["english", "punjabi", "hindi"] as const;
export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];
const ADMIN_TRANSLATION_OUTPUT_MAX = 30000;

const translationSchema = z.object({
  translation: z.string().trim().min(1).max(ADMIN_TRANSLATION_OUTPUT_MAX),
});

let openaiClient: OpenAI | null = null;

const getOpenAiClient = (): OpenAI => {
  if (openaiClient) return openaiClient;

  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw new AppError("OPENAI_API_KEY is not configured for admin translation.", 500);
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
};

const getTranslationModel = () => String(process.env.OPENAI_TRANSLATION_MODEL || "gpt-4o-mini").trim();

const getLanguageLabel = (language: TranslationLanguage) => {
  switch (language) {
    case "punjabi":
      return "Punjabi (Gurmukhi script)";
    case "hindi":
      return "Hindi (Devanagari script)";
    default:
      return "English";
  }
};

const buildTranslationInstructions = (sourceLanguage: TranslationLanguage, targetLanguage: TranslationLanguage) =>
  [
    "You translate educational multiple-choice question content.",
    `Translate from ${getLanguageLabel(sourceLanguage)} to ${getLanguageLabel(targetLanguage)}.`,
    "Return only the translated text in the JSON field.",
    "Preserve meaning exactly.",
    "Keep option labels, numbering, equations, decimals, symbols, and punctuation intact.",
    "Do not solve the question.",
    "Do not add explanation, commentary, or extra formatting.",
    "If the input is mostly formulas, codes, abbreviations, or already in the target language, keep it unchanged except for obvious language text around it.",
  ].join(" ");

const mapTranslationError = (error: unknown): AppError => {
  if (error instanceof AppError) return error;
  const err = error as any;
  const status = Number(err?.status || err?.response?.status || 0);
  const message = String(err?.error?.message || err?.message || "").trim();

  if (status === 401) {
    return new AppError("Admin translation API key is invalid or expired.", 401);
  }
  if (status === 429) {
    return new AppError("Admin translation quota exceeded. Please retry later.", 429);
  }
  if (status >= 400) {
    return new AppError(message || "Admin translation request failed.", status);
  }
  if (!message) {
    return new AppError("Admin translation service is unavailable.", 503);
  }
  return new AppError(message, 503);
};

export const translateAdminText = async ({
  text,
  sourceLanguage,
  targetLanguage,
}: {
  text: string;
  sourceLanguage: TranslationLanguage;
  targetLanguage: TranslationLanguage;
}): Promise<string> => {
  const trimmedText = String(text || "").trim();
  if (!trimmedText) return "";
  if (sourceLanguage === targetLanguage) return trimmedText;

  try {
    const response = await getOpenAiClient().responses.parse({
      model: getTranslationModel(),
      instructions: buildTranslationInstructions(sourceLanguage, targetLanguage),
      input: trimmedText,
      text: {
        format: zodTextFormat(translationSchema, "admin_translation_result"),
      },
    });

    const translated = String(response.output_parsed?.translation || "").trim();
    if (!translated) {
      throw new AppError("Admin translation returned an empty response.", 503);
    }
    return translated;
  } catch (error) {
    throw mapTranslationError(error);
  }
};
