import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { tuitionAiService } from "../modules/tuition/tuition-ai.service";
import { tuitionHomeworkService } from "../modules/tuition/tuition-homework.service";
import { tuitionPlanService } from "../modules/tuition/tuition-plan.service";
import { tuitionProfileService } from "../modules/tuition/tuition-profile.service";
import { tuitionProgressService } from "../modules/tuition/tuition-progress.service";
import { tuitionSyllabusService } from "../modules/tuition/tuition-syllabus.service";

export const studentTuitionRouter = Router();

const ensureStudent = [requireAuth, requireRole(Role.STUDENT)] as const;

const trimmedOptionalString = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined) return undefined;
      const normalized = String(value).trim();
      return normalized ? normalized : undefined;
    },
    z.string().max(max).optional()
  );

const profileSchema = z.object({
  boardCode: trimmedOptionalString(30).nullable().optional(),
  classLevel: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      return value;
    },
    z.coerce.number().int().min(6).max(12).nullable().optional()
  ),
  subjectCode: trimmedOptionalString(40).nullable().optional(),
  preferredLanguage: trimmedOptionalString(40).nullable().optional(),
  activeSyllabusId: trimmedOptionalString(191).nullable().optional(),
});

const uploadSchema = z.object({
  sourceType: z.string().trim().min(1).max(40),
  fileName: z.string().trim().min(1).max(191),
  mimeType: z.string().trim().min(1).max(191),
  fileBase64: z.string().trim().min(1),
});

const parseSchema = z.object({
  title: trimmedOptionalString(191).nullable().optional(),
  manualText: trimmedOptionalString(12000).nullable().optional(),
  chapterNames: z.array(z.string().trim().min(1).max(191)).max(40).optional(),
});

const reviewSchema = z.object({
  title: z.string().trim().min(1).max(191),
  activate: z.coerce.boolean().optional(),
  chapters: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(191),
        orderIndex: z.coerce.number().int().positive().optional(),
        isIncluded: z.coerce.boolean().optional(),
      })
    )
    .min(1)
    .max(60),
});

const sessionSchema = z.object({
  speedMode: trimmedOptionalString(20).optional(),
  difficultyMode: trimmedOptionalString(20).optional(),
  responseLanguage: trimmedOptionalString(40).optional(),
  explanationLanguage: trimmedOptionalString(40).optional(),
  boardLanguage: trimmedOptionalString(40).optional(),
  voiceLanguage: trimmedOptionalString(40).optional(),
  subject: trimmedOptionalString(120).optional(),
  topic: trimmedOptionalString(191).optional(),
  curriculumBoard: trimmedOptionalString(120).optional(),
  resume: z.coerce.boolean().optional(),
});

const messageSchema = z.object({
  content: z.string().trim().min(1).max(8000),
  responseLanguage: trimmedOptionalString(40).optional(),
  explanationLanguage: trimmedOptionalString(40).optional(),
  boardLanguage: trimmedOptionalString(40).optional(),
  voiceLanguage: trimmedOptionalString(40).optional(),
  subject: trimmedOptionalString(120).optional(),
  topic: trimmedOptionalString(191).optional(),
  curriculumBoard: trimmedOptionalString(120).optional(),
  speedMode: trimmedOptionalString(20).optional(),
  difficultyMode: trimmedOptionalString(20).optional(),
});

const voiceSessionSchema = z.object({
  responseLanguage: trimmedOptionalString(40).optional(),
  voiceLanguage: trimmedOptionalString(40).optional(),
  boardLanguage: trimmedOptionalString(40).optional(),
  explanationLanguage: trimmedOptionalString(40).optional(),
  subject: trimmedOptionalString(120).optional(),
  topic: trimmedOptionalString(191).optional(),
  curriculumBoard: trimmedOptionalString(120).optional(),
  speedMode: trimmedOptionalString(20).optional(),
  difficultyMode: trimmedOptionalString(20).optional(),
});

const homeworkGenerateSchema = z.object({
  sessionId: trimmedOptionalString(191).optional(),
  responseLanguage: trimmedOptionalString(40).optional(),
  speedMode: trimmedOptionalString(20).optional(),
  difficultyMode: trimmedOptionalString(20).optional(),
});

const homeworkSubmissionSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1).max(191),
        response: z.string().trim().min(1).max(8000),
      })
    )
    .min(1)
    .max(20),
  notes: trimmedOptionalString(4000).optional(),
});

studentTuitionRouter.get("/tuition/bootstrap", ...ensureStudent, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const [profile, ai] = await Promise.all([
      tuitionProfileService.getBootstrap(userId),
      tuitionAiService.getBootstrapMeta(),
    ]);

    res.json({
      ok: true,
      phase: "phase-6",
      profile,
      ai,
      flow: {
        entryPage: "/tuition-syllabus-upload.html",
        upload: "/student/tuition/syllabus-uploads",
        reviewPage: "/tuition-syllabus-review.html?uploadId=:uploadId",
        chaptersPage: "/tuition-chapters.html",
        teacherPage: "/tuition-teacher.html?chapterId=:chapterId",
        homeworkPage: "/tuition-homework.html?homeworkId=:homeworkId",
      },
    });
  } catch (error) {
    next(error);
  }
});

studentTuitionRouter.get("/tuition/profile", ...ensureStudent, async (req, res, next) => {
  try {
    const profile = await tuitionProfileService.getProfile(req.user!.userId);
    res.json({ ok: true, profile });
  } catch (error) {
    next(error);
  }
});

studentTuitionRouter.put("/tuition/profile", ...ensureStudent, async (req, res, next) => {
  try {
    const input = profileSchema.parse(req.body);
    const profile = await tuitionProfileService.updateProfile(req.user!.userId, input);
    res.json({ ok: true, profile });
  } catch (error) {
    next(error);
  }
});

studentTuitionRouter.post("/tuition/syllabus-uploads", ...ensureStudent, async (req, res, next) => {
  try {
    const input = uploadSchema.parse(req.body);
    const upload = await tuitionSyllabusService.createUpload(req.user!.userId, input);
    res.status(201).json({ ok: true, upload });
  } catch (error) {
    next(error);
  }
});

studentTuitionRouter.get("/tuition/syllabus-uploads/:uploadId", ...ensureStudent, async (req, res, next) => {
  try {
    const upload = await tuitionSyllabusService.getUpload(req.user!.userId, req.params.uploadId);
    res.json({ ok: true, upload });
  } catch (error) {
    next(error);
  }
});

studentTuitionRouter.post(
  "/tuition/syllabus-uploads/:uploadId/parse",
  ...ensureStudent,
  async (req, res, next) => {
    try {
      const input = parseSchema.parse(req.body);
      const upload = await tuitionSyllabusService.parseUpload(req.user!.userId, req.params.uploadId, input);
      res.json({ ok: true, upload });
    } catch (error) {
      next(error);
    }
  }
);

studentTuitionRouter.put(
  "/tuition/syllabus-uploads/:uploadId/review",
  ...ensureStudent,
  async (req, res, next) => {
    try {
      const input = reviewSchema.parse(req.body);
      const upload = await tuitionSyllabusService.reviewUpload(req.user!.userId, req.params.uploadId, input);
      res.json({ ok: true, upload });
    } catch (error) {
      next(error);
    }
  }
);

studentTuitionRouter.get("/tuition/chapters", ...ensureStudent, async (req, res, next) => {
  try {
    const payload = await tuitionSyllabusService.listChapters(req.user!.userId);
    res.json({ ok: true, ...payload });
  } catch (error) {
    next(error);
  }
});

studentTuitionRouter.get("/tuition/chapters/:chapterId", ...ensureStudent, async (req, res, next) => {
  try {
    const chapter = await tuitionSyllabusService.getChapter(req.user!.userId, req.params.chapterId);
    const [profile, chapterProgress] = await Promise.all([
      tuitionProfileService.getProfile(req.user!.userId),
      tuitionProgressService.getChapterProgress(req.user!.userId, req.params.chapterId),
    ]);
    const plan = chapter.syllabusId
      ? await tuitionPlanService.getPlanForSyllabus(
          (await tuitionProfileService.getOrCreateProfile(req.user!.userId)).id,
          chapter.syllabusId
        )
      : [];
    res.json({ ok: true, chapter, profile, plan, progress: chapterProgress });
  } catch (error) {
    next(error);
  }
});

studentTuitionRouter.post(
  "/tuition/chapters/:chapterId/sessions",
  ...ensureStudent,
  async (req, res, next) => {
    try {
      const input = sessionSchema.parse(req.body);
      const payload = await tuitionAiService.createOrResumeSession(
        req.user!.userId,
        req.params.chapterId,
        input
      );
      res.status(201).json({ ok: true, ...payload });
    } catch (error) {
      next(error);
    }
  }
);

studentTuitionRouter.get(
  "/tuition/chapters/:chapterId/sessions/:sessionId",
  ...ensureStudent,
  async (req, res, next) => {
    try {
      const payload = await tuitionAiService.getSession(
        req.user!.userId,
        req.params.chapterId,
        req.params.sessionId
      );
      res.json({ ok: true, ...payload });
    } catch (error) {
      next(error);
    }
  }
);

studentTuitionRouter.post(
  "/tuition/chapters/:chapterId/homework",
  ...ensureStudent,
  async (req, res, next) => {
    try {
      const input = homeworkGenerateSchema.parse(req.body);
      const homework = await tuitionHomeworkService.generateHomework(
        req.user!.userId,
        req.params.chapterId,
        input
      );
      res.status(201).json({ ok: true, homework });
    } catch (error) {
      next(error);
    }
  }
);

studentTuitionRouter.get("/tuition/homework", ...ensureStudent, async (req, res, next) => {
  try {
    const homework = await tuitionHomeworkService.listHomework(req.user!.userId);
    res.json({ ok: true, homework });
  } catch (error) {
    next(error);
  }
});

studentTuitionRouter.get("/tuition/homework/:homeworkId", ...ensureStudent, async (req, res, next) => {
  try {
    const homework = await tuitionHomeworkService.getHomework(req.user!.userId, req.params.homeworkId);
    res.json({ ok: true, homework });
  } catch (error) {
    next(error);
  }
});

studentTuitionRouter.post(
  "/tuition/homework/:homeworkId/submissions",
  ...ensureStudent,
  async (req, res, next) => {
    try {
      const input = homeworkSubmissionSchema.parse(req.body);
      const payload = await tuitionHomeworkService.submitHomework(
        req.user!.userId,
        req.params.homeworkId,
        input
      );
      res.status(201).json({ ok: true, ...payload });
    } catch (error) {
      next(error);
    }
  }
);

studentTuitionRouter.post(
  "/tuition/chapters/:chapterId/sessions/:sessionId/voice-session",
  ...ensureStudent,
  async (req, res, next) => {
    try {
      const input = voiceSessionSchema.parse(req.body);
      const payload = await tuitionAiService.createVoiceSession(
        req.user!.userId,
        req.params.chapterId,
        req.params.sessionId,
        input
      );
      res.status(201).json({ ok: true, ...payload });
    } catch (error) {
      next(error);
    }
  }
);

studentTuitionRouter.post(
  "/tuition/chapters/:chapterId/sessions/:sessionId/messages",
  ...ensureStudent,
  async (req, res, next) => {
    try {
      const input = messageSchema.parse(req.body);
      const payload = await tuitionAiService.sendMessage(
        req.user!.userId,
        req.params.chapterId,
        req.params.sessionId,
        input
      );
      res.status(201).json({ ok: true, ...payload });
    } catch (error) {
      next(error);
    }
  }
);
