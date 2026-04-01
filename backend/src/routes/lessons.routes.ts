import path from "node:path";
import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { lessonService } from "../modules/lessons/lesson.service";
import { resolveLessonAudioAbsolutePath } from "../services/audioStorage";
import { verifyToken } from "../utils/jwt";

export const lessonsRouter = Router();

const ensureStudent = [requireAuth, requireRole(Role.STUDENT, Role.ADMIN)] as const;

const updateProgressSchema = z.object({
  lastPositionSec: z.coerce.number().min(0),
  completed: z.boolean().optional(),
});

const chapterOverviewQuerySchema = z.object({
  courseId: z.string().trim().min(1).optional(),
});

const resolveLessonAudioToken = (rawValue: unknown) => {
  const token = String(rawValue || "").trim();
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
};

const resolveLessonAudioMimeType = (filePath: string) => {
  const ext = path.extname(String(filePath || "")).toLowerCase();
  if (ext === ".wav") return "audio/wav";
  if (ext === ".webm") return "audio/webm";
  if (ext === ".ogg") return "audio/ogg";
  if (ext === ".aac") return "audio/aac";
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".flac") return "audio/flac";
  return "audio/mpeg";
};

lessonsRouter.get("/lessons/:lessonId/audio", async (req, res, next) => {
  try {
    const payload = resolveLessonAudioToken(req.query?.token);
    if (!payload) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const lessonPayload = await lessonService.getLessonForUser(payload.userId, req.params.lessonId);
    const audioUrl = String(lessonPayload?.lesson?.audioUrl || "").trim();
    const audioPath = resolveLessonAudioAbsolutePath(audioUrl);
    if (!audioPath) {
      res.status(404).json({ message: "Lesson audio not found" });
      return;
    }

    res.setHeader("Content-Type", resolveLessonAudioMimeType(audioPath));
    res.sendFile(audioPath);
  } catch (error) {
    next(error);
  }
});

lessonsRouter.get("/lessons/:lessonId", ...ensureStudent, async (req, res, next) => {
  try {
    const payload = await lessonService.getLessonForUser(req.user!.userId, req.params.lessonId);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

lessonsRouter.put("/lessons/:lessonId/progress", ...ensureStudent, async (req, res, next) => {
  try {
    const input = updateProgressSchema.parse(req.body);
    const payload = await lessonService.upsertLessonProgress(
      req.user!.userId,
      req.params.lessonId,
      input
    );
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

lessonsRouter.get("/chapters/overview", ...ensureStudent, async (req, res, next) => {
  try {
    const input = chapterOverviewQuerySchema.parse(req.query || {});
    const payload = await lessonService.getDefaultChapterOverview(req.user!.userId, input.courseId);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

lessonsRouter.get("/chapters/:chapterId/overview", ...ensureStudent, async (req, res, next) => {
  try {
    const payload = await lessonService.getChapterOverview(req.user!.userId, req.params.chapterId);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});
