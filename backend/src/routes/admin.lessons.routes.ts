import { Prisma, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import {
  createLessonCustomVoice,
  generateLessonAudio,
  listLessonCustomVoices,
  previewLessonAudio,
} from "../controllers/adminLessonAudio.controller";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { writeLessonAudio } from "../services/audioStorage";
import { buildSegmentsFromTextAndDuration } from "../services/transcriptSegments";
import { transcribeMp3WithTimestamps } from "../services/openaiTts";
import { AppError } from "../utils/appError";
import { prisma } from "../utils/prisma";
import { makeTranscriptSegments } from "../utils/transcriptGenerator";
import { writeTranscriptJson } from "../utils/transcriptWriter";

export const adminLessonsRouter = Router();

const ensureAdmin = [requireAuth, requireRole(Role.ADMIN)] as const;

adminLessonsRouter.post("/lessons/:lessonId/generate-audio", ...ensureAdmin, generateLessonAudio);
adminLessonsRouter.post("/lessons/preview-audio", ...ensureAdmin, previewLessonAudio);
adminLessonsRouter.get("/lessons/custom-voices", ...ensureAdmin, listLessonCustomVoices);
adminLessonsRouter.post("/lessons/custom-voices", ...ensureAdmin, createLessonCustomVoice);

const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined) return undefined;
      if (typeof value === "string" && value.trim() === "") return undefined;
      return value;
    },
    z.string().trim().max(max).optional()
  );

const nullableTrimmedString = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
      }
      return value;
    },
    z.string().trim().max(max).nullable().optional()
  );

const optionalBoolean = z.preprocess((value) => {
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return value;
}, z.boolean().optional());

const optionalInt = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return value;
  },
  z.coerce.number().int().min(0).optional()
);

const courseCreateSchema = z.object({
  title: z.string().trim().min(2).max(191),
  description: optionalTrimmedString(4000),
  isActive: optionalBoolean,
});

const courseUpdateSchema = courseCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "No course updates provided");

const chapterCreateSchema = z.object({
  courseId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(191),
  description: optionalTrimmedString(4000),
  orderIndex: z.coerce.number().int().min(1),
});

const chapterUpdateSchema = z
  .object({
    title: z.string().trim().min(2).max(191).optional(),
    description: optionalTrimmedString(4000),
    orderIndex: z.coerce.number().int().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "No chapter updates provided");

const lessonCreateSchema = z.object({
  chapterId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(191),
  orderIndex: z.coerce.number().int().min(1),
  videoUrl: optionalTrimmedString(1000),
  transcriptText: optionalTrimmedString(200000),
  uploadedAudioBase64: optionalTrimmedString(20_000_000),
  uploadedAudioMimeType: optionalTrimmedString(120),
  durationSec: optionalInt,
  assessmentTestId: nullableTrimmedString(191),
});

const lessonUpdateSchema = z
  .object({
    title: z.string().trim().min(2).max(191).optional(),
    orderIndex: z.coerce.number().int().min(1).optional(),
    videoUrl: optionalTrimmedString(1000),
    transcriptText: optionalTrimmedString(200000),
    uploadedAudioBase64: optionalTrimmedString(20_000_000),
    uploadedAudioMimeType: optionalTrimmedString(120),
    transcriptUrl: nullableTrimmedString(1000),
    durationSec: optionalInt,
    assessmentTestId: nullableTrimmedString(191),
  })
  .refine((data) => Object.keys(data).length > 0, "No lesson updates provided");

const lessonTrackingQuerySchema = z.object({
  courseId: optionalTrimmedString(191),
  chapterId: optionalTrimmedString(191),
  search: optionalTrimmedString(191),
});

const serializeCourse = (course: {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { chapters: number };
}) => ({
  ...course,
  createdAt: course.createdAt.toISOString(),
  updatedAt: course.updatedAt.toISOString(),
});

const serializeChapter = (chapter: {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: { lessons: number };
}) => ({
  ...chapter,
  createdAt: chapter.createdAt.toISOString(),
  updatedAt: chapter.updatedAt.toISOString(),
});

const serializeLesson = (lesson: {
  id: string;
  chapterId: string;
  title: string;
  orderIndex: number;
  videoUrl: string;
  transcriptUrl: string | null;
  audioUrl?: string | null;
  durationSec: number;
  assessmentTestId: string | null;
  createdAt: Date;
  updatedAt: Date;
  assessmentTest?: {
    id: string;
    title: string;
    examType: string;
    subject: string;
    isActive: boolean;
  } | null;
}) => ({
  ...lesson,
  createdAt: lesson.createdAt.toISOString(),
  updatedAt: lesson.updatedAt.toISOString(),
});

const AUDIO_MIME_TO_EXTENSION: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/aac": "aac",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/flac": "flac",
};

const normalizeAudioMimeType = (value?: string): string =>
  String(value || "audio/mpeg")
    .trim()
    .toLowerCase()
    .split(";")[0] || "audio/mpeg";

const resolveAudioExtension = (mimeType?: string): string => {
  const normalized = normalizeAudioMimeType(mimeType);
  return AUDIO_MIME_TO_EXTENSION[normalized] || "mp3";
};

const parseBase64AudioPayload = (
  payload: string
): {
  buffer: Buffer;
  mimeTypeFromDataUrl: string | undefined;
} => {
  const raw = String(payload || "").trim();
  if (!raw) {
    throw new AppError("Uploaded audio is required.", 400);
  }

  const dataUrlMatch = raw.match(/^data:([^;,]+);base64,(.+)$/i);
  const base64 = (dataUrlMatch ? dataUrlMatch[2] : raw).replace(/\s+/g, "");
  const mimeTypeFromDataUrl = dataUrlMatch?.[1]?.trim().toLowerCase();
  if (!base64 || !/^[a-zA-Z0-9+/=]+$/.test(base64)) {
    throw new AppError("Uploaded audio is not valid base64.", 400);
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    throw new AppError("Uploaded audio is not valid base64.", 400);
  }
  if (!buffer.length) {
    throw new AppError("Uploaded audio is empty.", 400);
  }

  return {
    buffer,
    mimeTypeFromDataUrl,
  };
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

const inferTranscriptionLanguageFromText = (value: string): string => {
  const text = String(value || "");
  if (!text) return "";
  if (/[\u0A00-\u0A7F]/u.test(text)) return "pa";
  if (/[\u0900-\u097F]/u.test(text)) return "hi";
  if (/[\u0600-\u06FF]/u.test(text)) return "ur";
  if (/[A-Za-z]/.test(text)) return "en";
  return "";
};

const containsNonLatinScript = (value: string): boolean => {
  const text = String(value || "");
  return /[\u0A00-\u0A7F\u0900-\u097F\u0600-\u06FF]/u.test(text);
};

const buildAlignedTranscriptSegments = async (
  lessonId: string,
  audioBuffer: Buffer,
  mimeType: string,
  transcriptText: string,
  fallbackDurationMs: number
): Promise<Prisma.InputJsonValue> => {
  const fallbackSegments = buildSegmentsFromTextAndDuration(transcriptText, fallbackDurationMs);
  try {
    const aligned = await transcribeMp3WithTimestamps(audioBuffer, transcriptText, {
      mimeType,
      fileName: `lesson-${lessonId}-upload.${resolveAudioExtension(mimeType)}`,
      languageHint: inferTranscriptionLanguageFromText(transcriptText),
    });
    const timelineItems = aligned.words.length ? aligned.words : aligned.segments;
    if (!timelineItems.length) {
      return {
        segments: fallbackSegments,
        words: [],
      } as Prisma.InputJsonValue;
    }
    if (aligned.words.length && !containsNonLatinScript(transcriptText)) {
      const spokenText = aligned.words
        .map((item) => String(item.text || "").trim())
        .filter(Boolean)
        .join(" ");
      const coverageScore = computeTokenCoverage(transcriptText, spokenText);
      if (coverageScore !== null && coverageScore < 0.72) {
        throw new AppError(
          `Uploaded audio does not match transcript text (coverage ${(coverageScore * 100).toFixed(
            1
          )}%). Upload matching audio.`,
          422
        );
      }
    }

    const alignedEndMs = Math.max(...timelineItems.map((item) => Math.round(Number(item?.endMs || 0))));
    if (fallbackDurationMs > 0 && Number.isFinite(alignedEndMs) && alignedEndMs > 0) {
      const durationGapRatio = Math.abs(alignedEndMs - fallbackDurationMs) / fallbackDurationMs;
      if (durationGapRatio > 0.22) {
        return {
          segments: fallbackSegments,
          words: [],
        } as Prisma.InputJsonValue;
      }
    }

    return {
      segments: aligned.segments.length ? aligned.segments : fallbackSegments,
      words: aligned.words,
    } as Prisma.InputJsonValue;
  } catch (alignmentError) {
    if (alignmentError instanceof AppError) {
      throw alignmentError;
    }
    console.error(`Uploaded audio alignment failed for lesson ${lessonId}`, alignmentError);
    return {
      segments: fallbackSegments,
      words: [],
    } as Prisma.InputJsonValue;
  }
};

const handleUniqueConstraint = (
  error: unknown,
  message = "Unique constraint failed. Check order index and duplicates."
) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new AppError(message, 409);
  }
  throw error;
};

const handleLessonOrderUniqueConstraint = async (
  error: unknown,
  chapterId?: string,
  orderIndex?: number
) => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    throw error;
  }

  if (!chapterId || !orderIndex) {
    throw new AppError("Lesson order index already exists for this chapter.", 409);
  }

  const conflictingLesson = await prisma.lesson.findFirst({
    where: {
      chapterId,
      orderIndex,
    },
    select: {
      id: true,
      chapterId: true,
      orderIndex: true,
      title: true,
    },
  });

  throw new AppError("Lesson order index already exists for this chapter.", 409, undefined, {
    chapterId,
    orderIndex,
    conflictLessonId: conflictingLesson?.id ?? null,
    conflictLessonTitle: conflictingLesson?.title ?? null,
  });
};

adminLessonsRouter.get("/lesson-assessments", ...ensureAdmin, async (_req, res, next) => {
  try {
    const mockTests = await prisma.mockTest.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        examType: true,
        subject: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.json({
      mockTests: mockTests.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

adminLessonsRouter.get("/lesson-courses", ...ensureAdmin, async (_req, res, next) => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        _count: {
          select: { chapters: true },
        },
      },
    });

    res.json({ courses: courses.map(serializeCourse) });
  } catch (error) {
    next(error);
  }
});

adminLessonsRouter.post("/lesson-courses", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = courseCreateSchema.parse(req.body);
    const course = await prisma.course.create({
      data: {
        title: input.title,
        description: input.description,
        isActive: input.isActive ?? true,
      },
      include: {
        _count: {
          select: { chapters: true },
        },
      },
    });
    res.status(201).json({ course: serializeCourse(course) });
  } catch (error) {
    next(error);
  }
});

adminLessonsRouter.patch("/lesson-courses/:courseId", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = courseUpdateSchema.parse(req.body);
    const existing = await prisma.course.findUnique({
      where: { id: req.params.courseId },
      select: { id: true },
    });
    if (!existing) {
      throw new AppError("Course not found", 404);
    }

    const course = await prisma.course.update({
      where: { id: req.params.courseId },
      data: {
        title: input.title,
        description: input.description,
        isActive: input.isActive,
      },
      include: {
        _count: {
          select: { chapters: true },
        },
      },
    });
    res.json({ course: serializeCourse(course) });
  } catch (error) {
    next(error);
  }
});

adminLessonsRouter.delete("/lesson-courses/:courseId", ...ensureAdmin, async (req, res, next) => {
  try {
    await prisma.course.delete({
      where: { id: req.params.courseId },
    });
    res.json({ message: "Course deleted" });
  } catch (error) {
    next(error);
  }
});

adminLessonsRouter.get("/lesson-courses/:courseId/chapters", ...ensureAdmin, async (req, res, next) => {
  try {
    const chapters = await prisma.chapter.findMany({
      where: { courseId: req.params.courseId },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      include: {
        _count: {
          select: { lessons: true },
        },
      },
    });

    if (!chapters.length) {
      const course = await prisma.course.findUnique({
        where: { id: req.params.courseId },
        select: { id: true },
      });
      if (!course) {
        throw new AppError("Course not found", 404);
      }
    }

    res.json({ chapters: chapters.map(serializeChapter) });
  } catch (error) {
    next(error);
  }
});

adminLessonsRouter.post("/lesson-chapters", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = chapterCreateSchema.parse(req.body);
    const course = await prisma.course.findUnique({
      where: { id: input.courseId },
      select: { id: true },
    });
    if (!course) {
      throw new AppError("Course not found", 404);
    }

    const chapter = await prisma.chapter.create({
      data: {
        courseId: input.courseId,
        title: input.title,
        description: input.description,
        orderIndex: input.orderIndex,
      },
      include: {
        _count: {
          select: { lessons: true },
        },
      },
    });

    res.status(201).json({ chapter: serializeChapter(chapter) });
  } catch (error) {
    try {
      handleUniqueConstraint(error, "Chapter order index already exists for this course.");
    } catch (handled) {
      next(handled);
    }
  }
});

adminLessonsRouter.patch("/lesson-chapters/:chapterId", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = chapterUpdateSchema.parse(req.body);
    const existing = await prisma.chapter.findUnique({
      where: { id: req.params.chapterId },
      select: { id: true },
    });
    if (!existing) {
      throw new AppError("Chapter not found", 404);
    }

    const chapter = await prisma.chapter.update({
      where: { id: req.params.chapterId },
      data: {
        title: input.title,
        description: input.description,
        orderIndex: input.orderIndex,
      },
      include: {
        _count: {
          select: { lessons: true },
        },
      },
    });

    res.json({ chapter: serializeChapter(chapter) });
  } catch (error) {
    try {
      handleUniqueConstraint(error, "Chapter order index already exists for this course.");
    } catch (handled) {
      next(handled);
    }
  }
});

adminLessonsRouter.delete("/lesson-chapters/:chapterId", ...ensureAdmin, async (req, res, next) => {
  try {
    await prisma.chapter.delete({
      where: { id: req.params.chapterId },
    });
    res.json({ message: "Chapter deleted" });
  } catch (error) {
    next(error);
  }
});

adminLessonsRouter.get("/lesson-chapters/:chapterId/lessons", ...ensureAdmin, async (req, res, next) => {
  try {
    const chapter = await prisma.chapter.findUnique({
      where: { id: req.params.chapterId },
      select: { id: true },
    });
    if (!chapter) {
      throw new AppError("Chapter not found", 404);
    }

    const lessons = await prisma.lesson.findMany({
      where: { chapterId: req.params.chapterId },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      include: {
        assessmentTest: {
          select: {
            id: true,
            title: true,
            examType: true,
            subject: true,
            isActive: true,
          },
        },
      },
    });

    res.json({ lessons: lessons.map(serializeLesson) });
  } catch (error) {
    next(error);
  }
});

adminLessonsRouter.get("/lesson-items/tracking", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = lessonTrackingQuerySchema.parse(req.query);
    const where: Prisma.LessonWhereInput = {};

    if (input.chapterId) {
      where.chapterId = input.chapterId;
    }

    if (input.courseId) {
      where.chapter = {
        is: {
          courseId: input.courseId,
        },
      };
    }

    if (input.search) {
      where.title = {
        contains: input.search,
      };
    }

    const lessons = await prisma.lesson.findMany({
      where,
      orderBy: [
        { chapter: { course: { title: "asc" } } },
        { chapter: { orderIndex: "asc" } },
        { orderIndex: "asc" },
      ],
      include: {
        chapter: {
          select: {
            id: true,
            title: true,
            orderIndex: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        assessmentTest: {
          select: {
            id: true,
            title: true,
          },
        },
        progress: {
          select: {
            lastPositionSec: true,
            completed: true,
            updatedAt: true,
          },
        },
      },
    });

    const trackedLessons = lessons.map((lesson) => {
      const learnersStarted = lesson.progress.length;
      const learnersCompleted = lesson.progress.reduce(
        (count, item) => (item.completed ? count + 1 : count),
        0
      );
      const completionRate =
        learnersStarted > 0 ? Math.round((learnersCompleted / learnersStarted) * 100) : 0;
      const totalPositionSec = lesson.progress.reduce(
        (sum, item) => sum + Math.max(0, Number(item.lastPositionSec || 0)),
        0
      );
      const averagePositionSec =
        learnersStarted > 0 ? Math.round(totalPositionSec / learnersStarted) : 0;
      const averageWatchPercent =
        lesson.durationSec > 0
          ? Math.min(100, Math.round((averagePositionSec / lesson.durationSec) * 100))
          : 0;
      const lastActivityAt = lesson.progress.reduce<Date | null>(
        (latest, item) => (!latest || item.updatedAt > latest ? item.updatedAt : latest),
        null
      );

      return {
        id: lesson.id,
        title: lesson.title,
        orderIndex: lesson.orderIndex,
        durationSec: lesson.durationSec,
        updatedAt: lesson.updatedAt.toISOString(),
        course: {
          id: lesson.chapter.course.id,
          title: lesson.chapter.course.title,
        },
        chapter: {
          id: lesson.chapter.id,
          title: lesson.chapter.title,
          orderIndex: lesson.chapter.orderIndex,
        },
        assessment: lesson.assessmentTest
          ? {
              id: lesson.assessmentTest.id,
              title: lesson.assessmentTest.title,
            }
          : null,
        transcriptReady: Boolean(lesson.transcriptUrl),
        audioReady: Boolean(lesson.audioUrl),
        learnersStarted,
        learnersCompleted,
        completionRate,
        averagePositionSec,
        averageWatchPercent,
        lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
      };
    });

    const summary = {
      totalLessons: trackedLessons.length,
      withAssessment: trackedLessons.filter((lesson) => Boolean(lesson.assessment)).length,
      transcriptReady: trackedLessons.filter((lesson) => lesson.transcriptReady).length,
      audioReady: trackedLessons.filter((lesson) => lesson.audioReady).length,
    };

    res.json({
      lessons: trackedLessons,
      summary,
    });
  } catch (error) {
    next(error);
  }
});

adminLessonsRouter.post("/lesson-items", ...ensureAdmin, async (req, res, next) => {
  let requestedChapterId: string | undefined;
  let requestedOrderIndex: number | undefined;
  try {
    const input = lessonCreateSchema.parse(req.body);
    requestedChapterId = input.chapterId;
    requestedOrderIndex = input.orderIndex;
    const chapter = await prisma.chapter.findUnique({
      where: { id: input.chapterId },
      select: { id: true },
    });
    if (!chapter) {
      throw new AppError("Chapter not found", 404);
    }

    if (input.assessmentTestId) {
      const test = await prisma.mockTest.findUnique({
        where: { id: input.assessmentTestId },
        select: { id: true },
      });
      if (!test) {
        throw new AppError("Assessment test not found", 404);
      }
    }

    const lesson = await prisma.lesson.create({
      data: {
        chapterId: input.chapterId,
        title: input.title,
        orderIndex: input.orderIndex,
        videoUrl: input.videoUrl ?? "",
        transcriptUrl: null,
        durationSec: input.durationSec ?? 0,
        assessmentTestId: input.assessmentTestId ?? null,
      },
    });

    const transcriptText = input.transcriptText ?? null;
    let transcriptUrl: string | null = null;
    let audioUrl: string | null = null;
    let audioDurationMs: number | null = null;
    let transcriptSegments: Prisma.InputJsonValue | undefined;
    if (transcriptText && transcriptText.length >= 10) {
      const segments = makeTranscriptSegments(transcriptText);
      transcriptUrl = await writeTranscriptJson(lesson.id, segments);
    }
    if (input.uploadedAudioBase64) {
      const parsedAudio = parseBase64AudioPayload(input.uploadedAudioBase64);
      const mimeType = normalizeAudioMimeType(input.uploadedAudioMimeType || parsedAudio.mimeTypeFromDataUrl);
      audioUrl = await writeLessonAudio(lesson.id, parsedAudio.buffer, resolveAudioExtension(mimeType));
      try {
        const parsedDurationMs = await parseAudioDurationMs(parsedAudio.buffer, mimeType);
        audioDurationMs = parsedDurationMs > 0 ? parsedDurationMs : null;
      } catch (durationParseError) {
        console.error(`Unable to parse uploaded audio duration for lesson ${lesson.id}`, durationParseError);
      }

      if (transcriptText) {
        transcriptSegments = await buildAlignedTranscriptSegments(
          lesson.id,
          parsedAudio.buffer,
          mimeType,
          transcriptText,
          audioDurationMs && audioDurationMs > 0 ? audioDurationMs : transcriptText.length * 40
        );
      }
    }

    const lessonUpdateData: Prisma.LessonUncheckedUpdateInput = {
      transcriptUrl,
    };
    if (audioUrl) {
      lessonUpdateData.audioUrl = audioUrl;
      lessonUpdateData.audioDurationMs = audioDurationMs;
      lessonUpdateData.audioGeneratedAt = new Date();
    }
    if (transcriptSegments !== undefined) {
      lessonUpdateData.transcriptSegments = transcriptSegments;
    }

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: lessonUpdateData,
    });

    await prisma.$executeRawUnsafe(
      "UPDATE `Lesson` SET `transcriptText` = ? WHERE `id` = ?",
      transcriptText,
      lesson.id
    );

    const savedLesson = await prisma.lesson.findUnique({
      where: { id: lesson.id },
      include: {
        assessmentTest: {
          select: {
            id: true,
            title: true,
            examType: true,
            subject: true,
            isActive: true,
          },
        },
      },
    });
    if (!savedLesson) {
      throw new AppError("Lesson not found", 404);
    }

    res.status(201).json({ lesson: serializeLesson(savedLesson) });
  } catch (error) {
    try {
      await handleLessonOrderUniqueConstraint(error, requestedChapterId, requestedOrderIndex);
    } catch (handled) {
      next(handled);
    }
  }
});

adminLessonsRouter.patch("/lesson-items/:lessonId", ...ensureAdmin, async (req, res, next) => {
  let requestedChapterId: string | undefined;
  let requestedOrderIndex: number | undefined;
  try {
    const input = lessonUpdateSchema.parse(req.body);
    requestedOrderIndex = input.orderIndex;
    const existing = await prisma.lesson.findUnique({
      where: { id: req.params.lessonId },
      select: { id: true, chapterId: true, transcriptText: true },
    });
    if (!existing) {
      throw new AppError("Lesson not found", 404);
    }
    requestedChapterId = existing.chapterId;

    if (input.assessmentTestId) {
      const test = await prisma.mockTest.findUnique({
        where: { id: input.assessmentTestId },
        select: { id: true },
      });
      if (!test) {
        throw new AppError("Assessment test not found", 404);
      }
    }

    const transcriptTextProvided = Object.prototype.hasOwnProperty.call(input, "transcriptText");
    const nextTranscriptText = transcriptTextProvided ? input.transcriptText ?? null : undefined;
    const existingTranscript = String(existing.transcriptText || "").trim();
    const nextTranscriptNormalized =
      typeof nextTranscriptText === "string" ? String(nextTranscriptText || "").trim() : existingTranscript;
    const transcriptActuallyChanged = transcriptTextProvided && nextTranscriptNormalized !== existingTranscript;
    const hasUploadedAudio = Boolean(input.uploadedAudioBase64);

    let generatedTranscriptUrl: string | null | undefined = undefined;
    if (transcriptTextProvided) {
      if (typeof nextTranscriptText === "string" && nextTranscriptText.length >= 10) {
        const segments = makeTranscriptSegments(nextTranscriptText);
        generatedTranscriptUrl = await writeTranscriptJson(req.params.lessonId, segments);
      } else {
        generatedTranscriptUrl = null;
      }
    }

    let uploadedAudioUrl: string | undefined;
    let uploadedAudioDurationMs: number | null = null;
    let uploadedTranscriptSegments: Prisma.InputJsonValue | undefined;
    if (input.uploadedAudioBase64) {
      const parsedAudio = parseBase64AudioPayload(input.uploadedAudioBase64);
      const mimeType = normalizeAudioMimeType(input.uploadedAudioMimeType || parsedAudio.mimeTypeFromDataUrl);
      uploadedAudioUrl = await writeLessonAudio(
        req.params.lessonId,
        parsedAudio.buffer,
        resolveAudioExtension(mimeType)
      );
      try {
        const parsedDurationMs = await parseAudioDurationMs(parsedAudio.buffer, mimeType);
        uploadedAudioDurationMs = parsedDurationMs > 0 ? parsedDurationMs : null;
      } catch (durationParseError) {
        console.error(
          `Unable to parse uploaded audio duration for lesson ${req.params.lessonId}`,
          durationParseError
        );
      }

      const transcriptForTiming =
        typeof nextTranscriptText === "string"
          ? nextTranscriptText.trim()
          : String(existing.transcriptText || "").trim();
      if (transcriptForTiming) {
        uploadedTranscriptSegments = await buildAlignedTranscriptSegments(
          req.params.lessonId,
          parsedAudio.buffer,
          mimeType,
          transcriptForTiming,
          uploadedAudioDurationMs && uploadedAudioDurationMs > 0
            ? uploadedAudioDurationMs
            : transcriptForTiming.length * 40
        );
      }
    }

    const lessonUpdateData: Prisma.LessonUncheckedUpdateInput = {
      title: input.title,
      orderIndex: input.orderIndex,
      videoUrl: input.videoUrl,
      transcriptUrl:
        generatedTranscriptUrl !== undefined
          ? generatedTranscriptUrl
          : Object.prototype.hasOwnProperty.call(input, "transcriptUrl")
            ? input.transcriptUrl
            : undefined,
      durationSec: input.durationSec,
      assessmentTestId: Object.prototype.hasOwnProperty.call(input, "assessmentTestId")
        ? input.assessmentTestId ?? null
        : undefined,
    };
    if (uploadedAudioUrl) {
      lessonUpdateData.audioUrl = uploadedAudioUrl;
      lessonUpdateData.audioDurationMs = uploadedAudioDurationMs;
      lessonUpdateData.audioGeneratedAt = new Date();
    }
    if (uploadedTranscriptSegments !== undefined) {
      lessonUpdateData.transcriptSegments = uploadedTranscriptSegments;
    }
    if (transcriptActuallyChanged && !hasUploadedAudio) {
      lessonUpdateData.audioUrl = null;
      lessonUpdateData.audioDurationMs = null;
      lessonUpdateData.audioGeneratedAt = null;
      lessonUpdateData.transcriptSegments = Prisma.JsonNull;
    }

    const lesson = await prisma.lesson.update({
      where: { id: req.params.lessonId },
      data: lessonUpdateData,
      include: {
        assessmentTest: {
          select: {
            id: true,
            title: true,
            examType: true,
            subject: true,
            isActive: true,
          },
        },
      },
    });

    if (transcriptTextProvided) {
      await prisma.$executeRawUnsafe(
        "UPDATE `Lesson` SET `transcriptText` = ? WHERE `id` = ?",
        nextTranscriptText,
        req.params.lessonId
      );
    }

    res.json({
      lesson: serializeLesson(lesson),
      audioInvalidatedByTranscriptChange: Boolean(transcriptActuallyChanged && !hasUploadedAudio),
    });
  } catch (error) {
    try {
      await handleLessonOrderUniqueConstraint(error, requestedChapterId, requestedOrderIndex);
    } catch (handled) {
      next(handled);
    }
  }
});

adminLessonsRouter.delete("/lesson-items/:lessonId", ...ensureAdmin, async (req, res, next) => {
  try {
    await prisma.lesson.delete({
      where: { id: req.params.lessonId },
    });
    res.json({ message: "Lesson deleted" });
  } catch (error) {
    next(error);
  }
});
