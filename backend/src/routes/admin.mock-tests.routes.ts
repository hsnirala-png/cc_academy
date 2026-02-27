import { Role } from "@prisma/client";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { mockTestService } from "../modules/mock-tests/mock-test.service";
import { ensureMockTestAccessStorageReady } from "../utils/mockTestAccessStorage";
import { ensureMockTestRegistrationStorageReady } from "../utils/mockTestRegistrationStorage";
import { resolvePublicAssetsDir } from "../utils/publicAssetsPath";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/appError";
import {
  adminAttemptsFilterSchema,
  adminBulkImportQuestionsSchema,
  adminCreateMockTestSchema,
  adminCreateMockTestSectionSchema,
  adminCreateQuestionSchema,
  adminUpdateMockTestSchema,
  adminUpdateMockTestSectionSchema,
  adminUpdateQuestionSchema,
} from "../modules/mock-tests/mock-test.validation";

export const adminMockTestsRouter = Router();

const ensureAdmin = [requireAuth, requireRole(Role.ADMIN)] as const;
const mockRegistrationUploadDir = path.join(resolvePublicAssetsDir(), "uploads", "mock-registrations");
const baseNow = () => new Date();

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  return Number(value) === 1;
};

const parseDataUrl = (dataUrl: string) => {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) {
    throw new AppError("Invalid image format. Use PNG, JPG, JPEG, or WEBP.", 400);
  }
  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  return { mimeType, buffer };
};

const mimeTypeToExtension: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

const uploadBannerSchema = z.object({
  dataUrl: z.string().trim().min(40),
});

const normalizeOptionalText = (value: unknown, max: number) => {
  const text = String(value || "").trim();
  if (!text) return null;
  return text.slice(0, max);
};

const toDateOnly = (value: string | Date | null | undefined): string => {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const resolveMockTestAccessCode = async (mockTestId: string): Promise<"DEMO" | "MOCK" | "LESSON"> => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        (
          SELECT mar.accessCode
          FROM MockTestAccessRule mar
          WHERE mar.mockTestId = mt.id
          ORDER BY mar.updatedAt DESC, mar.createdAt DESC
          LIMIT 1
        ) AS accessCode
      FROM MockTest mt
      WHERE mt.id = ?
      LIMIT 1
    `,
    mockTestId
  )) as Array<{ accessCode: string | null }>;
  const code = String(rows[0]?.accessCode || "DEMO")
    .trim()
    .toUpperCase();
  if (code === "MOCK" || code === "LESSON") return code;
  return "DEMO";
};

const createRegistrationGateSchema = z.object({
  mockTestId: z.string().trim().min(8),
  title: z.string().trim().min(2).max(191),
  description: z.string().trim().max(5000).optional(),
  popupImageUrl: z.string().trim().max(1000).optional(),
  freeAttemptLimit: z.coerce.number().int().min(0).max(100),
  buyNowUrl: z.string().trim().max(1000).optional(),
  ctaLabel: z.string().trim().min(2).max(120).optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduledTimeSlot: z.enum(["09:00", "17:00"]).optional(),
  isActive: z.boolean().optional(),
});

const updateRegistrationGateSchema = createRegistrationGateSchema
  .omit({ mockTestId: true })
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required for update.",
  });

type GateRow = {
  id: string;
  mockTestId: string;
  title: string;
  description: string | null;
  popupImageUrl: string | null;
  freeAttemptLimit: number | string;
  buyNowUrl: string | null;
  ctaLabel: string | null;
  scheduledDate: string | Date | null;
  scheduledTimeSlot: string | null;
  isActive: number | boolean;
  createdBy: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  mockTestTitle: string | null;
  examType: string | null;
  subject: string | null;
  streamChoice: string | null;
  languageMode: string | null;
  registeredCount: number | string;
};

const serializeGate = (row: GateRow) => ({
  id: row.id,
  mockTestId: row.mockTestId,
  title: row.title,
  description: row.description || "",
  popupImageUrl: row.popupImageUrl || "",
  freeAttemptLimit: Number(row.freeAttemptLimit || 0),
  buyNowUrl: row.buyNowUrl || "",
  ctaLabel: row.ctaLabel || "Buy Mock",
  scheduledDate: toDateOnly(row.scheduledDate),
  scheduledTimeSlot: row.scheduledTimeSlot || "",
  isActive: toBoolean(row.isActive),
  createdBy: row.createdBy || null,
  createdAt: new Date(row.createdAt).toISOString(),
  updatedAt: new Date(row.updatedAt).toISOString(),
  mockTestTitle: row.mockTestTitle || "",
  examType: row.examType || "",
  subject: row.subject || "",
  streamChoice: row.streamChoice || "",
  languageMode: row.languageMode || "",
  registeredCount: Number(row.registeredCount || 0),
});

const fetchRegistrationGates = async (includeInactive: boolean) => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        g.id,
        g.mockTestId,
        g.title,
        g.description,
        g.popupImageUrl,
        g.freeAttemptLimit,
        g.buyNowUrl,
        g.ctaLabel,
        g.scheduledDate,
        g.scheduledTimeSlot,
        g.isActive,
        g.createdBy,
        g.createdAt,
        g.updatedAt,
        mt.title AS mockTestTitle,
        mt.examType,
        mt.subject,
        mt.streamChoice,
        mt.languageMode,
        COUNT(DISTINCT e.userId) AS registeredCount
      FROM MockTestRegistrationGate g
      INNER JOIN MockTest mt ON mt.id = g.mockTestId
      LEFT JOIN MockTestRegistrationEntry e ON e.gateId = g.id
      ${includeInactive ? "" : "WHERE g.isActive = 1"}
      GROUP BY
        g.id,
        g.mockTestId,
        g.title,
        g.description,
        g.popupImageUrl,
        g.freeAttemptLimit,
        g.buyNowUrl,
        g.ctaLabel,
        g.scheduledDate,
        g.scheduledTimeSlot,
        g.isActive,
        g.createdBy,
        g.createdAt,
        g.updatedAt,
        mt.title,
        mt.examType,
        mt.subject,
        mt.streamChoice,
        mt.languageMode
      ORDER BY g.updatedAt DESC
    `
  )) as GateRow[];

  return rows.map(serializeGate);
};

adminMockTestsRouter.use("/mock-tests", async (_req, _res, next) => {
  try {
    await ensureMockTestAccessStorageReady();
    next();
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.use("/mock-test-registrations", async (_req, _res, next) => {
  try {
    await ensureMockTestRegistrationStorageReady();
    next();
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.post(
  "/mock-test-registrations/banner-upload",
  ...ensureAdmin,
  async (req, res, next) => {
    try {
      const input = uploadBannerSchema.parse(req.body);
      const { mimeType, buffer } = parseDataUrl(input.dataUrl);
      const extension = mimeTypeToExtension[mimeType];
      const fileName = `${randomUUID()}.${extension}`;
      await mkdir(mockRegistrationUploadDir, { recursive: true });
      const absolutePath = path.join(mockRegistrationUploadDir, fileName);
      await writeFile(absolutePath, buffer);
      res.status(201).json({
        imageUrl: `/public/uploads/mock-registrations/${fileName}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

adminMockTestsRouter.get("/mock-test-registrations", ...ensureAdmin, async (req, res, next) => {
  try {
    const includeInactive = String(req.query.includeInactive || "").trim().toLowerCase();
    const registrations = await fetchRegistrationGates(includeInactive === "1" || includeInactive === "true");
    res.json({ registrations });
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.post("/mock-test-registrations", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = createRegistrationGateSchema.parse(req.body || {});
    const mockTestRows = (await prisma.$queryRawUnsafe(
      `
        SELECT id
        FROM MockTest
        WHERE id = ?
        LIMIT 1
      `,
      input.mockTestId
    )) as Array<{ id: string }>;
    if (!mockTestRows[0]) {
      throw new AppError("Selected mock test was not found.", 404);
    }
    const accessCode = await resolveMockTestAccessCode(input.mockTestId);
    if (accessCode !== "MOCK") {
      throw new AppError("Only MOCK access tests can be linked to mock registration.", 400);
    }

    const existingRows = (await prisma.$queryRawUnsafe(
      `
        SELECT id
        FROM MockTestRegistrationGate
        WHERE mockTestId = ?
        LIMIT 1
      `,
      input.mockTestId
    )) as Array<{ id: string }>;

    const now = baseNow();
    const gateId = existingRows[0]?.id || randomUUID();
    if (existingRows[0]?.id) {
      await prisma.$executeRawUnsafe(
        `
          UPDATE MockTestRegistrationGate
          SET
            title = ?,
            description = ?,
            popupImageUrl = ?,
            freeAttemptLimit = ?,
            buyNowUrl = ?,
            ctaLabel = ?,
            scheduledDate = ?,
            scheduledTimeSlot = ?,
            isActive = ?,
            updatedAt = ?
          WHERE id = ?
        `,
        input.title,
        normalizeOptionalText(input.description, 5000),
        normalizeOptionalText(input.popupImageUrl, 1000),
        Number(input.freeAttemptLimit),
        normalizeOptionalText(input.buyNowUrl, 1000),
        normalizeOptionalText(input.ctaLabel, 120) || "Buy Mock",
        normalizeOptionalText(input.scheduledDate, 10),
        normalizeOptionalText(input.scheduledTimeSlot, 10),
        input.isActive === undefined ? 1 : input.isActive ? 1 : 0,
        now,
        gateId
      );
    } else {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO MockTestRegistrationGate (
            id, mockTestId, title, description, popupImageUrl, freeAttemptLimit, buyNowUrl, ctaLabel, scheduledDate, scheduledTimeSlot, isActive, createdBy, createdAt, updatedAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        gateId,
        input.mockTestId,
        input.title,
        normalizeOptionalText(input.description, 5000),
        normalizeOptionalText(input.popupImageUrl, 1000),
        Number(input.freeAttemptLimit),
        normalizeOptionalText(input.buyNowUrl, 1000),
        normalizeOptionalText(input.ctaLabel, 120) || "Buy Mock",
        normalizeOptionalText(input.scheduledDate, 10),
        normalizeOptionalText(input.scheduledTimeSlot, 10),
        input.isActive === undefined ? 1 : input.isActive ? 1 : 0,
        req.user!.userId,
        now,
        now
      );
    }

    const registrations = await fetchRegistrationGates(true);
    const registration = registrations.find((item) => item.id === gateId);
    res.status(201).json({ registration });
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.patch("/mock-test-registrations/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = updateRegistrationGateSchema.parse(req.body || {});
    const gateId = String(req.params.id || "").trim();
    if (!gateId) throw new AppError("Registration id is required.", 400);

    const existingRows = (await prisma.$queryRawUnsafe(
      `
        SELECT *
        FROM MockTestRegistrationGate
        WHERE id = ?
        LIMIT 1
      `,
      gateId
    )) as Array<{
      id: string;
      title: string;
      description: string | null;
      popupImageUrl: string | null;
      freeAttemptLimit: number;
      buyNowUrl: string | null;
      ctaLabel: string | null;
      scheduledDate: string | Date | null;
      scheduledTimeSlot: string | null;
      isActive: number | boolean;
    }>;
    const existing = existingRows[0];
    if (!existing) throw new AppError("Registration config not found.", 404);

    await prisma.$executeRawUnsafe(
      `
        UPDATE MockTestRegistrationGate
        SET
          title = ?,
          description = ?,
          popupImageUrl = ?,
          freeAttemptLimit = ?,
          buyNowUrl = ?,
          ctaLabel = ?,
          scheduledDate = ?,
          scheduledTimeSlot = ?,
          isActive = ?,
          updatedAt = ?
        WHERE id = ?
      `,
      input.title ?? existing.title,
      input.description !== undefined ? normalizeOptionalText(input.description, 5000) : existing.description,
      input.popupImageUrl !== undefined
        ? normalizeOptionalText(input.popupImageUrl, 1000)
        : existing.popupImageUrl,
      input.freeAttemptLimit !== undefined ? Number(input.freeAttemptLimit) : Number(existing.freeAttemptLimit || 0),
      input.buyNowUrl !== undefined ? normalizeOptionalText(input.buyNowUrl, 1000) : existing.buyNowUrl,
      input.ctaLabel !== undefined
        ? normalizeOptionalText(input.ctaLabel, 120) || "Buy Mock"
        : existing.ctaLabel || "Buy Mock",
      input.scheduledDate !== undefined
        ? normalizeOptionalText(input.scheduledDate, 10)
        : normalizeOptionalText(existing.scheduledDate, 10),
      input.scheduledTimeSlot !== undefined
        ? normalizeOptionalText(input.scheduledTimeSlot, 10)
        : normalizeOptionalText(existing.scheduledTimeSlot, 10),
      input.isActive !== undefined ? (input.isActive ? 1 : 0) : toBoolean(existing.isActive) ? 1 : 0,
      baseNow(),
      gateId
    );

    const registrations = await fetchRegistrationGates(true);
    const registration = registrations.find((item) => item.id === gateId);
    res.json({ registration });
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.delete("/mock-test-registrations/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    const gateId = String(req.params.id || "").trim();
    if (!gateId) throw new AppError("Registration id is required.", 400);
    await prisma.$executeRawUnsafe("DELETE FROM MockTestRegistrationGate WHERE id = ?", gateId);
    res.json({ message: "Registration config deleted." });
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.get("/mock-test-registrations/:id/entries", ...ensureAdmin, async (req, res, next) => {
  try {
    const gateId = String(req.params.id || "").trim();
    if (!gateId) throw new AppError("Registration id is required.", 400);
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          e.id,
          e.gateId,
          e.mockTestId,
          e.userId,
          e.fullName,
          e.mobile,
          e.email,
          e.preferredExamType,
          e.preferredStreamChoice,
          e.preferredDate,
          e.preferredTimeSlot,
          e.createdAt,
          e.updatedAt,
          u.name AS userName,
          u.mobile AS userMobile,
          u.email AS userEmail,
          (
            SELECT COUNT(*)
            FROM Attempt a
            WHERE a.userId = e.userId
              AND a.mockTestId = e.mockTestId
          ) AS usedAttempts
        FROM MockTestRegistrationEntry e
        LEFT JOIN User u ON u.id = e.userId
        WHERE e.gateId = ?
        ORDER BY e.createdAt DESC
      `,
      gateId
    )) as Array<{
      id: string;
      gateId: string;
      mockTestId: string;
      userId: string;
      fullName: string;
      mobile: string;
      email: string | null;
      preferredExamType: string | null;
      preferredStreamChoice: string | null;
      preferredDate: string | Date | null;
      preferredTimeSlot: string | null;
      createdAt: Date | string;
      updatedAt: Date | string;
      userName: string | null;
      userMobile: string | null;
      userEmail: string | null;
      usedAttempts: number | string;
    }>;

    res.json({
      entries: rows.map((row) => ({
        id: row.id,
        gateId: row.gateId,
        mockTestId: row.mockTestId,
        userId: row.userId,
        fullName: row.fullName,
        mobile: row.mobile,
        email: row.email || "",
        preferredExamType: row.preferredExamType || "",
        preferredStreamChoice: row.preferredStreamChoice || "",
        preferredDate: toDateOnly(row.preferredDate),
        preferredTimeSlot: row.preferredTimeSlot || "",
        userName: row.userName || "",
        userMobile: row.userMobile || "",
        userEmail: row.userEmail || "",
        usedAttempts: Number(row.usedAttempts || 0),
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
      })),
    });
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

adminMockTestsRouter.get("/mock-tests/:id/sections", ...ensureAdmin, async (req, res, next) => {
  try {
    const sections = await mockTestService.listSections(req.params.id);
    res.json({ sections });
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.post("/mock-tests/:id/sections", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = adminCreateMockTestSectionSchema.parse(req.body);
    const section = await mockTestService.createSection(req.params.id, input);
    res.status(201).json({ section });
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

adminMockTestsRouter.patch("/mock-test-sections/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    const updates = adminUpdateMockTestSectionSchema.parse(req.body);
    const section = await mockTestService.updateSection(req.params.id, updates);
    res.json({ section });
  } catch (error) {
    next(error);
  }
});

adminMockTestsRouter.delete("/mock-test-sections/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    await mockTestService.deleteSection(req.params.id);
    res.json({ message: "Section deleted" });
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
