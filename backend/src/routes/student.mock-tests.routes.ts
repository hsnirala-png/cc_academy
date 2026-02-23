import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { mockTestService } from "../modules/mock-tests/mock-test.service";
import { ensureMockTestAccessStorageReady } from "../utils/mockTestAccessStorage";
import {
  studentMockTestsQuerySchema,
  studentSaveAnswerSchema,
  studentStartAttemptSchema,
} from "../modules/mock-tests/mock-test.validation";

export const studentMockTestsRouter = Router();

const ensureStudent = [requireAuth, requireRole(Role.STUDENT, Role.ADMIN)] as const;

studentMockTestsRouter.use(async (_req, _res, next) => {
  try {
    await ensureMockTestAccessStorageReady();
    next();
  } catch (error) {
    next(error);
  }
});

studentMockTestsRouter.get("/mock-tests", ...ensureStudent, async (req, res, next) => {
  try {
    const parsed = studentMockTestsQuerySchema.parse(req.query);
    const input = {
      ...parsed,
      streamChoice: parsed.streamChoice ?? undefined,
      languageMode: parsed.languageMode ?? undefined,
      userId: req.user!.userId,
    };
    const mockTests = await mockTestService.listStudentMockTests(input);
    res.json({ mockTests });
  } catch (error) {
    next(error);
  }
});

studentMockTestsRouter.get("/mock-tests/:mockTestId/lesson-context", ...ensureStudent, async (req, res, next) => {
  try {
    const lesson = await mockTestService.getLessonContextForMockTest(req.params.mockTestId);
    res.json({ lesson });
  } catch (error) {
    next(error);
  }
});

studentMockTestsRouter.post("/attempts", ...ensureStudent, async (req, res, next) => {
  try {
    const input = studentStartAttemptSchema.parse(req.body);
    const attempt = await mockTestService.startAttempt(req.user!.userId, input.mockTestId);
    res.status(201).json({ attempt });
  } catch (error) {
    next(error);
  }
});

studentMockTestsRouter.get("/attempts/:id", ...ensureStudent, async (req, res, next) => {
  try {
    const attempt = await mockTestService.getStudentAttemptMeta(req.user!.userId, req.params.id);
    res.json({ attempt });
  } catch (error) {
    next(error);
  }
});

studentMockTestsRouter.get("/attempts/:id/questions", ...ensureStudent, async (req, res, next) => {
  try {
    const questions = await mockTestService.getStudentAttemptQuestions(
      req.user!.userId,
      req.params.id
    );
    res.json({ questions });
  } catch (error) {
    next(error);
  }
});

studentMockTestsRouter.post("/attempts/:id/answers", ...ensureStudent, async (req, res, next) => {
  try {
    const input = studentSaveAnswerSchema.parse(req.body);
    const answer = await mockTestService.saveAttemptAnswer(req.user!.userId, req.params.id, input);
    res.json({ answer });
  } catch (error) {
    next(error);
  }
});

studentMockTestsRouter.put("/attempts/:id/answers", ...ensureStudent, async (req, res, next) => {
  try {
    const input = studentSaveAnswerSchema.parse(req.body);
    const answer = await mockTestService.saveAttemptAnswer(req.user!.userId, req.params.id, input);
    res.json({ answer });
  } catch (error) {
    next(error);
  }
});

studentMockTestsRouter.post("/attempts/:id/submit", ...ensureStudent, async (req, res, next) => {
  try {
    const result = await mockTestService.submitAttempt(req.user!.userId, req.params.id);
    res.json({ result });
  } catch (error) {
    next(error);
  }
});

studentMockTestsRouter.get("/history", ...ensureStudent, async (req, res, next) => {
  try {
    const attempts = await mockTestService.listStudentHistory(req.user!.userId);
    res.json({ attempts });
  } catch (error) {
    next(error);
  }
});

studentMockTestsRouter.get("/history/:attemptId", ...ensureStudent, async (req, res, next) => {
  try {
    const attempt = await mockTestService.getStudentHistoryDetail(
      req.user!.userId,
      req.params.attemptId
    );
    res.json({ attempt });
  } catch (error) {
    next(error);
  }
});
