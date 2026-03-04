import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import {
  TRANSLITERATION_LANGUAGES,
  TransliterationLanguage,
  transliterateWord,
} from "../services/transliteration.service";

export const adminTransliterationRouter = Router();

const ensureAdmin = [requireAuth, requireRole(Role.ADMIN)] as const;

const transliterationRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Text is required")
    .max(64, "Text is too long")
    .regex(/^[A-Za-z']+$/, "Only Roman transliteration input is supported"),
  limit: z.coerce.number().int().min(1).max(8).optional(),
});

const languageParamSchema = z.enum(TRANSLITERATION_LANGUAGES);

adminTransliterationRouter.post("/transliteration/:language", ...ensureAdmin, async (req, res, next) => {
  try {
    const language = languageParamSchema.parse(String(req.params.language || "").trim()) as TransliterationLanguage;
    const input = transliterationRequestSchema.parse(req.body);
    const result = await transliterateWord(language, input.text, input.limit ?? 5);
    res.json({ result });
  } catch (error) {
    next(error);
  }
});
