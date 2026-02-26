import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { writeLessonAudio } from "../services/audioStorage";
import { generateGeminiSpeechBuffer } from "../services/geminiTts";
import {
  createCustomVoice,
  generateSpeechMp3Buffer,
  listCustomVoices,
  transcribeMp3WithTimestamps,
} from "../services/openaiTts";
import { buildSegmentsFromTextAndDuration } from "../services/transcriptSegments";
import { AppError } from "../utils/appError";
import { prisma } from "../utils/prisma";

const generateAudioBodySchema = z.object({
  provider: z.enum(["openai", "gemini"]).optional(),
  model: z.string().trim().min(1).max(100).optional(),
  voice: z.string().trim().min(1).max(100).optional(),
  languageHint: z.string().trim().min(1).max(100).optional(),
  transcriptText: z
    .string()
    .trim()
    .min(1)
    .max(20000)
    .optional(),
});
const previewAudioBodySchema = z.object({
  provider: z.enum(["openai", "gemini"]).optional(),
  text: z.string().trim().min(1).max(2000),
  model: z.string().trim().min(1).max(100).optional(),
  voice: z.string().trim().min(1).max(100).optional(),
  languageHint: z.string().trim().min(1).max(100).optional(),
});
const customVoiceCreateBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(400).optional(),
  consentStatement: z.string().trim().min(10).max(500),
  consentAudioBase64: z.string().trim().min(20).max(8_000_000),
  consentAudioMimeType: z.string().trim().max(120).optional(),
  sampleAudioBase64: z.string().trim().min(20).max(8_000_000),
  sampleAudioMimeType: z.string().trim().max(120).optional(),
});

const MAX_TRANSCRIPT_LENGTH = 20000;
const OPENAI_TTS_MAX_INPUT_CHARS = 4096;
const GEMINI_TTS_MAX_INPUT_CHARS = 12000;

const tokenizeForCoverage = (value: string): string[] =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

const computeTokenCoverage = (referenceText: string, spokenText: string): number | null => {
  const referenceTokens = tokenizeForCoverage(referenceText);
  const spokenTokens = tokenizeForCoverage(spokenText);
  if (!referenceTokens.length || !spokenTokens.length) return null;

  const spokenCount = new Map<string, number>();
  spokenTokens.forEach((token) => {
    spokenCount.set(token, (spokenCount.get(token) || 0) + 1);
  });

  let matched = 0;
  referenceTokens.forEach((token) => {
    const count = spokenCount.get(token) || 0;
    if (count > 0) {
      matched += 1;
      spokenCount.set(token, count - 1);
    }
  });
  return matched / referenceTokens.length;
};

const getAlignedTimelineEndMs = (items: Array<{ endMs?: number }>): number => {
  if (!Array.isArray(items) || !items.length) return 0;
  const endMs = Math.max(...items.map((item) => Number(item?.endMs || 0)));
  return Number.isFinite(endMs) && endMs > 0 ? Math.round(endMs) : 0;
};

const parseAudioDurationMs = async (audioBuffer: Buffer, mimeType = "audio/mpeg"): Promise<number> => {
  const maybeMusicMetadataModule = (await import("music-metadata")) as any;
  const musicMetadataModule =
    typeof maybeMusicMetadataModule?.loadMusicMetadata === "function"
      ? await maybeMusicMetadataModule.loadMusicMetadata()
      : maybeMusicMetadataModule;

  if (typeof musicMetadataModule?.parseBuffer !== "function") {
    throw new Error("music-metadata parseBuffer is unavailable.");
  }

  const metadata = await musicMetadataModule.parseBuffer(audioBuffer, { mimeType });
  const durationSec = Number(metadata.format.duration || 0);
  return durationSec > 0 ? Math.round(durationSec * 1000) : 0;
};

const mapTtsProviderError = (error: unknown): AppError | null => {
  const err = error as any;
  const status = Number(err?.status || err?.response?.status || 0);
  const code = String(err?.code || err?.error?.code || "").toLowerCase();
  const message = String(err?.error?.message || err?.message || "");

  if (code === "insufficient_quota" || status === 429) {
    return new AppError("TTS quota exceeded. Check API billing/limits and retry.", 429);
  }

  if (status === 401) {
    return new AppError("TTS API key is invalid or expired.", 401);
  }

  if (status === 403) {
    return new AppError(
      "TTS request is not permitted for this key/account.",
      403
    );
  }

  if (status === 404) {
    return new AppError("Requested TTS endpoint/voice was not found.", 404);
  }

  if (status >= 400) {
    return new AppError(message || "OpenAI request failed.", status);
  }

  if (message.includes("OPENAI_API_KEY is not configured")) {
    return new AppError("OPENAI_API_KEY is missing in backend environment.", 500);
  }
  if (message.includes("GEMINI_API_KEY is not configured")) {
    return new AppError("GEMINI_API_KEY is missing in backend environment.", 500);
  }
  if (message.toLowerCase().includes("fetch failed") || message.toLowerCase().includes("network")) {
    return new AppError(
      "Unable to reach TTS provider. Check internet access, API base URL, and firewall rules.",
      502
    );
  }
  if (message.trim()) {
    return new AppError(message.trim(), status >= 400 ? status : 502);
  }

  return null;
};

export const generateLessonAudio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lessonId = String(req.params.lessonId || "").trim();
    if (!lessonId) {
      throw new AppError("Lesson id is required.", 400);
    }

    const body = generateAudioBodySchema.parse(req.body || {});

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        transcriptText: true,
      },
    });

    if (!lesson) {
      throw new AppError("Lesson not found.", 404);
    }

    const transcriptText = String(body.transcriptText || lesson.transcriptText || "").trim();
    if (!transcriptText) {
      throw new AppError("Lesson transcript text is empty.", 400);
    }
    const provider = String(body.provider || "openai").toLowerCase() === "gemini" ? "gemini" : "openai";
    const providerMaxInputChars = provider === "gemini" ? GEMINI_TTS_MAX_INPUT_CHARS : OPENAI_TTS_MAX_INPUT_CHARS;
    if (transcriptText.length > providerMaxInputChars) {
      throw new AppError(
        `Transcript is too long for single-pass ${provider.toUpperCase()} TTS (${transcriptText.length} chars). Keep under ${providerMaxInputChars} chars.`,
        400
      );
    }
    if (transcriptText.length > MAX_TRANSCRIPT_LENGTH) {
      throw new AppError(`Transcript is too long. Maximum ${MAX_TRANSCRIPT_LENGTH} characters.`, 400);
    }

    const generatedAudio =
      provider === "gemini"
        ? await generateGeminiSpeechBuffer(transcriptText, {
            model: body.model ?? process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-flash-preview-tts",
            voice: body.voice ?? process.env.GEMINI_TTS_VOICE ?? "Kore",
            languageHint: body.languageHint ?? "auto",
          })
        : {
            buffer: await generateSpeechMp3Buffer(transcriptText, {
              model: body.model ?? "tts-1",
              voice: body.voice ?? "alloy",
              languageHint: body.languageHint ?? "auto",
            }),
            mimeType: "audio/mpeg",
            extension: "mp3",
            model: body.model ?? "tts-1",
            voice: body.voice ?? "alloy",
          };

    if (!generatedAudio.buffer.length) {
      throw new AppError("Failed to generate lesson audio.", 502);
    }

    let durationMs = 0;
    try {
      durationMs = await parseAudioDurationMs(generatedAudio.buffer, generatedAudio.mimeType);
    } catch (durationParseError) {
      console.error(`Unable to parse generated audio duration for lesson ${lesson.id}`, durationParseError);
    }
    let transcriptSegments: any = buildSegmentsFromTextAndDuration(
      transcriptText,
      durationMs > 0 ? durationMs : transcriptText.length * 40
    );
    let coverageScore: number | null = null;
    let alignedTimelineEndMs = 0;
    let hasAlignedTimeline = false;
    try {
      const aligned = await transcribeMp3WithTimestamps(generatedAudio.buffer, transcriptText, {
        mimeType: generatedAudio.mimeType,
        fileName: `lesson-audio.${generatedAudio.extension || "mp3"}`,
        languageHint: body.languageHint,
      });
      if (!aligned.words.length) {
        throw new AppError(
          "Generated audio does not include word timestamps. Please regenerate voice.",
          422
        );
      }
      const timelineItems = aligned.words;
      if (!timelineItems.length) {
        throw new AppError(
          "Could not align generated voice with transcript. Please regenerate audio.",
          422
        );
      }
      hasAlignedTimeline = true;
      alignedTimelineEndMs = getAlignedTimelineEndMs(timelineItems);
      const spokenText = timelineItems
        .map((item) => String(item.text || "").trim())
        .filter(Boolean)
        .join(" ");
      coverageScore = computeTokenCoverage(transcriptText, spokenText);
      transcriptSegments = {
        segments: aligned.segments,
        words: aligned.words,
      };
    } catch (alignmentError) {
      if (alignmentError instanceof AppError) {
        throw alignmentError;
      }
      console.error(`Transcript timing alignment failed for lesson ${lesson.id}`, alignmentError);
      throw new AppError(
        "Could not align generated voice with transcript. Please regenerate audio.",
        422
      );
    }
    if (!hasAlignedTimeline) {
      throw new AppError(
        "Could not align generated voice with transcript. Please regenerate audio.",
        422
      );
    }
    if (coverageScore !== null && coverageScore < 0.82) {
      throw new AppError(
        `Generated voice does not fully match transcript text (coverage ${(coverageScore * 100).toFixed(
          1
        )}%). Please regenerate voice.`,
        422
      );
    }
    const transcriptWordCount = tokenizeForCoverage(transcriptText).length;
    if (durationMs > 0 && transcriptWordCount >= 20) {
      const absoluteMinimumMs = Math.round((transcriptWordCount / 4.5) * 1000);
      if (durationMs < absoluteMinimumMs) {
        throw new AppError(
          "Generated audio is too short for the transcript text. Please regenerate voice.",
          422
        );
      }
    }
    if (durationMs > 0 && alignedTimelineEndMs > 0) {
      const durationGapRatio = Math.abs(alignedTimelineEndMs - durationMs) / durationMs;
      if (durationGapRatio > 0.22) {
        throw new AppError(
          "Generated audio timing does not match transcript timeline. Please regenerate voice.",
          422
        );
      }
    }

    const audioUrl = await writeLessonAudio(lesson.id, generatedAudio.buffer, generatedAudio.extension || "mp3");

    const updatedLesson = await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        audioUrl,
        audioDurationMs: durationMs || null,
        audioGeneratedAt: new Date(),
        transcriptSegments,
      },
    });

    if (body.transcriptText && body.transcriptText.trim()) {
      try {
        await prisma.$executeRawUnsafe(
          "UPDATE `Lesson` SET `transcriptText` = ? WHERE `id` = ?",
          body.transcriptText.trim(),
          lesson.id
        );
      } catch (transcriptSaveError) {
        console.error(`Unable to persist transcript text for lesson ${lesson.id}`, transcriptSaveError);
      }
    }

    try {
      await prisma.$executeRawUnsafe(
        "UPDATE `Lesson` SET `audioVoice` = ?, `audioLanguageHint` = ? WHERE `id` = ?",
        generatedAudio.voice || body.voice || (provider === "gemini" ? "Kore" : "alloy"),
        body.languageHint ?? "auto",
        lesson.id
      );
    } catch (audioMetaError) {
      console.error(`Unable to persist audio voice/language metadata for lesson ${lesson.id}`, audioMetaError);
    }

    res.json({
      message: "Lesson audio generated successfully.",
      lesson: updatedLesson,
    });
  } catch (error) {
    const mapped = mapTtsProviderError(error);
    if (mapped) {
      next(mapped);
      return;
    }
    next(error);
  }
};

export const previewLessonAudio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = previewAudioBodySchema.parse(req.body || {});
    const provider = String(body.provider || "openai").toLowerCase() === "gemini" ? "gemini" : "openai";
    const generatedAudio =
      provider === "gemini"
        ? await generateGeminiSpeechBuffer(body.text, {
            model: body.model ?? process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-flash-preview-tts",
            voice: body.voice ?? process.env.GEMINI_TTS_VOICE ?? "Kore",
            languageHint: body.languageHint ?? "auto",
          })
        : {
            buffer: await generateSpeechMp3Buffer(body.text, {
              model: body.model ?? "tts-1",
              voice: body.voice ?? "alloy",
              languageHint: body.languageHint ?? "auto",
            }),
            mimeType: "audio/mpeg",
          };

    if (!generatedAudio.buffer.length) {
      throw new AppError("Failed to generate voice preview.", 502);
    }

    res.setHeader("Content-Type", generatedAudio.mimeType || "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(generatedAudio.buffer);
  } catch (error) {
    const mapped = mapTtsProviderError(error);
    if (mapped) {
      next(mapped);
      return;
    }
    next(error);
  }
};

export const listLessonCustomVoices = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const voices = await listCustomVoices();
    res.json({ voices });
  } catch (error) {
    const mapped = mapTtsProviderError(error);
    if (mapped) {
      next(mapped);
      return;
    }
    next(error);
  }
};

export const createLessonCustomVoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = customVoiceCreateBodySchema.parse(req.body || {});
    const voice = await createCustomVoice({
      name: body.name,
      description: body.description,
      consentStatement: body.consentStatement,
      consentAudioBase64: body.consentAudioBase64,
      consentAudioMimeType: body.consentAudioMimeType,
      sampleAudioBase64: body.sampleAudioBase64,
      sampleAudioMimeType: body.sampleAudioMimeType,
    });

    res.status(201).json({
      message: "Custom voice created successfully.",
      voice,
    });
  } catch (error) {
    const mapped = mapTtsProviderError(error);
    if (mapped) {
      next(mapped);
      return;
    }
    next(error);
  }
};
