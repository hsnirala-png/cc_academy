import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import {
  TRANSLATION_LANGUAGES,
  translateAdminText,
  TranslationLanguage,
} from "../services/translation.service";

export const adminTranslationRouter = Router();

const ensureAdmin = [requireAuth, requireRole(Role.ADMIN)] as const;

const translationLanguageSchema = z.enum(TRANSLATION_LANGUAGES);
const ADMIN_TRANSLATION_TEXT_MAX = 30000;
const translationRequestSchema = z.object({
  text: z.string().trim().min(1, "Text is required.").max(ADMIN_TRANSLATION_TEXT_MAX, "Text is too long."),
  sourceLanguage: translationLanguageSchema,
  targetLanguage: translationLanguageSchema,
});

adminTranslationRouter.post("/translation/field", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = translationRequestSchema.parse(req.body || {});
    const translation = await translateAdminText({
      text: input.text,
      sourceLanguage: input.sourceLanguage as TranslationLanguage,
      targetLanguage: input.targetLanguage as TranslationLanguage,
    });
    res.json({ translation });
  } catch (error) {
    next(error);
  }
});
