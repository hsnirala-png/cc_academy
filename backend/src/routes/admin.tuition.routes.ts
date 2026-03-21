import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { prisma } from "../utils/prisma";
import { tuitionProfileService } from "../modules/tuition/tuition-profile.service";

export const adminTuitionRouter = Router();

const ensureAdmin = [requireAuth, requireRole(Role.ADMIN)] as const;

adminTuitionRouter.get("/tuition/health", ...ensureAdmin, async (_req, res, next) => {
  try {
    res.json({
      ok: true,
      domain: "tuition-admin",
      phase: "phase-2",
      message: "Admin tuition routes are mounted.",
    });
  } catch (error) {
    next(error);
  }
});

adminTuitionRouter.get("/tuition/bootstrap", ...ensureAdmin, async (_req, res, next) => {
  try {
    await tuitionProfileService.ensureSeedData();
    const [boardCount, subjectCount, profileCount, syllabusCount] = await Promise.all([
      prisma.tuitionBoard.count(),
      prisma.tuitionSubject.count(),
      prisma.tuitionProfile.count(),
      prisma.tuitionSyllabus.count(),
    ]);

    res.json({
      ok: true,
      phase: "phase-2",
      seeded: true,
      counts: {
        boards: boardCount,
        subjects: subjectCount,
        profiles: profileCount,
        syllabi: syllabusCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

adminTuitionRouter.get("/tuition/boards", ...ensureAdmin, async (_req, res, next) => {
  try {
    const boards = await tuitionProfileService.listBoards();
    res.json({ ok: true, boards });
  } catch (error) {
    next(error);
  }
});

adminTuitionRouter.get("/tuition/subjects", ...ensureAdmin, async (_req, res, next) => {
  try {
    const subjects = await tuitionProfileService.listSubjects();
    res.json({ ok: true, subjects });
  } catch (error) {
    next(error);
  }
});
