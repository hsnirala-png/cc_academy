import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { mockTestService } from "../modules/mock-tests/mock-test.service";
import { ensureMockTestAccessStorageReady } from "../utils/mockTestAccessStorage";
import { ensureMockTestRegistrationStorageReady } from "../utils/mockTestRegistrationStorage";
import { AppError } from "../utils/appError";
import { prisma } from "../utils/prisma";
import {
  studentMockTestsQuerySchema,
  studentSaveAnswerSchema,
  studentStartAttemptSchema,
} from "../modules/mock-tests/mock-test.validation";

export const studentMockTestsRouter = Router();

const ensureStudent = [requireAuth, requireRole(Role.STUDENT, Role.ADMIN)] as const;
const registrationPagePath = "./mock-test-registration.html";

const registerForMockSchema = z.object({
  fullName: z.string().trim().min(2).max(191),
  mobile: z.string().trim().min(8).max(30),
  email: z.string().trim().email().max(191).optional(),
  preferredExamType: z.enum(["PSTET_1", "PSTET_2"]).optional(),
  preferredStreamChoice: z.enum(["SOCIAL_STUDIES", "SCIENCE_MATH"]).optional(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preferredTimeSlot: z.enum(["09:00", "17:00"]).optional(),
});

type RegistrationGateRow = {
  id: string;
  mockTestId: string;
  title: string;
  description: string | null;
  popupImageUrl: string | null;
  mockThumbnailUrl?: string | null;
  freeAttemptLimit: number | string;
  buyNowUrl: string | null;
  ctaLabel: string | null;
  isActive: number | boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  mockTestTitle?: string | null;
  examType?: string | null;
  subject?: string | null;
  streamChoice?: string | null;
  languageMode?: string | null;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  return Number(value) === 1;
};

const resolveStreamChoice = (streamChoice: unknown, subject: unknown): string => {
  const normalizedStream = String(streamChoice || "")
    .trim()
    .toUpperCase();
  if (normalizedStream === "SCIENCE_MATH" || normalizedStream === "SOCIAL_STUDIES") return normalizedStream;
  const normalizedSubject = String(subject || "")
    .trim()
    .toUpperCase();
  if (normalizedSubject === "SCIENCE_MATH" || normalizedSubject === "SOCIAL_STUDIES") return normalizedSubject;
  return "";
};

const toDateOnly = (value: string | Date | null | undefined): string => {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const loadActiveRegistrationGates = async (mockTestIds: string[]) => {
  if (!mockTestIds.length) return new Map<string, RegistrationGateRow>();
  const placeholders = mockTestIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        g.id,
        g.mockTestId,
        g.title,
        g.description,
        g.popupImageUrl,
        (
          SELECT p.thumbnailUrl
          FROM ProductMockTest pmt
          INNER JOIN Product p ON p.id = pmt.productId
          WHERE pmt.mockTestId = mt.id
          ORDER BY p.updatedAt DESC, p.createdAt DESC
          LIMIT 1
        ) AS mockThumbnailUrl,
        g.freeAttemptLimit,
        g.buyNowUrl,
        g.ctaLabel,
        g.isActive,
        g.createdAt,
        g.updatedAt,
        mt.title AS mockTestTitle,
        mt.examType,
        mt.subject,
        mt.streamChoice,
        mt.languageMode
      FROM MockTestRegistrationGate g
      INNER JOIN MockTest mt ON mt.id = g.mockTestId
      WHERE g.isActive = 1
        AND COALESCE(
          (
            SELECT mar.accessCode
            FROM MockTestAccessRule mar
            WHERE mar.mockTestId = mt.id
            ORDER BY mar.updatedAt DESC, mar.createdAt DESC
            LIMIT 1
          ),
          'DEMO'
        ) = 'MOCK'
        AND g.mockTestId IN (${placeholders})
    `,
    ...mockTestIds
  )) as RegistrationGateRow[];
  return new Map(rows.map((row) => [row.mockTestId, row]));
};

const loadAllActiveRegistrationGates = async () => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        g.id,
        g.mockTestId,
        g.title,
        g.description,
        g.popupImageUrl,
        (
          SELECT p.thumbnailUrl
          FROM ProductMockTest pmt
          INNER JOIN Product p ON p.id = pmt.productId
          WHERE pmt.mockTestId = mt.id
          ORDER BY p.updatedAt DESC, p.createdAt DESC
          LIMIT 1
        ) AS mockThumbnailUrl,
        g.freeAttemptLimit,
        g.buyNowUrl,
        g.ctaLabel,
        g.isActive,
        g.createdAt,
        g.updatedAt,
        mt.title AS mockTestTitle,
        mt.examType,
        mt.subject,
        mt.streamChoice,
        mt.languageMode
      FROM MockTestRegistrationGate g
      INNER JOIN MockTest mt ON mt.id = g.mockTestId
      WHERE g.isActive = 1
        AND mt.isActive = 1
        AND COALESCE(
          (
            SELECT mar.accessCode
            FROM MockTestAccessRule mar
            WHERE mar.mockTestId = mt.id
            ORDER BY mar.updatedAt DESC, mar.createdAt DESC
            LIMIT 1
          ),
          'DEMO'
        ) = 'MOCK'
      ORDER BY mt.examType ASC, g.updatedAt DESC
    `
  )) as RegistrationGateRow[];
  return rows;
};

type RegistrationEntryDetails = {
  isRegistered: boolean;
  preferredExamType: string;
  preferredStreamChoice: string;
  preferredDate: string;
  preferredTimeSlot: string;
};

const loadUserRegistrationEntries = async (userId: string, gateIds: string[]) => {
  if (!gateIds.length) return new Map<string, RegistrationEntryDetails>();
  const placeholders = gateIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT gateId, preferredExamType, preferredStreamChoice, preferredDate, preferredTimeSlot
      FROM MockTestRegistrationEntry
      WHERE userId = ?
        AND gateId IN (${placeholders})
    `,
    userId,
    ...gateIds
  )) as Array<{
    gateId: string;
    preferredExamType: string | null;
    preferredStreamChoice: string | null;
    preferredDate: string | Date | null;
    preferredTimeSlot: string | null;
  }>;
  return new Map(
    rows.map((row) => [
      row.gateId,
      {
        isRegistered: true,
        preferredExamType: row.preferredExamType || "",
        preferredStreamChoice: row.preferredStreamChoice || "",
        preferredDate: toDateOnly(row.preferredDate),
        preferredTimeSlot: row.preferredTimeSlot || "",
      },
    ])
  );
};

const loadUsedAttemptCountMap = async (userId: string, mockTestIds: string[]) => {
  if (!mockTestIds.length) return new Map<string, number>();
  const placeholders = mockTestIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT mockTestId, COUNT(*) AS usedAttempts
      FROM Attempt
      WHERE userId = ?
        AND mockTestId IN (${placeholders})
      GROUP BY mockTestId
    `,
    userId,
    ...mockTestIds
  )) as Array<{ mockTestId: string; usedAttempts: number | string }>;
  return new Map(rows.map((row) => [row.mockTestId, Number(row.usedAttempts || 0)]));
};

const hasPaidAccessForMockTest = async (userId: string, mockTestId: string) => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT pmt.mockTestId
      FROM ProductMockTest pmt
      WHERE pmt.mockTestId = ?
        AND pmt.productId IN (
          SELECT pp.productId FROM ProductPurchase pp WHERE pp.userId = ?
          UNION
          SELECT spa.productId FROM StudentProductAccess spa WHERE spa.userId = ?
        )
      LIMIT 1
    `,
    mockTestId,
    userId,
    userId
  )) as Array<{ mockTestId: string }>;
  return Boolean(rows[0]);
};

const loadPaidAccessMockTestSet = async (userId: string, mockTestIds: string[]) => {
  if (!mockTestIds.length) return new Set<string>();
  const placeholders = mockTestIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT DISTINCT pmt.mockTestId
      FROM ProductMockTest pmt
      WHERE pmt.mockTestId IN (${placeholders})
        AND pmt.productId IN (
          SELECT pp.productId FROM ProductPurchase pp WHERE pp.userId = ?
          UNION
          SELECT spa.productId FROM StudentProductAccess spa WHERE spa.userId = ?
        )
    `,
    ...mockTestIds,
    userId,
    userId
  )) as Array<{ mockTestId: string }>;
  return new Set(rows.map((row) => row.mockTestId));
};

studentMockTestsRouter.use(async (_req, _res, next) => {
  try {
    await Promise.all([
      ensureMockTestAccessStorageReady(),
      ensureMockTestRegistrationStorageReady(),
    ]);
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

    const mockTestIds = mockTests.map((item) => item.id);
    const gateMap = await loadActiveRegistrationGates(mockTestIds);
    const gateIds = Array.from(gateMap.values()).map((item) => item.id);
    const [entryMap, usedAttemptMap, paidAccessSet] = await Promise.all([
      loadUserRegistrationEntries(req.user!.userId, gateIds),
      loadUsedAttemptCountMap(req.user!.userId, mockTestIds),
      loadPaidAccessMockTestSet(req.user!.userId, mockTestIds),
    ]);

    const enrichedMockTests = mockTests.map((item) => {
      const gate = gateMap.get(item.id);
      if (!gate) return item;
      const freeAttemptLimit = Math.max(0, Number(gate.freeAttemptLimit || 0));
      const usedAttempts = Math.max(0, usedAttemptMap.get(item.id) || 0);
      const hasPaidAccess = paidAccessSet.has(item.id);
      const entry = entryMap.get(gate.id);
      const remainingAttempts = hasPaidAccess
        ? Number.MAX_SAFE_INTEGER
        : Math.max(0, freeAttemptLimit - usedAttempts);
      const registration = {
        enabled: true,
        gateId: gate.id,
        mockTestTitle: gate.mockTestTitle || item.title,
        examType: gate.examType || item.examType,
        subject: gate.subject || item.subject,
        streamChoice: resolveStreamChoice(gate.streamChoice || item.streamChoice, gate.subject || item.subject),
        languageMode: gate.languageMode || item.languageMode || "",
        title: gate.title,
        description: gate.description || "",
        popupImageUrl: gate.popupImageUrl || "",
        mockThumbnailUrl: gate.mockThumbnailUrl || "",
        freeAttemptLimit,
        usedAttempts,
        remainingAttempts,
        hasPaidAccess,
        isRegistered: Boolean(entry?.isRegistered),
        preferredExamType: entry?.preferredExamType || "",
        preferredStreamChoice: entry?.preferredStreamChoice || "",
        preferredDate: entry?.preferredDate || "",
        preferredTimeSlot: entry?.preferredTimeSlot || "",
        buyNowUrl: gate.buyNowUrl || "",
        ctaLabel: gate.ctaLabel || "Buy Mock",
        registrationPageUrl: `${registrationPagePath}?mockTestId=${encodeURIComponent(item.id)}`,
      };
      return {
        ...item,
        registration,
      };
    });
    res.json({ mockTests: enrichedMockTests });
  } catch (error) {
    next(error);
  }
});

studentMockTestsRouter.get("/mock-registrations/options", ...ensureStudent, async (req, res, next) => {
  try {
    const gates = await loadAllActiveRegistrationGates();
    const mockTestIds = gates.map((item) => item.mockTestId);
    const gateIds = gates.map((item) => item.id);

    const [entryMap, usedAttemptMap, paidAccessSet] = await Promise.all([
      loadUserRegistrationEntries(req.user!.userId, gateIds),
      loadUsedAttemptCountMap(req.user!.userId, mockTestIds),
      loadPaidAccessMockTestSet(req.user!.userId, mockTestIds),
    ]);

    const options = gates.map((gate) => {
      const freeAttemptLimit = Math.max(0, Number(gate.freeAttemptLimit || 0));
      const usedAttempts = Math.max(0, usedAttemptMap.get(gate.mockTestId) || 0);
      const hasPaidAccess = paidAccessSet.has(gate.mockTestId);
      const entry = entryMap.get(gate.id);
      const remainingAttempts = hasPaidAccess
        ? Number.MAX_SAFE_INTEGER
        : Math.max(0, freeAttemptLimit - usedAttempts);
      return {
        gateId: gate.id,
        mockTestId: gate.mockTestId,
        mockTestTitle: gate.mockTestTitle || "",
        examType: gate.examType || "",
        subject: gate.subject || "",
        streamChoice: resolveStreamChoice(gate.streamChoice, gate.subject),
        languageMode: gate.languageMode || "",
        title: gate.title,
        description: gate.description || "",
        popupImageUrl: gate.popupImageUrl || "",
        mockThumbnailUrl: gate.mockThumbnailUrl || "",
        freeAttemptLimit,
        usedAttempts,
        remainingAttempts,
        hasPaidAccess,
        isRegistered: Boolean(entry?.isRegistered),
        preferredExamType: entry?.preferredExamType || "",
        preferredStreamChoice: entry?.preferredStreamChoice || "",
        preferredDate: entry?.preferredDate || "",
        preferredTimeSlot: entry?.preferredTimeSlot || "",
        buyNowUrl: gate.buyNowUrl || "",
        ctaLabel: gate.ctaLabel || "Buy Mock",
        registrationPageUrl: `${registrationPagePath}?mockTestId=${encodeURIComponent(gate.mockTestId)}`,
      };
    });

    res.json({ options });
  } catch (error) {
    next(error);
  }
});

studentMockTestsRouter.get("/mock-tests/:mockTestId/registration", ...ensureStudent, async (req, res, next) => {
  try {
    const mockTestId = String(req.params.mockTestId || "").trim();
    if (!mockTestId) throw new AppError("Mock test id is required.", 400);

    const gateMap = await loadActiveRegistrationGates([mockTestId]);
    const gate = gateMap.get(mockTestId);
    if (!gate) {
      res.json({ registration: null });
      return;
    }

    const [entryMap, usedAttemptMap, paidAccess] = await Promise.all([
      loadUserRegistrationEntries(req.user!.userId, [gate.id]),
      loadUsedAttemptCountMap(req.user!.userId, [mockTestId]),
      hasPaidAccessForMockTest(req.user!.userId, mockTestId),
    ]);
    const freeAttemptLimit = Math.max(0, Number(gate.freeAttemptLimit || 0));
    const usedAttempts = Math.max(0, usedAttemptMap.get(mockTestId) || 0);
    const entry = entryMap.get(gate.id);
    const remainingAttempts = paidAccess ? Number.MAX_SAFE_INTEGER : Math.max(0, freeAttemptLimit - usedAttempts);

    res.json({
      registration: {
        enabled: true,
        gateId: gate.id,
        mockTestId,
        mockTestTitle: gate.mockTestTitle || "",
        examType: gate.examType || "",
        subject: gate.subject || "",
        streamChoice: resolveStreamChoice(gate.streamChoice, gate.subject),
        languageMode: gate.languageMode || "",
        title: gate.title,
        description: gate.description || "",
        popupImageUrl: gate.popupImageUrl || "",
        mockThumbnailUrl: gate.mockThumbnailUrl || "",
        freeAttemptLimit,
        usedAttempts,
        remainingAttempts,
        isRegistered: Boolean(entry?.isRegistered),
        preferredExamType: entry?.preferredExamType || "",
        preferredStreamChoice: entry?.preferredStreamChoice || "",
        preferredDate: entry?.preferredDate || "",
        preferredTimeSlot: entry?.preferredTimeSlot || "",
        hasPaidAccess: paidAccess,
        buyNowUrl: gate.buyNowUrl || "",
        ctaLabel: gate.ctaLabel || "Buy Mock",
        registrationPageUrl: `${registrationPagePath}?mockTestId=${encodeURIComponent(mockTestId)}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

studentMockTestsRouter.post("/mock-tests/:mockTestId/register", ...ensureStudent, async (req, res, next) => {
  try {
    const input = registerForMockSchema.parse(req.body || {});
    const mockTestId = String(req.params.mockTestId || "").trim();
    if (!mockTestId) throw new AppError("Mock test id is required.", 400);

    const gateMap = await loadActiveRegistrationGates([mockTestId]);
    const gate = gateMap.get(mockTestId);
    if (!gate) {
      throw new AppError("Registration is not enabled for this mock test.", 404);
    }
    const gateExamType = String(gate.examType || "").trim().toUpperCase();
    const gateSubject = String(gate.subject || "").trim().toUpperCase();
    const gateStream = String(gate.streamChoice || "").trim().toUpperCase();
    const derivedGateStreamChoice =
      gateStream === "SCIENCE_MATH" || gateStream === "SOCIAL_STUDIES"
        ? gateStream
        : gateSubject === "SCIENCE_MATH" || gateSubject === "SOCIAL_STUDIES"
        ? gateSubject
        : "";
    const effectiveExamType = String(input.preferredExamType || gateExamType || "PSTET_1")
      .trim()
      .toUpperCase() as "PSTET_1" | "PSTET_2";
    const effectiveStreamChoice = String(
      input.preferredStreamChoice || derivedGateStreamChoice || ""
    )
      .trim()
      .toUpperCase();
    const effectiveDate = String(
      input.preferredDate || new Date().toISOString().slice(0, 10)
    ).trim();
    const effectiveTimeSlot = String(input.preferredTimeSlot || "09:00").trim() as "09:00" | "17:00";
    if (gateExamType && gateExamType !== effectiveExamType) {
      throw new AppError("Selected exam does not match this mock registration.", 400);
    }
    if (effectiveExamType !== "PSTET_2" && effectiveStreamChoice) {
      throw new AppError("PSTET-2 subject selection is allowed only for PSTET-2.", 400);
    }

    const now = new Date();
    const preferredDate = new Date(`${effectiveDate}T00:00:00.000Z`);
    if (Number.isNaN(preferredDate.getTime())) {
      throw new AppError("Please select a valid date.", 400);
    }
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO MockTestRegistrationEntry (
          id, gateId, mockTestId, userId, fullName, mobile, email, preferredExamType, preferredStreamChoice, preferredDate, preferredTimeSlot, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          fullName = VALUES(fullName),
          mobile = VALUES(mobile),
          email = VALUES(email),
          preferredExamType = VALUES(preferredExamType),
          preferredStreamChoice = VALUES(preferredStreamChoice),
          preferredDate = VALUES(preferredDate),
          preferredTimeSlot = VALUES(preferredTimeSlot),
          updatedAt = VALUES(updatedAt)
      `,
      `${req.user!.userId}:${gate.id}`,
      gate.id,
      mockTestId,
      req.user!.userId,
      input.fullName.trim(),
      input.mobile.trim(),
      input.email ? input.email.trim() : null,
      effectiveExamType,
      effectiveStreamChoice || null,
      preferredDate,
      effectiveTimeSlot,
      now,
      now
    );

    res.status(201).json({ message: "Registration saved." });
  } catch (error) {
    next(error);
  }
});

studentMockTestsRouter.get("/mock-tests/:mockTestId/lesson-context", ...ensureStudent, async (req, res, next) => {
  try {
    const lesson = await mockTestService.getLessonContextForMockTest(
      req.params.mockTestId,
      req.user!.userId
    );
    res.json({ lesson });
  } catch (error) {
    next(error);
  }
});

studentMockTestsRouter.post("/attempts", ...ensureStudent, async (req, res, next) => {
  try {
    const input = studentStartAttemptSchema.parse(req.body);
    const gateMap = await loadActiveRegistrationGates([input.mockTestId]);
    const gate = gateMap.get(input.mockTestId);
    if (gate) {
      const [entryMap, usedAttemptMap, paidAccess] = await Promise.all([
        loadUserRegistrationEntries(req.user!.userId, [gate.id]),
        loadUsedAttemptCountMap(req.user!.userId, [input.mockTestId]),
        hasPaidAccessForMockTest(req.user!.userId, input.mockTestId),
      ]);
      const entry = entryMap.get(gate.id);
      const isRegistered = Boolean(entry?.isRegistered);
      if (!isRegistered) {
        throw new AppError(
          "Please complete mock registration first.",
          403,
          "MOCK_REG_REQUIRED",
          {
            mockTestId: input.mockTestId,
            registrationPageUrl: `${registrationPagePath}?mockTestId=${encodeURIComponent(input.mockTestId)}`,
            popupImageUrl: gate.popupImageUrl || "",
          }
        );
      }

      if (!paidAccess) {
        const freeAttemptLimit = Math.max(0, Number(gate.freeAttemptLimit || 0));
        const usedAttempts = Math.max(0, usedAttemptMap.get(input.mockTestId) || 0);
        if (usedAttempts >= freeAttemptLimit) {
          throw new AppError(
            "Free attempt limit reached for this mock test. Please buy the mock to continue.",
            402,
            "MOCK_ATTEMPTS_EXHAUSTED",
            {
              mockTestId: input.mockTestId,
              freeAttemptLimit,
              usedAttempts,
              buyNowUrl: gate.buyNowUrl || "",
              ctaLabel: gate.ctaLabel || "Buy Mock",
            }
          );
        }
      }
    }

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
