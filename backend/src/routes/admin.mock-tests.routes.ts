import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { mockTestService } from "../modules/mock-tests/mock-test.service";
import { ensureMockTestAccessStorageReady } from "../utils/mockTestAccessStorage";
import {
  adminAttemptsFilterSchema,
  adminBulkImportQuestionsSchema,
  adminCreateMockTestSchema,
  adminCreateQuestionSchema,
  adminUpdateMockTestSchema,
  adminUpdateQuestionSchema,
} from "../modules/mock-tests/mock-test.validation";

export const adminMockTestsRouter = Router();

const ensureAdmin = [requireAuth, requireRole(Role.ADMIN)] as const;

adminMockTestsRouter.use("/mock-tests", async (_req, _res, next) => {
  try {
    await ensureMockTestAccessStorageReady();
    next();
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.get("/mock-tests", ...ensureAdmin, async (_req, res, next) => {
  try {
    const mockTests = await mockTestService.listMockTests();
    res.json({ mockTests });
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.post("/mock-tests", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = adminCreateMockTestSchema.parse(req.body);
    const mockTest = await mockTestService.createMockTest({
      ...input,
      createdBy: req.user!.userId,
    });
    res.status(201).json({ mockTest });
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.get("/mock-tests/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    const mockTest = await mockTestService.getMockTestById(req.params.id);
    res.json({ mockTest });
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.patch("/mock-tests/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    const updates = adminUpdateMockTestSchema.parse(req.body);
    const mockTest = await mockTestService.updateMockTest(req.params.id, updates);
    res.json({ mockTest });
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.delete("/mock-tests/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    await mockTestService.deleteMockTest(req.params.id);
    res.json({ message: "Mock test deleted" });
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.get("/mock-tests/:id/questions", ...ensureAdmin, async (req, res, next) => {
  try {
    const questions = await mockTestService.listQuestions(req.params.id);
    res.json({ questions });
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.post("/mock-tests/:id/questions", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = adminCreateQuestionSchema.parse(req.body);
    const question = await mockTestService.createQuestion(req.params.id, input);
    res.status(201).json({ question });
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.post(
  "/mock-tests/:id/questions/import-csv",
  ...ensureAdmin,
  async (req, res, next) => {
    try {
      const input = adminBulkImportQuestionsSchema.parse(req.body);
      const result = await mockTestService.bulkImportQuestions(req.params.id, input.rows, {
        replaceExisting: input.replaceExisting,
      });
      res.status(201).json({ result });
    } catch (error) {
      next(error);
    }
  }
);

adminMockTestsRouter.patch("/questions/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    const updates = adminUpdateQuestionSchema.parse(req.body);
    const question = await mockTestService.updateQuestion(req.params.id, updates);
    res.json({ question });
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.delete("/questions/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    await mockTestService.deleteQuestion(req.params.id);
    res.json({ message: "Question deleted" });
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.get("/attempts", ...ensureAdmin, async (req, res, next) => {
  try {
    const filters = adminAttemptsFilterSchema.parse(req.query);
    const attempts = await mockTestService.listAttempts(filters);
    res.json({ attempts });
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.get("/attempts/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    const attempt = await mockTestService.getAttemptDetails(req.params.id);
    res.json({ attempt });
  } catch (error) {
    next(error);
  }
});
