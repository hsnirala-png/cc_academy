import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { lessonService } from "../modules/lessons/lesson.service";

export const lessonsRouter = Router();

const ensureStudent = [requireAuth, requireRole(Role.STUDENT, Role.ADMIN)] as const;

const updateProgressSchema = z.object({
  lastPositionSec: z.coerce.number().min(0),
  completed: z.boolean().optional(),
});

const chapterOverviewQuerySchema = z.object({
  courseId: z.string().trim().min(1).optional(),
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
