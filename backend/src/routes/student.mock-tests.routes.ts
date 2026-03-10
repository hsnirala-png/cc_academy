import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { mockTestService } from "../modules/mock-tests/mock-test.service";
import { ensureMockTestAccessStorageReady } from "../utils/mockTestAccessStorage";
import { ensureMockTestRegistrationStorageReady } from "../utils/mockTestRegistrationStorage";
import { getEffectiveAccessibleProductIds, loadAccessibleMockTestIdsForUser } from "../utils/productCombos";
import { AppError } from "../utils/appError";
import { prisma } from "../utils/prisma";
import { ensureUserReferralCode, getReferrerIdByCode } from "../modules/referrals/referral.utils";
import {
  studentMockTestsQuerySchema,
  studentSaveAnswerSchema,
  studentStartAttemptSchema,
} from "../modules/mock-tests/mock-test.validation";

export const studentMockTestsRouter = Router();

const ensureStudent = [requireAuth, requireRole(Role.STUDENT, Role.ADMIN)] as const;
const registrationPagePath = "./mock-test-registration.html";
const DAILY_ATTEMPT_LIMIT = 2;

const registerForMockSchema = z.object({
  fullName: z.string().trim().min(2).max(191),
  mobile: z.string().trim().min(8).max(30),
  email: z.string().trim().email().max(191),
  friendReferralCode: z.string().trim().max(64).optional(),
  noFriendReferralCode: z.coerce.boolean().optional(),
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
  scheduledDate?: string | Date | null;
  scheduledTimeSlot?: string | null;
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
  mockCategory?: string | null;
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

const normalizeMockCategory = (value: unknown): "FREE" | "PREMIUM" => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return normalized === "FREE" ? "FREE" : "PREMIUM";
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
        g.scheduledDate,
        g.scheduledTimeSlot,
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
        mt.languageMode,
        COALESCE(
          (
            SELECT mar.mockCategory
            FROM MockTestAccessRule mar
            WHERE mar.mockTestId = mt.id
            ORDER BY mar.updatedAt DESC, mar.createdAt DESC
            LIMIT 1
          ),
          'PREMIUM'
        ) AS mockCategory
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
        g.scheduledDate,
        g.scheduledTimeSlot,
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
        mt.languageMode,
        COALESCE(
          (
            SELECT mar.mockCategory
            FROM MockTestAccessRule mar
            WHERE mar.mockTestId = mt.id
            ORDER BY mar.updatedAt DESC, mar.createdAt DESC
            LIMIT 1
          ),
          'PREMIUM'
        ) AS mockCategory
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
  friendReferralCode: string;
  noFriendReferralCode: boolean;
  referredByUserId: string;
};

type UserRegistrationProgram = {
  hasJoined: boolean;
  joinedAt: Date | null;
  profile: {
    fullName: string;
    mobile: string;
    email: string;
    preferredExamType: string;
    preferredStreamChoice: string;
    preferredDate: string;
    preferredTimeSlot: string;
    friendReferralCode: string;
    noFriendReferralCode: boolean;
    referredByUserId: string;
  } | null;
};

type LatestSubmittedAttemptSummary = {
  attemptId: string;
  scorePercent: number;
  submittedAt: string;
};

const IST_OFFSET_MINUTES = 330;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

const getIstDayWindow = (value: Date | number | string = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const utcTime = date.getTime();
  const istTime = utcTime + IST_OFFSET_MINUTES * 60 * 1000;
  const dayStartIst = Math.floor(istTime / MILLIS_PER_DAY) * MILLIS_PER_DAY;
  return {
    startUtc: new Date(dayStartIst - IST_OFFSET_MINUTES * 60 * 1000),
    endUtc: new Date(dayStartIst + MILLIS_PER_DAY - IST_OFFSET_MINUTES * 60 * 1000),
  };
};

const toScheduleTimestamp = (dateValue: unknown, timeValue: unknown): number => {
  const dateText = String(dateValue || "").trim();
  const timeText = String(timeValue || "").trim();
  if (!dateText) return Number.NaN;
  const normalizedTime = /^\d{2}:\d{2}$/.test(timeText) ? timeText : "00:00";
  const stamp = Date.parse(`${dateText}T${normalizedTime}:00+05:30`);
  return Number.isFinite(stamp) ? stamp : Number.NaN;
};

const isGatePublished = (gate: Pick<RegistrationGateRow, "scheduledDate" | "scheduledTimeSlot">): boolean => {
  const stamp = toScheduleTimestamp(gate.scheduledDate, gate.scheduledTimeSlot);
  if (!Number.isFinite(stamp)) return true;
  return stamp <= Date.now();
};

const getIstDayNumber = (value: Date | string | number): number => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return Number.NaN;
  return Math.floor((date.getTime() + IST_OFFSET_MINUTES * 60 * 1000) / MILLIS_PER_DAY);
};

const resolveFreeAttemptLimit = (gate: Pick<RegistrationGateRow, "freeAttemptLimit" | "mockCategory">) => {
  const configured = Math.max(0, Number(gate.freeAttemptLimit || 0));
  return normalizeMockCategory(gate.mockCategory) === "FREE" ? Math.max(1, configured || 1) : configured;
};

const loadUserRegistrationEntries = async (userId: string, gateIds: string[]) => {
  if (!gateIds.length) return new Map<string, RegistrationEntryDetails>();
  const placeholders = gateIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT gateId, preferredExamType, preferredStreamChoice, preferredDate, preferredTimeSlot, friendReferralCode, noFriendReferral, referredByUserId
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
    friendReferralCode: string | null;
    noFriendReferral: number | boolean | null;
    referredByUserId: string | null;
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
        friendReferralCode: row.friendReferralCode || "",
        noFriendReferralCode: toBoolean(row.noFriendReferral),
        referredByUserId: row.referredByUserId || "",
      },
    ])
  );
};

const hasAnyUserRegistrationEntry = async (userId: string) => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT gateId
      FROM MockTestRegistrationEntry
      WHERE userId = ?
      LIMIT 1
    `,
    userId
  )) as Array<{ gateId: string }>;
  return Boolean(rows[0]);
};

const loadUserRegistrationProgram = async (userId: string): Promise<UserRegistrationProgram> => {
  const joinedRows = (await prisma.$queryRawUnsafe(
    `
      SELECT createdAt
      FROM MockTestRegistrationEntry
      WHERE userId = ?
      ORDER BY createdAt ASC
      LIMIT 1
    `,
    userId
  )) as Array<{ createdAt: Date | string }>;
  const profileRows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        fullName,
        mobile,
        email,
        preferredExamType,
        preferredStreamChoice,
        preferredDate,
        preferredTimeSlot,
        friendReferralCode,
        noFriendReferral,
        referredByUserId
      FROM MockTestRegistrationEntry
      WHERE userId = ?
      ORDER BY updatedAt DESC, createdAt DESC
      LIMIT 1
    `,
    userId
  )) as Array<{
    fullName: string | null;
    mobile: string | null;
    email: string | null;
    preferredExamType: string | null;
    preferredStreamChoice: string | null;
    preferredDate: string | Date | null;
    preferredTimeSlot: string | null;
    friendReferralCode: string | null;
    noFriendReferral: number | boolean | null;
    referredByUserId: string | null;
  }>;
  const joinedAtRaw = joinedRows[0]?.createdAt;
  const joinedAt = joinedAtRaw ? new Date(joinedAtRaw) : null;
  const profileRow = profileRows[0];
  return {
    hasJoined: Boolean(joinedAt),
    joinedAt: joinedAt && !Number.isNaN(joinedAt.getTime()) ? joinedAt : null,
    profile: profileRow
      ? {
          fullName: String(profileRow.fullName || "").trim(),
          mobile: String(profileRow.mobile || "").trim(),
          email: String(profileRow.email || "").trim(),
          preferredExamType: String(profileRow.preferredExamType || "").trim(),
          preferredStreamChoice: String(profileRow.preferredStreamChoice || "").trim(),
          preferredDate: toDateOnly(profileRow.preferredDate),
          preferredTimeSlot: String(profileRow.preferredTimeSlot || "").trim(),
          friendReferralCode: String(profileRow.friendReferralCode || "").trim(),
          noFriendReferralCode: toBoolean(profileRow.noFriendReferral),
          referredByUserId: String(profileRow.referredByUserId || "").trim(),
        }
      : null,
  };
};

const loadReferralBonusCountMap = async (userId: string, gateIds: string[]) => {
  if (!gateIds.length) return new Map<string, number>();
  const placeholders = gateIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT gateId, COUNT(*) AS referralWins
      FROM MockTestRegistrationReferralBonus
      WHERE referrerUserId = ?
        AND gateId IN (${placeholders})
      GROUP BY gateId
    `,
    userId,
    ...gateIds
  )) as Array<{ gateId: string; referralWins: number | string }>;
  return new Map(rows.map((row) => [row.gateId, Number(row.referralWins || 0)]));
};

const loadInProgressAttemptSet = async (userId: string, mockTestIds: string[]) => {
  if (!mockTestIds.length) return new Set<string>();
  const placeholders = mockTestIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT DISTINCT mockTestId
      FROM Attempt
      WHERE userId = ?
        AND status = 'IN_PROGRESS'
        AND mockTestId IN (${placeholders})
    `,
    userId,
    ...mockTestIds
  )) as Array<{ mockTestId: string }>;
  return new Set(rows.map((row) => row.mockTestId));
};

const loadTodayAttemptCount = async (userId: string, mockTestIds: string[]) => {
  if (!mockTestIds.length) return 0;
  const placeholders = mockTestIds.map(() => "?").join(", ");
  const { startUtc, endUtc } = getIstDayWindow();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT COUNT(*) AS attemptCount
      FROM Attempt
      WHERE userId = ?
        AND mockTestId IN (${placeholders})
        AND startedAt >= ?
        AND startedAt < ?
    `,
    userId,
    ...mockTestIds,
    startUtc,
    endUtc
  )) as Array<{ attemptCount: number | string }>;
  return Math.max(0, Number(rows[0]?.attemptCount || 0));
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

const loadAttemptedMockTestIds = async (userId: string, mockTestIds: string[]) => {
  if (!mockTestIds.length) return new Set<string>();
  const placeholders = mockTestIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT DISTINCT mockTestId
      FROM Attempt
      WHERE userId = ?
        AND mockTestId IN (${placeholders})
    `,
    userId,
    ...mockTestIds
  )) as Array<{ mockTestId: string }>;
  return new Set(rows.map((row) => row.mockTestId));
};

const loadLatestSubmittedAttemptMap = async (userId: string, mockTestIds: string[]) => {
  if (!mockTestIds.length) return new Map<string, LatestSubmittedAttemptSummary>();
  const placeholders = mockTestIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT id, mockTestId, scorePercent, submittedAt
      FROM Attempt
      WHERE userId = ?
        AND status = 'SUBMITTED'
        AND mockTestId IN (${placeholders})
      ORDER BY submittedAt DESC, startedAt DESC
    `,
    userId,
    ...mockTestIds
  )) as Array<{
    id: string;
    mockTestId: string;
    scorePercent: number | string | null;
    submittedAt: Date | string | null;
  }>;
  const map = new Map<string, LatestSubmittedAttemptSummary>();
  rows.forEach((row) => {
    if (map.has(row.mockTestId)) return;
    map.set(row.mockTestId, {
      attemptId: row.id,
      scorePercent: Number(row.scorePercent || 0),
      submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : "",
    });
  });
  return map;
};

const hasInProgressAttemptForMockTest = async (userId: string, mockTestId: string) => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT id
      FROM Attempt
      WHERE userId = ?
        AND mockTestId = ?
        AND status = 'IN_PROGRESS'
      ORDER BY startedAt DESC
      LIMIT 1
    `,
    userId,
    mockTestId
  )) as Array<{ id: string }>;
  return Boolean(rows[0]?.id);
};

const ensureGateEntryForJoinedUser = async (
  userId: string,
  gate: RegistrationGateRow,
  program: UserRegistrationProgram,
  fallback: { fullName: string; mobile: string; email: string }
) => {
  if (!program.profile) return;
  const now = new Date();
  const effectiveDate = String(
    toDateOnly(gate.scheduledDate) || program.profile.preferredDate || new Date().toISOString().slice(0, 10)
  ).trim();
  const effectiveTimeSlot = String(
    gate.scheduledTimeSlot || program.profile.preferredTimeSlot || "09:00"
  ).trim() as "09:00" | "17:00";
  const preferredDate = new Date(`${effectiveDate}T00:00:00.000Z`);
  if (Number.isNaN(preferredDate.getTime())) {
    throw new AppError("Please select a valid date.", 400);
  }

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO MockTestRegistrationEntry (
        id, gateId, mockTestId, userId, fullName, mobile, email, friendReferralCode, referredByUserId, noFriendReferral, preferredExamType, preferredStreamChoice, preferredDate, preferredTimeSlot, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    `${userId}:${gate.id}`,
    gate.id,
    gate.mockTestId,
    userId,
    program.profile.fullName || fallback.fullName,
    program.profile.mobile || fallback.mobile,
    program.profile.email || fallback.email,
    program.profile.friendReferralCode || null,
    program.profile.referredByUserId || null,
    program.profile.noFriendReferralCode ? 1 : 0,
    program.profile.preferredExamType || String(gate.examType || "").trim().toUpperCase() || "PSTET_1",
    program.profile.preferredStreamChoice || resolveStreamChoice(gate.streamChoice, gate.subject) || null,
    preferredDate,
    effectiveTimeSlot,
    now,
    now
  );
};

const loadUserBasicProfile = async (userId: string) => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT name, mobile, email
      FROM User
      WHERE id = ?
      LIMIT 1
    `,
    userId
  )) as Array<{ name: string | null; mobile: string | null; email: string | null }>;
  const row = rows[0];
  return {
    fullName: String(row?.name || "").trim(),
    mobile: String(row?.mobile || "").trim(),
    email: String(row?.email || "").trim(),
  };
};

const hasPaidAccessForMockTest = async (userId: string, mockTestId: string) => {
  const paidAccessSet = await loadAccessibleMockTestIdsForUser(userId, [mockTestId]);
  return paidAccessSet.has(mockTestId);
};

const loadPaidAccessMockTestSet = async (userId: string, mockTestIds: string[]) => {
  return loadAccessibleMockTestIdsForUser(userId, mockTestIds);
};

const loadHasAnyPremiumAccess = async (userId: string) => {
  const accessibleProductIds = await getEffectiveAccessibleProductIds(userId);
  return accessibleProductIds.size > 0;
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
    const freeMockIds = mockTests
      .filter(
        (item) =>
          String(item?.accessCode || "").trim().toUpperCase() === "MOCK" &&
          String(item?.mockCategory || "").trim().toUpperCase() === "FREE"
      )
      .map((item) => item.id);
    if (freeMockIds.length) {
      await Promise.all(
        freeMockIds.map((mockTestId) => mockTestService.ensureDefaultFreeMockRegistrationGate(mockTestId))
      );
    }

    const mockTestIds = mockTests.map((item) => item.id);
    const gateMap = await loadActiveRegistrationGates(mockTestIds);
    const gateIds = Array.from(gateMap.values()).map((item) => item.id);
    const [entryMap, usedAttemptMap, paidAccessSet, referralBonusMap, studentReferralCode, hasAnyPremiumAccess] =
      await Promise.all([
      loadUserRegistrationEntries(req.user!.userId, gateIds),
      loadUsedAttemptCountMap(req.user!.userId, mockTestIds),
      loadPaidAccessMockTestSet(req.user!.userId, mockTestIds),
      loadReferralBonusCountMap(req.user!.userId, gateIds),
      ensureUserReferralCode(req.user!.userId).catch(() => ""),
      loadHasAnyPremiumAccess(req.user!.userId),
    ]);

    const enrichedMockTests = mockTests.map((item) => {
      const gate = gateMap.get(item.id);
      if (!gate) return item;
      const mockCategory = normalizeMockCategory(gate.mockCategory);
      const freeAttemptLimit = resolveFreeAttemptLimit(gate);
      const referralBonusAttempts = Math.max(0, referralBonusMap.get(gate.id) || 0);
      const totalFreeAttemptLimit = freeAttemptLimit + referralBonusAttempts;
      const usedAttempts = Math.max(0, usedAttemptMap.get(item.id) || 0);
      const hasCategoryPremiumAccess = mockCategory === "FREE" && hasAnyPremiumAccess;
      const hasPaidAccess = paidAccessSet.has(item.id);
      const hasPremiumAccess = hasPaidAccess || hasCategoryPremiumAccess;
      const entry = entryMap.get(gate.id);
      const remainingAttempts = hasPremiumAccess
        ? Number.MAX_SAFE_INTEGER
        : Math.max(0, totalFreeAttemptLimit - usedAttempts);
      const registration = {
        enabled: true,
        gateId: gate.id,
        mockCategory,
        mockTestTitle: gate.mockTestTitle || item.title,
        examType: gate.examType || item.examType,
        subject: gate.subject || item.subject,
        streamChoice: resolveStreamChoice(gate.streamChoice || item.streamChoice, gate.subject || item.subject),
        languageMode: gate.languageMode || item.languageMode || "",
        title: gate.title,
        description: gate.description || "",
        popupImageUrl: gate.popupImageUrl || "",
        mockThumbnailUrl: gate.mockThumbnailUrl || "",
        scheduledDate: toDateOnly(gate.scheduledDate),
        scheduledTimeSlot: String(gate.scheduledTimeSlot || "").trim(),
        freeAttemptLimit,
        referralBonusAttempts,
        totalFreeAttemptLimit,
        usedAttempts,
        remainingAttempts,
        hasPremiumAccess,
        hasPaidAccess,
        hasAnyPremiumAccess,
        hasCategoryPremiumAccess,
        studentReferralCode: String(studentReferralCode || "").trim(),
        isRegistered: Boolean(entry?.isRegistered),
        friendReferralCode: entry?.friendReferralCode || "",
        noFriendReferralCode: Boolean(entry?.noFriendReferralCode),
        referredByUserId: entry?.referredByUserId || "",
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
    const gates = (await loadAllActiveRegistrationGates())
      .filter((gate) => isGatePublished(gate))
      .sort((a, b) => {
        const aTs = toScheduleTimestamp(a.scheduledDate, a.scheduledTimeSlot);
        const bTs = toScheduleTimestamp(b.scheduledDate, b.scheduledTimeSlot);
        if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) return aTs - bTs;
        if (Number.isFinite(aTs) && !Number.isFinite(bTs)) return -1;
        if (!Number.isFinite(aTs) && Number.isFinite(bTs)) return 1;
        return String(a.mockTestTitle || a.title || "").localeCompare(String(b.mockTestTitle || b.title || ""));
      });
    const mockTestIds = gates.map((item) => item.mockTestId);
    const gateIds = gates.map((item) => item.id);

    const [
      entryMap,
      usedAttemptMap,
      paidAccessSet,
      referralBonusMap,
      studentReferralCode,
      program,
      attemptedMockIds,
      latestSubmittedAttemptMap,
      inProgressAttemptSet,
      dailyAttemptCount,
      hasAnyPremiumAccess,
    ] = await Promise.all([
      loadUserRegistrationEntries(req.user!.userId, gateIds),
      loadUsedAttemptCountMap(req.user!.userId, mockTestIds),
      loadPaidAccessMockTestSet(req.user!.userId, mockTestIds),
      loadReferralBonusCountMap(req.user!.userId, gateIds),
      ensureUserReferralCode(req.user!.userId).catch(() => ""),
      loadUserRegistrationProgram(req.user!.userId),
      loadAttemptedMockTestIds(req.user!.userId, mockTestIds),
      loadLatestSubmittedAttemptMap(req.user!.userId, mockTestIds),
      loadInProgressAttemptSet(req.user!.userId, mockTestIds),
      loadTodayAttemptCount(req.user!.userId, mockTestIds),
      loadHasAnyPremiumAccess(req.user!.userId),
    ]);
    const remainingDailyAttempts = Math.max(0, DAILY_ATTEMPT_LIMIT - dailyAttemptCount);

    const options = gates.map((gate) => {
      const mockCategory = normalizeMockCategory(gate.mockCategory);
      const freeAttemptLimit = resolveFreeAttemptLimit(gate);
      const referralBonusAttempts = Math.max(0, referralBonusMap.get(gate.id) || 0);
      const totalFreeAttemptLimit = freeAttemptLimit + referralBonusAttempts;
      const usedAttempts = Math.max(0, usedAttemptMap.get(gate.mockTestId) || 0);
      const hasCategoryPremiumAccess = mockCategory === "FREE" && hasAnyPremiumAccess;
      const hasPaidAccess = paidAccessSet.has(gate.mockTestId);
      const hasPremiumAccess = hasPaidAccess || hasCategoryPremiumAccess;
      const entry = entryMap.get(gate.id);
      const hasAttempted = attemptedMockIds.has(gate.mockTestId);
      const hasInProgressAttempt = inProgressAttemptSet.has(gate.mockTestId);
      const latestSubmittedAttempt = latestSubmittedAttemptMap.get(gate.mockTestId);
      const remainingAttempts = hasPremiumAccess
        ? Number.MAX_SAFE_INTEGER
        : Math.max(0, totalFreeAttemptLimit - usedAttempts);
      const canStartNew =
        program.hasJoined &&
        !hasAttempted &&
        remainingDailyAttempts > 0 &&
        (hasPremiumAccess || remainingAttempts > 0);
      const canReattempt =
        program.hasJoined &&
        hasAttempted &&
        (hasInProgressAttempt || remainingDailyAttempts > 0) &&
        (hasPremiumAccess || remainingAttempts > 0 || hasInProgressAttempt);
      let actionLockedReason = "";
      if (!program.hasJoined) {
        actionLockedReason = "Complete registration first.";
      } else if (!hasInProgressAttempt && remainingDailyAttempts <= 0) {
        actionLockedReason = "Daily attempt limit reached.";
      } else if (!hasPremiumAccess && remainingAttempts <= 0) {
        actionLockedReason = "No chance left for this mock.";
      }
      return {
        gateId: gate.id,
        mockTestId: gate.mockTestId,
        mockCategory,
        mockTestTitle: gate.mockTestTitle || "",
        examType: gate.examType || "",
        subject: gate.subject || "",
        streamChoice: resolveStreamChoice(gate.streamChoice, gate.subject),
        languageMode: gate.languageMode || "",
        title: gate.title,
        description: gate.description || "",
        popupImageUrl: gate.popupImageUrl || "",
        mockThumbnailUrl: gate.mockThumbnailUrl || "",
        scheduledDate: toDateOnly(gate.scheduledDate),
        scheduledTimeSlot: String(gate.scheduledTimeSlot || "").trim(),
        freeAttemptLimit,
        referralBonusAttempts,
        totalFreeAttemptLimit,
        usedAttempts,
        remainingAttempts,
        hasPremiumAccess,
        hasPaidAccess,
        hasAnyPremiumAccess,
        hasCategoryPremiumAccess,
        hasAttempted,
        hasInProgressAttempt,
        attemptStatus: hasAttempted ? "ATTEMPTED" : "NOT_ATTEMPTED",
        latestScorePercent: latestSubmittedAttempt?.scorePercent ?? null,
        latestAttemptId: latestSubmittedAttempt?.attemptId || "",
        latestSubmittedAt: latestSubmittedAttempt?.submittedAt || "",
        canStartNew,
        canReattempt,
        requiresChanceConfirm: !hasPremiumAccess && hasAttempted && remainingAttempts > 0 && !hasInProgressAttempt,
        actionLockedReason,
        isProgramRegistered: program.hasJoined,
        joinedAt: program.joinedAt ? program.joinedAt.toISOString() : "",
        dailyAttemptLimit: DAILY_ATTEMPT_LIMIT,
        usedDailyAttemptCount: dailyAttemptCount,
        remainingDailyAttempts,
        studentReferralCode: String(studentReferralCode || "").trim(),
        isRegistered: Boolean(entry?.isRegistered) || program.hasJoined,
        friendReferralCode: entry?.friendReferralCode || "",
        noFriendReferralCode: Boolean(entry?.noFriendReferralCode),
        referredByUserId: entry?.referredByUserId || "",
        preferredExamType: entry?.preferredExamType || "",
        preferredStreamChoice: entry?.preferredStreamChoice || "",
        preferredDate: entry?.preferredDate || "",
        preferredTimeSlot: entry?.preferredTimeSlot || "",
        buyNowUrl: gate.buyNowUrl || "",
        ctaLabel: gate.ctaLabel || "Buy Mock",
        registrationPageUrl: `${registrationPagePath}?mockTestId=${encodeURIComponent(gate.mockTestId)}`,
      };
    });

    res.json({
      options,
      studentReferralCode: String(studentReferralCode || "").trim(),
      programStatus: {
        isRegistered: program.hasJoined,
        joinedAt: program.joinedAt ? program.joinedAt.toISOString() : "",
        dailyAttemptLimit: DAILY_ATTEMPT_LIMIT,
        usedDailyAttemptCount: dailyAttemptCount,
        remainingDailyAttempts,
      },
    });
  } catch (error) {
    next(error);
  }
});

studentMockTestsRouter.get("/mock-tests/:mockTestId/registration", ...ensureStudent, async (req, res, next) => {
  try {
    const mockTestId = String(req.params.mockTestId || "").trim();
    if (!mockTestId) throw new AppError("Mock test id is required.", 400);
    await mockTestService.ensureDefaultFreeMockRegistrationGate(mockTestId);

    const gateMap = await loadActiveRegistrationGates([mockTestId]);
    const gate = gateMap.get(mockTestId);
    if (!gate) {
      res.json({ registration: null });
      return;
    }

    const [entryMap, usedAttemptMap, paidAccess, referralBonusMap, studentReferralCode, hasAnyPremiumAccess] =
      await Promise.all([
      loadUserRegistrationEntries(req.user!.userId, [gate.id]),
      loadUsedAttemptCountMap(req.user!.userId, [mockTestId]),
      hasPaidAccessForMockTest(req.user!.userId, mockTestId),
      loadReferralBonusCountMap(req.user!.userId, [gate.id]),
      ensureUserReferralCode(req.user!.userId).catch(() => ""),
      loadHasAnyPremiumAccess(req.user!.userId),
    ]);
    const mockCategory = normalizeMockCategory(gate.mockCategory);
    const freeAttemptLimit = resolveFreeAttemptLimit(gate);
    const referralBonusAttempts = Math.max(0, referralBonusMap.get(gate.id) || 0);
    const totalFreeAttemptLimit = freeAttemptLimit + referralBonusAttempts;
    const usedAttempts = Math.max(0, usedAttemptMap.get(mockTestId) || 0);
    const entry = entryMap.get(gate.id);
    const hasCategoryPremiumAccess = mockCategory === "FREE" && hasAnyPremiumAccess;
    const hasPremiumAccess = paidAccess || hasCategoryPremiumAccess;
    const remainingAttempts = hasPremiumAccess
      ? Number.MAX_SAFE_INTEGER
      : Math.max(0, totalFreeAttemptLimit - usedAttempts);

    res.json({
      registration: {
        enabled: true,
        gateId: gate.id,
        mockTestId,
        mockCategory,
        mockTestTitle: gate.mockTestTitle || "",
        examType: gate.examType || "",
        subject: gate.subject || "",
        streamChoice: resolveStreamChoice(gate.streamChoice, gate.subject),
        languageMode: gate.languageMode || "",
        title: gate.title,
        description: gate.description || "",
        popupImageUrl: gate.popupImageUrl || "",
        mockThumbnailUrl: gate.mockThumbnailUrl || "",
        scheduledDate: toDateOnly(gate.scheduledDate),
        scheduledTimeSlot: String(gate.scheduledTimeSlot || "").trim(),
        freeAttemptLimit,
        referralBonusAttempts,
        totalFreeAttemptLimit,
        usedAttempts,
        remainingAttempts,
        hasPremiumAccess,
        studentReferralCode: String(studentReferralCode || "").trim(),
        isRegistered: Boolean(entry?.isRegistered),
        friendReferralCode: entry?.friendReferralCode || "",
        noFriendReferralCode: Boolean(entry?.noFriendReferralCode),
        referredByUserId: entry?.referredByUserId || "",
        preferredExamType: entry?.preferredExamType || "",
        preferredStreamChoice: entry?.preferredStreamChoice || "",
        preferredDate: entry?.preferredDate || "",
        preferredTimeSlot: entry?.preferredTimeSlot || "",
        hasPaidAccess: paidAccess,
        hasAnyPremiumAccess,
        hasCategoryPremiumAccess,
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
    await mockTestService.ensureDefaultFreeMockRegistrationGate(mockTestId);

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
    const gateScheduledDate = toDateOnly(gate.scheduledDate);
    const gateScheduledTimeSlot = String(gate.scheduledTimeSlot || "").trim() as "09:00" | "17:00" | "";
    const effectiveDate = String(
      gateScheduledDate || input.preferredDate || new Date().toISOString().slice(0, 10)
    ).trim();
    const effectiveTimeSlot = String(
      gateScheduledTimeSlot || input.preferredTimeSlot || "09:00"
    ).trim() as "09:00" | "17:00";
    if (gateExamType && gateExamType !== effectiveExamType) {
      throw new AppError("Selected exam does not match this mock registration.", 400);
    }
    if (effectiveExamType !== "PSTET_2" && effectiveStreamChoice) {
      throw new AppError("PSTET-2 subject selection is allowed only for PSTET-2.", 400);
    }
    const rawFriendReferralCode = String(input.friendReferralCode || "")
      .trim()
      .toUpperCase();
    const rawNoFriendReferralCode = Boolean(input.noFriendReferralCode);

    const [
      studentReferralCode,
      entryMap,
      usedAttemptMap,
      paidAccess,
      referralBonusMap,
      hadAnyRegistrationBefore,
      hasAnyPremiumAccess,
    ] = await Promise.all([
        ensureUserReferralCode(req.user!.userId).catch(() => ""),
        loadUserRegistrationEntries(req.user!.userId, [gate.id]),
        loadUsedAttemptCountMap(req.user!.userId, [mockTestId]),
        hasPaidAccessForMockTest(req.user!.userId, mockTestId),
        loadReferralBonusCountMap(req.user!.userId, [gate.id]),
        hasAnyUserRegistrationEntry(req.user!.userId),
        loadHasAnyPremiumAccess(req.user!.userId),
      ]);

    const normalizedStudentReferralCode = String(studentReferralCode || "").trim().toUpperCase();
    const existingEntry = entryMap.get(gate.id);
    const hasExistingGateRegistration = Boolean(existingEntry?.isRegistered);
    const mockCategory = normalizeMockCategory(gate.mockCategory);
    const freeAttemptLimit = resolveFreeAttemptLimit(gate);
    const referralBonusAttempts = Math.max(0, referralBonusMap.get(gate.id) || 0);
    const totalFreeAttemptLimit = freeAttemptLimit + referralBonusAttempts;
    const usedAttempts = Math.max(0, usedAttemptMap.get(mockTestId) || 0);
    const hasPremiumAccess = paidAccess || (mockCategory === "FREE" && hasAnyPremiumAccess);
    const remainingAttempts = hasPremiumAccess
      ? Number.MAX_SAFE_INTEGER
      : Math.max(0, totalFreeAttemptLimit - usedAttempts);

    if (!hasExistingGateRegistration && !hasPremiumAccess && remainingAttempts <= 0) {
      throw new AppError(
        "You do not have any chance Refer a friend to win free chance or buy the Mock test",
        402,
        "MOCK_NO_CHANCE_AVAILABLE",
        {
          mockTestId,
          freeAttemptLimit,
          referralBonusAttempts,
          totalFreeAttemptLimit,
          usedAttempts,
          buyNowUrl: gate.buyNowUrl || "",
          ctaLabel: gate.ctaLabel || "Buy Mock",
          registrationPageUrl: `${registrationPagePath}?mockTestId=${encodeURIComponent(mockTestId)}`,
        }
      );
    }

    let friendReferralCode = rawFriendReferralCode;
    let noFriendReferralCode = rawNoFriendReferralCode;
    let referredByUserId: string | null = existingEntry?.referredByUserId || null;

    if (hasExistingGateRegistration) {
      friendReferralCode = String(existingEntry?.friendReferralCode || "").trim().toUpperCase();
      noFriendReferralCode = Boolean(existingEntry?.noFriendReferralCode) && !friendReferralCode;
    } else if (hadAnyRegistrationBefore) {
      friendReferralCode = "";
      noFriendReferralCode = true;
      referredByUserId = null;
    }

    if (!friendReferralCode && !noFriendReferralCode) {
      throw new AppError("Enter friend refer code or select 'I do not have friend refer code'.", 400);
    }
    if (friendReferralCode && noFriendReferralCode) {
      throw new AppError("Use either friend refer code or 'I do not have friend refer code'.", 400);
    }

    if (!hasExistingGateRegistration) {
      referredByUserId = null;
    }
    if (friendReferralCode && !hasExistingGateRegistration) {
      if (normalizedStudentReferralCode && friendReferralCode === normalizedStudentReferralCode) {
        throw new AppError("You cannot use your own refer code.", 400);
      }
      referredByUserId = await getReferrerIdByCode(friendReferralCode);
      if (!referredByUserId) {
        throw new AppError("Friend refer code not found. Please check and try again.", 400);
      }
      if (referredByUserId === req.user!.userId) {
        throw new AppError("You cannot use your own refer code.", 400);
      }
    }

    const now = new Date();
    const preferredDate = new Date(`${effectiveDate}T00:00:00.000Z`);
    if (Number.isNaN(preferredDate.getTime())) {
      throw new AppError("Please select a valid date.", 400);
    }
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO MockTestRegistrationEntry (
          id, gateId, mockTestId, userId, fullName, mobile, email, friendReferralCode, referredByUserId, noFriendReferral, preferredExamType, preferredStreamChoice, preferredDate, preferredTimeSlot, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          fullName = VALUES(fullName),
          mobile = VALUES(mobile),
          email = VALUES(email),
          friendReferralCode = VALUES(friendReferralCode),
          referredByUserId = VALUES(referredByUserId),
          noFriendReferral = VALUES(noFriendReferral),
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
      input.email.trim(),
      friendReferralCode || null,
      referredByUserId,
      noFriendReferralCode ? 1 : 0,
      effectiveExamType,
      effectiveStreamChoice || null,
      preferredDate,
      effectiveTimeSlot,
      now,
      now
    );

    let referralBonusAwarded = false;
    const eligibleForReferralBonus = Boolean(referredByUserId) && !hadAnyRegistrationBefore && !hasExistingGateRegistration;
    if (eligibleForReferralBonus && referredByUserId) {
      const existingReferralRows = (await prisma.$queryRawUnsafe(
        `
          SELECT referrerUserId
          FROM MockTestRegistrationReferralBonus
          WHERE gateId = ?
            AND referredUserId = ?
          LIMIT 1
        `,
        gate.id,
        req.user!.userId
      )) as Array<{ referrerUserId: string }>;
      const existingReferrer = String(existingReferralRows[0]?.referrerUserId || "").trim();
      if (existingReferrer && existingReferrer !== referredByUserId) {
        throw new AppError("Referral already linked with another friend code.", 400);
      }
      if (!existingReferrer) {
        await prisma.$executeRawUnsafe(
          `
            INSERT INTO MockTestRegistrationReferralBonus (
              id, gateId, mockTestId, referrerUserId, referredUserId, referralCodeUsed, createdAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          `${gate.id}:${req.user!.userId}`,
          gate.id,
          mockTestId,
          referredByUserId,
          req.user!.userId,
          friendReferralCode,
          now
        );
        referralBonusAwarded = true;
      }
    }

    res.status(201).json({
      message: "Registration saved.",
      referralBonusAwarded,
    });
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
    await mockTestService.ensureDefaultFreeMockRegistrationGate(input.mockTestId);
    const gateMap = await loadActiveRegistrationGates([input.mockTestId]);
    const gate = gateMap.get(input.mockTestId);
    if (gate) {
      if (!isGatePublished(gate)) {
        throw new AppError("This mock test is not published yet.", 403, "MOCK_NOT_PUBLISHED");
      }

      const [
        entryMap,
        usedAttemptMap,
        paidAccess,
        referralBonusMap,
        program,
        attemptedMockIds,
        userProfile,
        hasInProgressAttempt,
        hasAnyPremiumAccess,
      ] =
        await Promise.all([
        loadUserRegistrationEntries(req.user!.userId, [gate.id]),
        loadUsedAttemptCountMap(req.user!.userId, [input.mockTestId]),
        hasPaidAccessForMockTest(req.user!.userId, input.mockTestId),
        loadReferralBonusCountMap(req.user!.userId, [gate.id]),
        loadUserRegistrationProgram(req.user!.userId),
        loadAttemptedMockTestIds(req.user!.userId, [input.mockTestId]),
        loadUserBasicProfile(req.user!.userId),
        hasInProgressAttemptForMockTest(req.user!.userId, input.mockTestId),
        loadHasAnyPremiumAccess(req.user!.userId),
      ]);
      const entry = entryMap.get(gate.id);
      if (!program.hasJoined) {
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

      if (!entry?.isRegistered) {
        await ensureGateEntryForJoinedUser(req.user!.userId, gate, program, userProfile);
      }

      const hasAttempted = attemptedMockIds.has(input.mockTestId);
      if (!hasInProgressAttempt) {
        const allPublishedGates = (await loadAllActiveRegistrationGates()).filter((item) => isGatePublished(item));
        const publishedMockIds = allPublishedGates.map((item) => item.mockTestId);
        const dailyAttemptCount = await loadTodayAttemptCount(req.user!.userId, publishedMockIds);
        if (dailyAttemptCount >= DAILY_ATTEMPT_LIMIT) {
          throw new AppError(
            "You can attempt only 2 mocks per day. Try again tomorrow.",
            403,
            "MOCK_DAILY_ATTEMPT_LIMIT_REACHED",
            {
              mockTestId: input.mockTestId,
              dailyAttemptLimit: DAILY_ATTEMPT_LIMIT,
              usedDailyAttemptCount: dailyAttemptCount,
              remainingDailyAttempts: Math.max(0, DAILY_ATTEMPT_LIMIT - dailyAttemptCount),
            }
          );
        }
      }

      const hasPremiumAccess = paidAccess || (normalizeMockCategory(gate.mockCategory) === "FREE" && hasAnyPremiumAccess);

      if (!hasPremiumAccess && !hasInProgressAttempt) {
        const freeAttemptLimit = resolveFreeAttemptLimit(gate);
        const referralBonusAttempts = Math.max(0, referralBonusMap.get(gate.id) || 0);
        const totalFreeAttemptLimit = freeAttemptLimit + referralBonusAttempts;
        const usedAttempts = Math.max(0, usedAttemptMap.get(input.mockTestId) || 0);
        if (hasAttempted && usedAttempts < totalFreeAttemptLimit && !input.confirmChanceUse) {
          throw new AppError(
            "You will use 1 chance for this attempt.",
            409,
            "MOCK_REATTEMPT_CONFIRM_REQUIRED",
            {
              mockTestId: input.mockTestId,
              remainingAttempts: Math.max(0, totalFreeAttemptLimit - usedAttempts),
            }
          );
        }
        if (usedAttempts >= totalFreeAttemptLimit) {
          throw new AppError(
            "Free attempt limit reached for this mock test. Please buy the mock to continue.",
            402,
            "MOCK_ATTEMPTS_EXHAUSTED",
            {
              mockTestId: input.mockTestId,
              freeAttemptLimit,
              referralBonusAttempts,
              totalFreeAttemptLimit,
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
