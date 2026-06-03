import { randomUUID } from "node:crypto";
import { Role } from "@prisma/client";
import { Request, Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { getReferrerIdByCode, getWalletBalance, normalizeAmount } from "../modules/referrals/referral.utils";
import { AppError } from "../utils/appError";
import { ensureMockTestAccessStorageReady } from "../utils/mockTestAccessStorage";
import { consumeVerifiedPaymentEvidence } from "./payment.routes";
import { verifyToken } from "../utils/jwt";
import { loadAccessibleProductIdsForSelection } from "../utils/productCombos";
import { resolveProductThumbnailUrl } from "../utils/productThumbnail";
import { ensureProductStorageReady } from "../utils/productStorage";
import { prisma } from "../utils/prisma";

export const productsRouter = Router();
const ensureStudent = [requireAuth, requireRole(Role.STUDENT)] as const;

const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value === "string" && value.trim() === "") return undefined;
      return value;
    },
    z.string().trim().max(max).optional()
  );

const optionalPositiveNumber = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return value;
  },
  z.coerce.number().positive().optional()
);

const listPublicProductsSchema = z.object({
  examCategory: optionalTrimmedString(120),
  examName: optionalTrimmedString(120),
  courseType: optionalTrimmedString(120),
  languageMode: optionalTrimmedString(60),
  search: optionalTrimmedString(180),
  minPrice: optionalPositiveNumber,
  maxPrice: optionalPositiveNumber,
});

type ProductRow = {
  id: string;
  title: string;
  examCategory: string;
  examName: string;
  courseType: string;
  languageMode: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  listPrice: number | string;
  salePrice: number | string;
  referralBonusAmount?: number | string;
  referralDiscountAmount?: number | string;
  accessDays: number;
  validityLabel: string | null;
  addons: unknown;
  demoLessonTitle: string | null;
  demoLessonUrl: string | null;
  trialEnabled?: number | boolean;
  trialDays?: number | null;
  isActive: number | boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type ProductPackageRow = {
  id: string;
  productId: string;
  title: string;
  price: number | string;
  featureLines: unknown;
  sortOrder: number;
  isActive: number | boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type ProductTrialClaimRow = {
  productId: string;
  claimedAt: Date | string;
  expiresAt: Date | string;
};

type ProductMockTestRow = {
  productId: string;
  mockTestId: string;
  mockTestTitle: string;
  mockTestExamType: string;
  mockTestSubject: string;
  mockTestChapterSubSubject?: string | null;
  linkFlowType?: string | null;
  mockTestAccessCode: string | null;
  mockTestIsActive: number | boolean;
  mockTestHasLessonContext?: number | boolean | null;
  mockTestHasTranscriptFlow?: number | boolean | null;
  mockTestActiveQuestionCount?: number | string | null;
  isUpcoming: number | boolean;
};

type ProductChapterSubSubjectRow = {
  productId: string;
  chapterSubSubject: string | null;
};

type TocTabPreset = "PSTET_1" | "PSTET_2_SST" | "PSTET_2_SCI_MATH" | null;

type ProductFaq = { q: string; a: string };
type ProductExamCovered = { title: string; imageUrl: string };
type ProductDetailsTabs = {
  overview: string[];
  packageIncludes: string[];
  studyPlan: string[];
  subjectsCovered: string[];
  examPattern: string[];
  faqs: ProductFaq[];
};
type ProductDetailsContent = {
  highlights: string[];
  salientFeatures: string[];
  examsCovered: ProductExamCovered[];
  detailsTabs: ProductDetailsTabs;
};

const DEFAULT_PRODUCT_HIGHLIGHTS = [
  "Access to Structured Classes in Audio with Scroll Form",
  "Doubt Solving Support via WhatsApp Chatbot, Telegram Groups, and Live Sessions (subject to availability).",
  "Boost Your Preparation with Study Planner | Previous Papers | Preparation Tips - Via Email & WhatsApp Chatbot",
  "Master PSTET with 10,000+ Carefully Curated MCQs for Every Subject.",
];

const DEFAULT_SALIENT_FEATURES = ["Audio Lesson", "Scroll with Audio", "Digital Test", "Timer Enable"];

const DEFAULT_EXAMS_COVERED = [
  { title: "PSTET", imageUrl: "./public/PSTET_7.png" },
  { title: "Punjab Teaching Exams", imageUrl: "./public/PSTET_8.png" },
  { title: "CTET", imageUrl: "./public/PSTET_10.png" },
];

const DEFAULT_PRODUCT_DETAILS_TABS = {
  overview: [
    "This program is designed for structured, exam-focused preparation with lesson-first learning flow.",
    "Students can start with guided audio-scroll lessons and move to test attempts with full flexibility.",
  ],
  packageIncludes: [
    "Audio-supported lessons with scroll content",
    "Structured chapter-wise learning flow",
    "Timed digital practice tests",
    "Progress tracking and performance support",
    "Quick revision support content",
  ],
  studyPlan: [
    "Concept learning with guided lessons",
    "Daily topic-wise practice",
    "Mock-based revision cycle",
    "Final strategy and exam readiness sessions",
  ],
  subjectsCovered: [
    "Child Development & Pedagogy",
    "Punjabi Language",
    "English Language",
    "Mathematics",
    "Environmental Studies",
    "Social Studies / Science",
  ],
  examPattern: [
    "Objective MCQ-based practice",
    "Timed attempts to simulate real exam pressure",
    "Topic-level and full-length mixed tests",
    "Performance review for speed and accuracy",
  ],
  faqs: [
    {
      q: "Is this course suitable for beginners?",
      a: "Yes. It starts from core concepts and progressively moves toward test-level practice.",
    },
    {
      q: "Can I attempt tests while audio is running?",
      a: "Yes. The learning flow supports moving to attempts and returning to lesson playback when needed.",
    },
  ],
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toIso = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  return Number(value) === 1;
};

const normalizeAccessCode = (value: unknown): "DEMO" | "MOCK" | "LESSON" => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (normalized === "MOCK" || normalized === "LESSON") return normalized;
  return "DEMO";
};

const normalizeProductFlowType = (value: unknown, fallback: "MOCK" | "LESSON" = "LESSON"): "MOCK" | "LESSON" => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (normalized === "MOCK" || normalized === "LESSON") return normalized;
  return fallback;
};

const normalizeTextList = (value: unknown, fallback: string[]): string[] => {
  const source = Array.isArray(value) ? value : [];
  const cleaned = source
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  return cleaned.length ? cleaned : [...fallback];
};

const normalizeFaqList = (value: unknown): ProductFaq[] => {
  const source = Array.isArray(value) ? value : [];
  const cleaned = source
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const q = String((item as { q?: unknown }).q || "").trim();
      const a = String((item as { a?: unknown }).a || "").trim();
      if (!q || !a) return null;
      return { q, a };
    })
    .filter((item): item is ProductFaq => Boolean(item));
  return cleaned.length ? cleaned : [...DEFAULT_PRODUCT_DETAILS_TABS.faqs];
};

const normalizeExamsCoveredList = (value: unknown): ProductExamCovered[] => {
  const source = Array.isArray(value) ? value : [];
  const cleaned = source
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const title = String((item as { title?: unknown }).title || "").trim();
      const imageUrl = String((item as { imageUrl?: unknown }).imageUrl || "").trim();
      if (!title) return null;
      return {
        title,
        imageUrl: imageUrl || "./public/PSTET_7.png",
      };
    })
    .filter((item): item is ProductExamCovered => Boolean(item));
  return cleaned.length ? cleaned : [...DEFAULT_EXAMS_COVERED];
};

const normalizeProductDetailsContent = (value: unknown): ProductDetailsContent => {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const detailsTabsRaw =
    raw.detailsTabs && typeof raw.detailsTabs === "object" && !Array.isArray(raw.detailsTabs)
      ? (raw.detailsTabs as Record<string, unknown>)
      : {};

  const highlightsSource = Array.isArray(value) ? value : raw.highlights;
  return {
    highlights: normalizeTextList(highlightsSource, DEFAULT_PRODUCT_HIGHLIGHTS),
    salientFeatures: normalizeTextList(raw.salientFeatures, DEFAULT_SALIENT_FEATURES),
    examsCovered: normalizeExamsCoveredList(raw.examsCovered),
    detailsTabs: {
      overview: normalizeTextList(detailsTabsRaw.overview, DEFAULT_PRODUCT_DETAILS_TABS.overview),
      packageIncludes: normalizeTextList(
        detailsTabsRaw.packageIncludes,
        DEFAULT_PRODUCT_DETAILS_TABS.packageIncludes
      ),
      studyPlan: normalizeTextList(detailsTabsRaw.studyPlan, DEFAULT_PRODUCT_DETAILS_TABS.studyPlan),
      subjectsCovered: normalizeTextList(
        detailsTabsRaw.subjectsCovered,
        DEFAULT_PRODUCT_DETAILS_TABS.subjectsCovered
      ),
      examPattern: normalizeTextList(detailsTabsRaw.examPattern, DEFAULT_PRODUCT_DETAILS_TABS.examPattern),
      faqs: normalizeFaqList(detailsTabsRaw.faqs),
    },
  };
};

const parseAddons = (value: unknown): ProductDetailsContent => {
  if (!value) return normalizeProductDetailsContent(undefined);

  if (typeof value === "string") {
    try {
      return normalizeProductDetailsContent(JSON.parse(value));
    } catch {
      return normalizeProductDetailsContent(value.split(",").map((item) => item.trim()));
    }
  }

  return normalizeProductDetailsContent(value);
};

const normalizePackageFeatureLines = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      return normalizeTextList(JSON.parse(value), []);
    } catch {
      return normalizeTextList(value.split("\n"), []);
    }
  }
  return normalizeTextList(value, []);
};

const buildSerializedPackages = (rows: ProductPackageRow[]) => {
  const ordered = [...rows].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return new Date(String(left.createdAt)).getTime() - new Date(String(right.createdAt)).getTime();
  });
  let cumulativeFeatureLines: string[] = [];
  return ordered.map((row) => {
    const featureLines = normalizePackageFeatureLines(row.featureLines);
    cumulativeFeatureLines = [...cumulativeFeatureLines, ...featureLines];
    return {
      id: row.id,
      title: row.title,
      price: toNumber(row.price),
      featureLines,
      allFeatureLines: [...cumulativeFeatureLines],
      sortOrder: Number(row.sortOrder || 0),
      isActive: toBoolean(row.isActive),
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  });
};

const toLinkedMockTest = (row: ProductMockTestRow) => ({
  id: row.mockTestId,
  title: row.mockTestTitle,
  examType: row.mockTestExamType,
  subject: row.mockTestSubject,
  chapterSubSubject: String(row.mockTestChapterSubSubject || "").trim() || null,
  accessCode: normalizeAccessCode(row.mockTestAccessCode),
  flowType: normalizeProductFlowType(row.linkFlowType, normalizeAccessCode(row.mockTestAccessCode) === "MOCK" ? "MOCK" : "LESSON"),
  isActive: toBoolean(row.mockTestIsActive),
  hasLessonContext: toBoolean(row.mockTestHasLessonContext),
  hasTranscriptFlow: toBoolean(row.mockTestHasTranscriptFlow),
  activeQuestionCount: toNumber(row.mockTestActiveQuestionCount),
  isUpcoming: toBoolean(row.isUpcoming),
});

const normalizeMockTitleMatch = (value: unknown) =>
  String(value || "")
    .replace(/^\s*\d+\s*[\.\)\-:]\s*/i, "")
    .replace(/\b(demo|premium|mock\s*test|mock|lesson)\b/gi, " ")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const scoreLinkedMockTestRow = (row: ProductMockTestRow) => {
  let score = 0;
  if (toBoolean(row.mockTestIsActive)) score += 100;
  if (toBoolean(row.mockTestHasLessonContext)) score += 400;
  if (toBoolean(row.mockTestHasTranscriptFlow)) score += 200;
  score += Math.max(0, toNumber(row.mockTestActiveQuestionCount));
  return score;
};

const resolveEffectiveLinkedMockTestRows = async (rows: ProductMockTestRow[]) => {
  if (!rows.length) return rows;
  const fallbackTitles = Array.from(
    new Set(
      rows
        .filter(
          (row) =>
            (!toBoolean(row.mockTestHasLessonContext) || toNumber(row.mockTestActiveQuestionCount) < 1) &&
            String(row.mockTestTitle || "").trim()
        )
        .map((row) => String(row.mockTestTitle || "").trim())
        .filter(Boolean)
    )
  );
  if (!fallbackTitles.length) return rows;

  const placeholders = fallbackTitles.map(() => "?").join(", ");
  const candidateRows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        '' AS productId,
        mt.id AS mockTestId,
        mt.title AS mockTestTitle,
        mt.examType AS mockTestExamType,
        mt.subject AS mockTestSubject,
        (
          SELECT ch.subSubject
          FROM Lesson lesson
          INNER JOIN Chapter ch ON ch.id = lesson.chapterId
          WHERE lesson.assessmentTestId = mt.id
            AND ch.subSubject IS NOT NULL
          ORDER BY ch.orderIndex ASC, lesson.orderIndex ASC
          LIMIT 1
        ) AS mockTestChapterSubSubject,
        NULL AS linkFlowType,
        (
          SELECT mar2.accessCode
          FROM MockTestAccessRule mar2
          WHERE mar2.mockTestId = mt.id
          ORDER BY mar2.updatedAt DESC, mar2.createdAt DESC
          LIMIT 1
        ) AS mockTestAccessCode,
        mt.isActive AS mockTestIsActive,
        EXISTS(
          SELECT 1
          FROM Lesson lesson
          WHERE lesson.assessmentTestId = mt.id
          LIMIT 1
        ) AS mockTestHasLessonContext,
        EXISTS(
          SELECT 1
          FROM Lesson lesson
          WHERE lesson.assessmentTestId = mt.id
            AND (
              NULLIF(TRIM(COALESCE(lesson.transcriptText, '')), '') IS NOT NULL
              OR NULLIF(TRIM(COALESCE(lesson.transcriptUrl, '')), '') IS NOT NULL
              OR NULLIF(TRIM(COALESCE(lesson.audioUrl, '')), '') IS NOT NULL
              OR NULLIF(TRIM(COALESCE(lesson.videoUrl, '')), '') IS NOT NULL
              OR lesson.transcriptSegments IS NOT NULL
            )
          LIMIT 1
        ) AS mockTestHasTranscriptFlow,
        (
          SELECT COUNT(*)
          FROM Question q
          WHERE q.mockTestId = mt.id
            AND q.isActive = 1
            AND COALESCE(q.isArchived, 0) = 0
        ) AS mockTestActiveQuestionCount,
        0 AS isUpcoming
      FROM MockTest mt
      WHERE mt.title IN (${placeholders})
    `,
    ...fallbackTitles
  )) as ProductMockTestRow[];

  if (!candidateRows.length) return rows;

  const candidatesByTitle = new Map<string, ProductMockTestRow[]>();
  candidateRows.forEach((row) => {
    const key = normalizeMockTitleMatch(row.mockTestTitle);
    if (!key) return;
    const current = candidatesByTitle.get(key) || [];
    current.push(row);
    candidatesByTitle.set(key, current);
  });

  return rows.map((row) => {
    const currentKey = normalizeMockTitleMatch(row.mockTestTitle);
    if (!currentKey) return row;
    const candidates = (candidatesByTitle.get(currentKey) || []).filter((candidate) => {
      if (String(candidate.mockTestExamType || "").trim() !== String(row.mockTestExamType || "").trim()) return false;
      const currentSubject = String(row.mockTestSubject || "").trim().toUpperCase();
      const candidateSubject = String(candidate.mockTestSubject || "").trim().toUpperCase();
      if (currentSubject && candidateSubject && currentSubject !== candidateSubject) return false;
      return true;
    });
    if (!candidates.length) return row;
    const currentQuestionCount = toNumber(row.mockTestActiveQuestionCount);
    const questionBearingCandidates = candidates.filter((candidate) => toNumber(candidate.mockTestActiveQuestionCount) > 0);
    const preferredCandidates = currentQuestionCount < 1 && questionBearingCandidates.length ? questionBearingCandidates : candidates;
    const bestCandidate = [...preferredCandidates].sort((left, right) => {
      const questionDelta = toNumber(right.mockTestActiveQuestionCount) - toNumber(left.mockTestActiveQuestionCount);
      if (questionDelta !== 0) return questionDelta;
      return scoreLinkedMockTestRow(right) - scoreLinkedMockTestRow(left);
    })[0];
    if (!bestCandidate) return row;
    if (
      toNumber(bestCandidate.mockTestActiveQuestionCount) <= currentQuestionCount &&
      scoreLinkedMockTestRow(bestCandidate) <= scoreLinkedMockTestRow(row)
    ) {
      return row;
    }
    return {
      ...row,
      mockTestId: bestCandidate.mockTestId,
      mockTestTitle: bestCandidate.mockTestTitle,
      mockTestExamType: bestCandidate.mockTestExamType,
      mockTestSubject: bestCandidate.mockTestSubject,
      mockTestChapterSubSubject: bestCandidate.mockTestChapterSubSubject,
      mockTestAccessCode: bestCandidate.mockTestAccessCode,
      mockTestIsActive: bestCandidate.mockTestIsActive,
      mockTestHasLessonContext: bestCandidate.mockTestHasLessonContext,
      mockTestHasTranscriptFlow: bestCandidate.mockTestHasTranscriptFlow,
      mockTestActiveQuestionCount: bestCandidate.mockTestActiveQuestionCount,
    };
  });
};

const normalizeLookupText = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const inferExamTypeForTocPreset = (
  row: ProductRow,
  linkedMockTests: ReturnType<typeof toLinkedMockTest>[],
  demoMockTests: ReturnType<typeof toLinkedMockTest>[]
): "PSTET_1" | "PSTET_2" | null => {
  const combinedText = normalizeLookupText(`${row.examName} ${row.examCategory} ${row.title}`);
  if (combinedText.includes("pstet 1") || combinedText.includes("paper 1")) return "PSTET_1";
  if (combinedText.includes("pstet 2") || combinedText.includes("paper 2")) return "PSTET_2";

  const testExamTypes = [...linkedMockTests, ...demoMockTests]
    .map((item) => String(item?.examType || "").trim().toUpperCase())
    .filter(Boolean);
  if (testExamTypes.includes("PSTET_1")) return "PSTET_1";
  if (testExamTypes.includes("PSTET_2")) return "PSTET_2";
  return null;
};

const resolveTocTabPreset = (
  row: ProductRow,
  linkedMockTests: ReturnType<typeof toLinkedMockTest>[],
  demoMockTests: ReturnType<typeof toLinkedMockTest>[],
  chapterSubSubjects: string[] = []
): TocTabPreset => {
  const examType = inferExamTypeForTocPreset(row, linkedMockTests, demoMockTests);
  if (examType === "PSTET_1") return "PSTET_1";
  if (examType !== "PSTET_2") return null;

  const normalizedSubSubjects = chapterSubSubjects
    .map((value) => String(value || "").trim().toUpperCase())
    .filter(Boolean);
  if (normalizedSubSubjects.includes("SOCIAL_STUDIES")) return "PSTET_2_SST";
  if (normalizedSubSubjects.includes("SCIENCE_MATH")) return "PSTET_2_SCI_MATH";

  const normalizedMockSubjects = [...linkedMockTests, ...demoMockTests]
    .map((item) => String(item?.subject || "").trim().toUpperCase())
    .filter(Boolean);
  if (normalizedMockSubjects.includes("SOCIAL_STUDIES")) return "PSTET_2_SST";
  if (normalizedMockSubjects.includes("SCIENCE_MATH")) return "PSTET_2_SCI_MATH";

  return "PSTET_2_SST";
};

const loadLinkedMockTestsByProductIds = async (productIds: string[]) => {
  if (!productIds.length) return new Map<string, ReturnType<typeof toLinkedMockTest>[]>();
  const placeholders = productIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        pmt.productId,
        pmt.mockTestId,
        pmt.flowType AS linkFlowType,
        pmt.isUpcoming AS isUpcoming,
        mt.title AS mockTestTitle,
        mt.examType AS mockTestExamType,
        mt.subject AS mockTestSubject,
        (
          SELECT ch.subSubject
          FROM Lesson lesson
          INNER JOIN Chapter ch ON ch.id = lesson.chapterId
          WHERE lesson.assessmentTestId = mt.id
            AND ch.subSubject IS NOT NULL
          ORDER BY ch.orderIndex ASC, lesson.orderIndex ASC
          LIMIT 1
        ) AS mockTestChapterSubSubject,
        (
          SELECT mar2.accessCode
          FROM MockTestAccessRule mar2
          WHERE mar2.mockTestId = mt.id
          ORDER BY mar2.updatedAt DESC, mar2.createdAt DESC
          LIMIT 1
        ) AS mockTestAccessCode,
        mt.isActive AS mockTestIsActive,
        EXISTS(
          SELECT 1
          FROM Lesson lesson
          WHERE lesson.assessmentTestId = mt.id
          LIMIT 1
        ) AS mockTestHasLessonContext,
        EXISTS(
          SELECT 1
          FROM Lesson lesson
          WHERE lesson.assessmentTestId = mt.id
            AND (
              NULLIF(TRIM(COALESCE(lesson.transcriptText, '')), '') IS NOT NULL
              OR NULLIF(TRIM(COALESCE(lesson.transcriptUrl, '')), '') IS NOT NULL
              OR NULLIF(TRIM(COALESCE(lesson.audioUrl, '')), '') IS NOT NULL
              OR NULLIF(TRIM(COALESCE(lesson.videoUrl, '')), '') IS NOT NULL
              OR lesson.transcriptSegments IS NOT NULL
            )
          LIMIT 1
        ) AS mockTestHasTranscriptFlow,
        (
          SELECT COUNT(*)
          FROM Question q
          WHERE q.mockTestId = mt.id
            AND q.isActive = 1
            AND COALESCE(q.isArchived, 0) = 0
        ) AS mockTestActiveQuestionCount
      FROM ProductMockTest pmt
      INNER JOIN MockTest mt ON mt.id = pmt.mockTestId
      WHERE pmt.productId IN (${placeholders})
        AND mt.isActive = 1
      ORDER BY pmt.productId ASC, pmt.createdAt ASC, mt.createdAt ASC
    `,
    ...productIds
  )) as ProductMockTestRow[];

  const resolvedRows = await resolveEffectiveLinkedMockTestRows(rows);

  const grouped = new Map<string, ReturnType<typeof toLinkedMockTest>[]>();
  resolvedRows.forEach((row) => {
    const list = grouped.get(row.productId) || [];
    list.push(toLinkedMockTest(row));
    grouped.set(row.productId, list);
  });
  return grouped;
};

const loadDemoMockTestsByProductIds = async (productIds: string[]) => {
  if (!productIds.length) return new Map<string, ReturnType<typeof toLinkedMockTest>[]>();
  const placeholders = productIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        pdmt.productId,
        pdmt.mockTestId,
        pdmt.flowType AS linkFlowType,
        pdmt.isUpcoming AS isUpcoming,
        mt.title AS mockTestTitle,
        mt.examType AS mockTestExamType,
        mt.subject AS mockTestSubject,
        (
          SELECT ch.subSubject
          FROM Lesson lesson
          INNER JOIN Chapter ch ON ch.id = lesson.chapterId
          WHERE lesson.assessmentTestId = mt.id
            AND ch.subSubject IS NOT NULL
          ORDER BY ch.orderIndex ASC, lesson.orderIndex ASC
          LIMIT 1
        ) AS mockTestChapterSubSubject,
        (
          SELECT mar2.accessCode
          FROM MockTestAccessRule mar2
          WHERE mar2.mockTestId = mt.id
          ORDER BY mar2.updatedAt DESC, mar2.createdAt DESC
          LIMIT 1
        ) AS mockTestAccessCode,
        mt.isActive AS mockTestIsActive,
        EXISTS(
          SELECT 1
          FROM Lesson lesson
          WHERE lesson.assessmentTestId = mt.id
          LIMIT 1
        ) AS mockTestHasLessonContext,
        EXISTS(
          SELECT 1
          FROM Lesson lesson
          WHERE lesson.assessmentTestId = mt.id
            AND (
              NULLIF(TRIM(COALESCE(lesson.transcriptText, '')), '') IS NOT NULL
              OR NULLIF(TRIM(COALESCE(lesson.transcriptUrl, '')), '') IS NOT NULL
              OR NULLIF(TRIM(COALESCE(lesson.audioUrl, '')), '') IS NOT NULL
              OR NULLIF(TRIM(COALESCE(lesson.videoUrl, '')), '') IS NOT NULL
              OR lesson.transcriptSegments IS NOT NULL
            )
          LIMIT 1
        ) AS mockTestHasTranscriptFlow,
        (
          SELECT COUNT(*)
          FROM Question q
          WHERE q.mockTestId = mt.id
            AND q.isActive = 1
            AND COALESCE(q.isArchived, 0) = 0
        ) AS mockTestActiveQuestionCount
      FROM ProductDemoMockTest pdmt
      INNER JOIN MockTest mt ON mt.id = pdmt.mockTestId
      WHERE pdmt.productId IN (${placeholders})
        AND mt.isActive = 1
      ORDER BY pdmt.productId ASC, pdmt.createdAt ASC, mt.createdAt ASC
    `,
    ...productIds
  )) as ProductMockTestRow[];

  const resolvedRows = await resolveEffectiveLinkedMockTestRows(rows);

  const grouped = new Map<string, ReturnType<typeof toLinkedMockTest>[]>();
  resolvedRows.forEach((row) => {
    const list = grouped.get(row.productId) || [];
    list.push(toLinkedMockTest(row));
    grouped.set(row.productId, list);
  });
  return grouped;
};

const loadChapterSubSubjectsByProductIds = async (productIds: string[]) => {
  if (!productIds.length) return new Map<string, string[]>();
  const placeholders = productIds.map(() => "?").join(", ");
  let rows: ProductChapterSubSubjectRow[] = [];
  try {
    rows = (await prisma.$queryRawUnsafe(
      `
        SELECT DISTINCT
          linked.productId,
          ch.subSubject AS chapterSubSubject
        FROM (
          SELECT pmt.productId, pmt.mockTestId
          FROM ProductMockTest pmt
          WHERE pmt.productId IN (${placeholders})
          UNION ALL
          SELECT pdmt.productId, pdmt.mockTestId
          FROM ProductDemoMockTest pdmt
          WHERE pdmt.productId IN (${placeholders})
        ) linked
        INNER JOIN Lesson l ON l.assessmentTestId = linked.mockTestId
        INNER JOIN Chapter ch ON ch.id = l.chapterId
        WHERE ch.subSubject IS NOT NULL
      `,
      ...productIds,
      ...productIds
    )) as ProductChapterSubSubjectRow[];
  } catch (error) {
    const message = String((error as { message?: string })?.message || "").toLowerCase();
    const code = String((error as { code?: string })?.code || "").trim();
    const missingSubSubjectColumn =
      (code === "P2010" || message.includes("1054")) &&
      message.includes("subsubject") &&
      message.includes("unknown column");
    if (!missingSubSubjectColumn) throw error;
    // Backward compatibility for databases where migration is not applied yet.
    return new Map<string, string[]>();
  }

  const grouped = new Map<string, string[]>();
  rows.forEach((row) => {
    const productId = String(row.productId || "").trim();
    if (!productId) return;
    const value = String(row.chapterSubSubject || "").trim();
    if (!value) return;
    const current = grouped.get(productId) || [];
    if (!current.includes(value)) current.push(value);
    grouped.set(productId, current);
  });
  return grouped;
};

const loadPackagesByProductIds = async (productIds: string[]) => {
  if (!productIds.length) return new Map<string, ReturnType<typeof buildSerializedPackages>>();
  const placeholders = productIds.map(() => "?").join(", ");
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          pp.id,
          pp.productId,
          pp.title,
          pp.price,
          pp.featureLines,
          pp.sortOrder,
          pp.isActive,
          pp.createdAt,
          pp.updatedAt
        FROM ProductPackage pp
        WHERE pp.productId IN (${placeholders})
        ORDER BY pp.productId ASC, pp.sortOrder ASC, pp.createdAt ASC
      `,
      ...productIds
    )) as ProductPackageRow[];

    const groupedRows = new Map<string, ProductPackageRow[]>();
    rows.forEach((row) => {
      const list = groupedRows.get(row.productId) || [];
      list.push(row);
      groupedRows.set(row.productId, list);
    });

    const grouped = new Map<string, ReturnType<typeof buildSerializedPackages>>();
    groupedRows.forEach((value, key) => {
      grouped.set(key, buildSerializedPackages(value));
    });
    return grouped;
  } catch (error) {
    const message = String((error as { message?: string })?.message || "").toLowerCase();
    const missingTable =
      (message.includes("1146") || message.includes("p2010")) && message.includes("productpackage");
    if (missingTable) return new Map<string, ReturnType<typeof buildSerializedPackages>>();
    throw error;
  }
};

const loadTrialClaimsByProductIds = async (userId: string | null, productIds: string[]) => {
  if (!userId || !productIds.length) return new Map<string, ProductTrialClaimRow>();
  const placeholders = productIds.map(() => "?").join(", ");
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT productId, claimedAt, expiresAt
        FROM ProductTrialClaim
        WHERE userId = ?
          AND productId IN (${placeholders})
        ORDER BY createdAt DESC
      `,
      userId,
      ...productIds
    )) as ProductTrialClaimRow[];
    const grouped = new Map<string, ProductTrialClaimRow>();
    rows.forEach((row) => {
      const productId = String(row.productId || "").trim();
      if (!productId || grouped.has(productId)) return;
      grouped.set(productId, row);
    });
    return grouped;
  } catch (error) {
    const message = String((error as { message?: string })?.message || "").toLowerCase();
    const missingTable =
      (message.includes("1146") || message.includes("p2010")) && message.includes("producttrialclaim");
    if (missingTable) return new Map<string, ProductTrialClaimRow>();
    throw error;
  }
};

const resolveOptionalStudentUserId = (req: Request): string | null => {
  const authHeader = String(req.headers.authorization || "").trim();
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    return payload.role === Role.STUDENT ? payload.userId : null;
  } catch {
    return null;
  }
};

const loadUnlockedProductIdsForUser = async (userId: string | null, productIds: string[]) => {
  return loadAccessibleProductIdsForSelection(userId, productIds);
};

const serializeProduct = (
  row: ProductRow,
  linkedMockTests: ReturnType<typeof toLinkedMockTest>[] = [],
  demoMockTests: ReturnType<typeof toLinkedMockTest>[] = [],
  isPremiumUnlocked = false,
  tocTabPreset: TocTabPreset = null,
  packages: ReturnType<typeof buildSerializedPackages> = [],
  trialClaim: ProductTrialClaimRow | null = null
) => {
  const listPrice = toNumber(row.listPrice);
  const salePrice = toNumber(row.salePrice);
  const discountPercent =
    listPrice > 0 ? Math.max(0, Math.round(((listPrice - salePrice) / listPrice) * 100)) : 0;

  return {
    id: row.id,
    title: row.title,
    examCategory: row.examCategory,
    examName: row.examName,
    courseType: row.courseType,
    languageMode: row.languageMode,
    thumbnailUrl: resolveProductThumbnailUrl(row.thumbnailUrl),
    description: row.description,
    listPrice,
    salePrice,
    referralBonusAmount: normalizeAmount(row.referralBonusAmount ?? 0),
    referralDiscountAmount: normalizeAmount(row.referralDiscountAmount ?? 0),
    discountPercent,
    accessDays: Number(row.accessDays),
    validityLabel: row.validityLabel,
    addons: parseAddons(row.addons),
    demoLessonTitle: row.demoLessonTitle || null,
    demoLessonUrl: row.demoLessonUrl || null,
    trialConfig: {
      enabled: toBoolean(row.trialEnabled),
      days: Number(row.trialDays || 0),
    },
    trialStatus: {
      hasClaimed: Boolean(trialClaim),
      claimedAt: trialClaim ? toIso(trialClaim.claimedAt) : null,
      expiresAt: trialClaim ? toIso(trialClaim.expiresAt) : null,
      isActive: trialClaim ? new Date(String(trialClaim.expiresAt)).getTime() >= Date.now() : false,
    },
    packages,
    linkedMockTests,
    demoMockTests,
    tocTabPreset,
    isPremiumUnlocked,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
};

const buyWithWalletSchema = z.object({
  packageId: optionalTrimmedString(191),
  referralCode: z.string().trim().min(4).max(40).optional(),
  includeDefaultOffer: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
    }
    return value;
  }, z.boolean().optional()),
  walletUseAmount: z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") return undefined;
      return value;
    },
    z.coerce.number().nonnegative().optional()
  ),
  paymentEvidence: z
    .object({
      razorpay_order_id: z.string().trim().min(1),
      razorpay_payment_id: z.string().trim().min(1),
    })
    .optional(),
});

const claimTrialSchema = z.object({
  deviceFingerprint: z.string().trim().min(8).max(191),
});

const REFERRAL_DISCOUNT_SLABS = [
  { min: 249, max: 500, friendDiscount: 10 },
  { min: 501, max: 1000, friendDiscount: 40 },
  { min: 1001, max: 2000, friendDiscount: 80 },
  { min: 2001, max: 3000, friendDiscount: 160 },
  { min: 3001, max: 4000, friendDiscount: 240 },
  { min: 4001, max: 5000, friendDiscount: 320 },
  { min: 5001, max: 6000, friendDiscount: 400 },
  { min: 6001, max: 8000, friendDiscount: 480 },
  { min: 8001, max: 10000, friendDiscount: 640 },
  { min: 10001, max: Number.POSITIVE_INFINITY, friendDiscount: 800 },
];

const pickFriendDiscountByAmount = (amount: number): number => {
  const safeAmount = normalizeAmount(amount);
  if (safeAmount <= 0) return 0;
  const matched = REFERRAL_DISCOUNT_SLABS.find((slab) => safeAmount >= slab.min && safeAmount <= slab.max);
  return normalizeAmount(matched?.friendDiscount ?? 0);
};

const hasAnyProductPurchase = async (userId: string): Promise<boolean> => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT id
      FROM ProductPurchase
      WHERE userId = ?
      LIMIT 1
    `,
    userId
  )) as Array<{ id: string }>;
  return rows.length > 0;
};

const getExistingProductPurchase = async (userId: string, productId: string) => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT id, productId, amountPaid, walletUsed, referralBonusCredited, packageId, packageTitle, packagePrice, createdAt
      FROM ProductPurchase
      WHERE userId = ?
        AND productId = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `,
    userId,
    productId
  )) as Array<{
    id: string;
    productId: string;
    amountPaid: number | string;
    walletUsed: number | string;
    referralBonusCredited: number | string;
    packageId: string | null;
    packageTitle: string | null;
    packagePrice: number | string | null;
    createdAt: Date | string;
  }>;
  return rows[0] || null;
};

const buildAlreadyOwnedResponse = (purchase: Awaited<ReturnType<typeof getExistingProductPurchase>>) => ({
  message: "Product already purchased.",
  alreadyOwned: true,
  purchase: purchase
    ? {
        id: purchase.id,
        productId: purchase.productId,
        amountPaid: normalizeAmount(purchase.amountPaid),
        walletUsed: normalizeAmount(purchase.walletUsed),
        packageId: purchase.packageId || null,
        packageTitle: purchase.packageTitle || null,
        packagePrice: purchase.packagePrice === null ? null : normalizeAmount(purchase.packagePrice),
        referralBonusCredited: normalizeAmount(purchase.referralBonusCredited),
        createdAt: toIso(purchase.createdAt),
      }
    : null,
});

const resolveReferrerForFriendOffer = async (buyerUserId: string, referralCode: string) => {
  const normalizedReferralCode = String(referralCode || "")
    .trim()
    .toUpperCase();
  if (!normalizedReferralCode) {
    return {
      referrerId: null as string | null,
      appliedReferralCode: null as string | null,
    };
  }

  const referredByUserId = await getReferrerIdByCode(normalizedReferralCode);
  if (!referredByUserId) {
    throw new AppError("Invalid student ID / referral code.", 400);
  }
  if (referredByUserId === buyerUserId) {
    throw new AppError("You cannot use your own student ID.", 400);
  }

  const friendHasPurchase = await hasAnyProductPurchase(referredByUserId);
  if (!friendHasPurchase) {
    throw new AppError(
      "Friend offer is valid only for student IDs that have completed at least one paid purchase.",
      400
    );
  }

  return {
    referrerId: referredByUserId,
    appliedReferralCode: normalizedReferralCode,
  };
};

type CheckoutProductRow = {
  id: string;
  title: string;
  listPrice: number | string;
  salePrice: number | string;
  referralBonusAmount: number | string | null;
  trialEnabled?: number | boolean;
  trialDays?: number | null;
  isActive: number | boolean;
};

type CheckoutPackageRow = {
  id: string;
  productId: string;
  title: string;
  price: number | string;
  isActive: number | boolean;
};

const getCheckoutSelection = async (productId: string, packageId?: string | null) => {
  const productRows = (await prisma.$queryRawUnsafe(
    `
      SELECT id, title, listPrice, salePrice, referralBonusAmount, trialEnabled, trialDays, isActive
      FROM Product
      WHERE id = ?
      LIMIT 1
    `,
    productId
  )) as CheckoutProductRow[];
  const product = productRows[0];
  if (!product) {
    throw new AppError("Product not found.", 404);
  }
  if (!Boolean(Number(product.isActive) === 1 || product.isActive === true)) {
    throw new AppError("This product is currently inactive.", 400);
  }

  let selectedPackage: CheckoutPackageRow | null = null;
  const normalizedPackageId = String(packageId || "").trim();
  if (normalizedPackageId) {
    const packageRows = (await prisma.$queryRawUnsafe(
      `
        SELECT id, productId, title, price, isActive
        FROM ProductPackage
        WHERE id = ?
          AND productId = ?
        LIMIT 1
      `,
      normalizedPackageId,
      productId
    ).catch((error: unknown) => {
      const message = String((error as { message?: string })?.message || "").toLowerCase();
      const missingTable =
        (message.includes("1146") || message.includes("p2010")) && message.includes("productpackage");
      if (missingTable) return [];
      throw error;
    })) as CheckoutPackageRow[];
    selectedPackage = packageRows[0] || null;
    if (!selectedPackage) {
      throw new AppError("Selected package not found for this product.", 404);
    }
    if (!Boolean(Number(selectedPackage.isActive) === 1 || selectedPackage.isActive === true)) {
      throw new AppError("Selected package is currently inactive.", 400);
    }
  }

  return {
    product,
    selectedPackage,
  };
};

const buildOfferPricing = (
  product: CheckoutProductRow,
  includeDefaultOffer: boolean,
  applyFriendOffer: boolean,
  selectedPackage?: CheckoutPackageRow | null
) => {
  const listPrice = normalizeAmount(selectedPackage?.price ?? product.listPrice);
  const salePrice = normalizeAmount(selectedPackage?.price ?? product.salePrice);
  const effectiveSalePrice = normalizeAmount(Math.min(salePrice > 0 ? salePrice : listPrice, listPrice));
  if (listPrice <= 0 || effectiveSalePrice <= 0) {
    throw new AppError("Product pricing is invalid.", 400);
  }

  const currentPrice = includeDefaultOffer ? effectiveSalePrice : listPrice;
  const defaultOfferDiscount = includeDefaultOffer ? normalizeAmount(Math.max(0, listPrice - effectiveSalePrice)) : 0;
  const friendDiscountConfigured = pickFriendDiscountByAmount(currentPrice);
  const friendDiscountApplied = applyFriendOffer ? normalizeAmount(Math.min(currentPrice, friendDiscountConfigured)) : 0;
  const payableAmount = normalizeAmount(Math.max(0, currentPrice - friendDiscountApplied));
  const defaultOfferPercent =
    listPrice > 0 ? Math.max(0, Math.round((defaultOfferDiscount / listPrice) * 100)) : 0;

  return {
    listPrice,
    currentPrice,
    defaultOfferDiscount,
    defaultOfferPercent,
    friendDiscountConfigured,
    friendDiscountApplied,
    payableAmount,
  };
};

const resolveWalletAdjustment = (payableAmount: number, walletBalance: number, walletUseAmount?: number) => {
  const payableBeforeWallet = normalizeAmount(Math.max(0, payableAmount));
  const walletAvailable = normalizeAmount(Math.max(0, walletBalance));
  const walletRequested = normalizeAmount(Math.max(0, walletUseAmount ?? 0));
  const walletUsed = normalizeAmount(Math.min(payableBeforeWallet, walletAvailable, walletRequested));
  const payableAfterWallet = normalizeAmount(Math.max(0, payableBeforeWallet - walletUsed));

  return {
    walletAvailable,
    walletRequested,
    walletUsed,
    payableBeforeWallet,
    payableAfterWallet,
  };
};

productsRouter.use(async (_req, _res, next) => {
  try {
    await Promise.all([ensureProductStorageReady(), ensureMockTestAccessStorageReady()]);
    next();
  } catch (error) {
    next(error);
  }
});

productsRouter.get("/", async (req, res, next) => {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    const filters = listPublicProductsSchema.parse(req.query);
    const studentUserId = resolveOptionalStudentUserId(req);

    const whereClauses = ["p.isActive = 1"];
    const params: unknown[] = [];

    if (filters.examCategory) {
      whereClauses.push("p.examCategory = ?");
      params.push(filters.examCategory);
    }
    if (filters.examName) {
      whereClauses.push("p.examName = ?");
      params.push(filters.examName);
    }
    if (filters.courseType) {
      whereClauses.push("p.courseType = ?");
      params.push(filters.courseType);
    }
    if (filters.languageMode) {
      whereClauses.push("p.languageMode = ?");
      params.push(filters.languageMode);
    }
    if (filters.search) {
      whereClauses.push("(p.title LIKE ? OR p.description LIKE ?)");
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.minPrice !== undefined) {
      whereClauses.push("p.salePrice >= ?");
      params.push(filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      whereClauses.push("p.salePrice <= ?");
      params.push(filters.maxPrice);
    }

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT p.*
        FROM Product p
        WHERE ${whereClauses.join(" AND ")}
        ORDER BY p.createdAt DESC
      `,
      ...params
    )) as ProductRow[];

    const productIds = rows.map((item) => item.id);
    const [linkedMap, demoMap, chapterSubSubjectMap, unlockedSet, packageMap, trialClaimMap] = await Promise.all([
      loadLinkedMockTestsByProductIds(productIds),
      loadDemoMockTestsByProductIds(productIds),
      loadChapterSubSubjectsByProductIds(productIds),
      loadUnlockedProductIdsForUser(studentUserId, productIds),
      loadPackagesByProductIds(productIds),
      loadTrialClaimsByProductIds(studentUserId, productIds),
    ]);
    const products = rows.map((row) =>
      {
        const linkedMockTests = linkedMap.get(row.id) || [];
        const demoMockTests = demoMap.get(row.id) || [];
        const tocTabPreset = resolveTocTabPreset(
          row,
          linkedMockTests,
          demoMockTests,
          chapterSubSubjectMap.get(row.id) || []
        );
        return serializeProduct(
          row,
          linkedMockTests,
          demoMockTests,
          unlockedSet.has(row.id),
          tocTabPreset,
          packageMap.get(row.id) || [],
          trialClaimMap.get(row.id) || null
        );
      }
    );

    const categories = Array.from(new Set(products.map((item) => item.examCategory))).sort();
    const exams = Array.from(new Set(products.map((item) => item.examName))).sort();
    const courseTypes = Array.from(new Set(products.map((item) => item.courseType))).sort();
    const languages = Array.from(
      new Set(
        products
          .map((item) => item.languageMode)
          .filter((value): value is string => Boolean(value))
      )
    ).sort();

    res.json({
      products,
      metadata: {
        categories,
        exams,
        courseTypes,
        languages,
      },
    });
  } catch (error) {
    next(error);
  }
});

productsRouter.post("/:productId/claim-trial", ...ensureStudent, async (req, res, next) => {
  try {
    const input = claimTrialSchema.parse(req.body || {});
    const userId = req.user!.userId;
    const productId = String(req.params.productId || "").trim();
    if (!productId) {
      throw new AppError("Product id is required.", 400);
    }

    const userRows = (await prisma.$queryRawUnsafe(
      `
        SELECT id, mobile
        FROM User
        WHERE id = ?
        LIMIT 1
      `,
      userId
    )) as Array<{ id: string; mobile: string | null }>;
    const user = userRows[0];
    if (!user) {
      throw new AppError("Student not found.", 404);
    }

    const { product } = await getCheckoutSelection(productId, null);
    const trialEnabled = Boolean(Number(product.trialEnabled) === 1 || product.trialEnabled === true);
    const trialDays = Number(product.trialDays || 0);
    if (!trialEnabled || !(trialDays > 0)) {
      throw new AppError("Free trial is not enabled for this product.", 400);
    }

    const mobile = String(user.mobile || "").trim();
    if (!mobile) {
      throw new AppError("Student mobile number is missing.", 400);
    }

    const existingRows = (await prisma.$queryRawUnsafe(
      `
        SELECT id
        FROM ProductTrialClaim
        WHERE productId = ?
          AND (mobile = ? OR deviceFingerprint = ?)
        LIMIT 1
      `,
      productId,
      mobile,
      input.deviceFingerprint
    ).catch((error: unknown) => {
      const message = String((error as { message?: string })?.message || "").toLowerCase();
      const missingTable =
        (message.includes("1146") || message.includes("p2010")) && message.includes("producttrialclaim");
      if (missingTable) return [];
      throw error;
    })) as Array<{ id: string }>;

    if (existingRows.length) {
      throw new AppError("Free trial has already been used for this product on this device or mobile number.", 400);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO ProductTrialClaim
        (id, userId, productId, mobile, deviceFingerprint, trialDays, claimedAt, expiresAt, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      randomUUID(),
      userId,
      productId,
      mobile,
      input.deviceFingerprint,
      trialDays,
      now,
      expiresAt,
      now,
      now
    );

    res.status(201).json({
      message: `Free trial activated for ${trialDays} day${trialDays === 1 ? "" : "s"}.`,
      trial: {
        productId,
        days: trialDays,
        claimedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        isActive: true,
      },
    });
  } catch (error) {
    next(error);
  }
});

productsRouter.post("/:productId/checkout-preview", ...ensureStudent, async (req, res, next) => {
  try {
    const input = buyWithWalletSchema.parse(req.body || {});
    const userId = req.user!.userId;
    const productId = String(req.params.productId || "").trim();
    if (!productId) {
      throw new AppError("Product id is required.", 400);
    }

    const userRows = (await prisma.$queryRawUnsafe(
      `
        SELECT id
        FROM User
        WHERE id = ?
        LIMIT 1
      `,
      userId
    )) as Array<{ id: string }>;
    const user = userRows[0];
    if (!user) {
      throw new AppError("Student not found.", 404);
    }

    const { product, selectedPackage } = await getCheckoutSelection(productId, input.packageId);
    const includeDefaultOffer = input.includeDefaultOffer !== false;
    const friendOffer = await resolveReferrerForFriendOffer(userId, input.referralCode || "");
    const pricing = buildOfferPricing(
      product,
      includeDefaultOffer,
      Boolean(friendOffer.appliedReferralCode),
      selectedPackage
    );
    const walletBalance = await getWalletBalance(userId);
    const wallet = resolveWalletAdjustment(pricing.payableAmount, walletBalance, input.walletUseAmount);

    res.json({
      product: {
        id: product.id,
        title: product.title,
        selectedPackage: selectedPackage
          ? {
              id: selectedPackage.id,
              title: selectedPackage.title,
              price: normalizeAmount(selectedPackage.price),
            }
          : null,
      },
      offers: {
        includeDefaultOffer,
        defaultOfferPercent: pricing.defaultOfferPercent,
        appliedReferralCode: friendOffer.appliedReferralCode,
      },
      pricing: {
        listPrice: pricing.listPrice,
        currentPrice: pricing.currentPrice,
        defaultOfferDiscount: pricing.defaultOfferDiscount,
        friendDiscountConfigured: pricing.friendDiscountConfigured,
        friendDiscountApplied: pricing.friendDiscountApplied,
        payableBeforeWallet: wallet.payableBeforeWallet,
        walletAvailable: wallet.walletAvailable,
        walletRequested: wallet.walletRequested,
        walletUsed: wallet.walletUsed,
        payableAmount: wallet.payableAfterWallet,
      },
    });
  } catch (error) {
    next(error);
  }
});

productsRouter.post("/:productId/buy", ...ensureStudent, async (req, res, next) => {
  try {
    const input = buyWithWalletSchema.parse(req.body || {});
    const userId = req.user!.userId;
    const productId = String(req.params.productId || "").trim();
    if (!productId) {
      throw new AppError("Product id is required.", 400);
    }

    const userRows = (await prisma.$queryRawUnsafe(
      `
        SELECT id, referrerId
        FROM User
        WHERE id = ?
        LIMIT 1
      `,
      userId
    )) as Array<{ id: string; referrerId: string | null }>;
    const user = userRows[0];
    if (!user) {
      throw new AppError("Student not found.", 404);
    }

    const { product, selectedPackage } = await getCheckoutSelection(productId, input.packageId);
    const existingPurchase = await getExistingProductPurchase(userId, productId);
    if (existingPurchase) {
      res.status(200).json(buildAlreadyOwnedResponse(existingPurchase));
      return;
    }

    const includeDefaultOffer = input.includeDefaultOffer !== false;
    const friendOffer = await resolveReferrerForFriendOffer(userId, input.referralCode || "");

    let purchaseReferrerId = user.referrerId || null;
    if (friendOffer.referrerId) {
      purchaseReferrerId = friendOffer.referrerId;
    }

    const pricing = buildOfferPricing(
      product,
      includeDefaultOffer,
      Boolean(friendOffer.appliedReferralCode),
      selectedPackage
    );
    const walletBalance = await getWalletBalance(userId);
    const wallet = resolveWalletAdjustment(pricing.payableAmount, walletBalance, input.walletUseAmount);
    if (wallet.payableAfterWallet > 0) {
      const paymentEvidence = input.paymentEvidence;
      const consumeResult = consumeVerifiedPaymentEvidence({
        userId,
        razorpayOrderId: paymentEvidence?.razorpay_order_id || "",
        razorpayPaymentId: paymentEvidence?.razorpay_payment_id || "",
        expectedAmountInPaise: Math.round(wallet.payableAfterWallet * 100),
        expectedCurrency: "INR",
      });
      if (!consumeResult.ok) {
        throw new AppError(
          `${consumeResult.message} Complete Razorpay payment before purchase access is granted.`,
          402
        );
      }
    }

    const referralBonusAmount = normalizeAmount(product.referralBonusAmount ?? 0);
    const bonusToCredit = purchaseReferrerId && referralBonusAmount > 0 ? referralBonusAmount : 0;

    const now = new Date();
    const purchaseId = randomUUID();
    const referralTxnId = randomUUID();
    const walletTxnId = randomUUID();

    const statements = [
      prisma.$executeRawUnsafe(
        `
          INSERT INTO ProductPurchase
          (
            id,
            userId,
            productId,
            amountPaid,
            walletUsed,
            referralBonusCredited,
            packageId,
            packageTitle,
            packagePrice,
            createdAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        purchaseId,
        userId,
        productId,
        wallet.payableAfterWallet,
        wallet.walletUsed,
        bonusToCredit,
        selectedPackage?.id || null,
        selectedPackage?.title || null,
        selectedPackage ? normalizeAmount(selectedPackage.price) : null,
        now
      ),
    ];

    if (wallet.walletUsed > 0) {
      statements.push(
        prisma.$executeRawUnsafe(
          `
            INSERT INTO ReferralTransaction
            (
              id,
              userId,
              amount,
              type,
              description,
              purchaseId,
              withdrawalId,
              createdAt
            )
            VALUES (?, ?, ?, 'PRODUCT_PURCHASE', ?, ?, NULL, ?)
          `,
          walletTxnId,
          userId,
          -wallet.walletUsed,
          friendOffer.appliedReferralCode
            ? `Wallet used: ${String(product.title || "Product")} (code ${friendOffer.appliedReferralCode}, saved ${pricing.friendDiscountApplied.toFixed(2)})`
            : `Wallet used: ${String(product.title || "Product")}`,
          purchaseId,
          now
        )
      );
    }

    if (bonusToCredit > 0 && purchaseReferrerId) {
      statements.push(
        prisma.$executeRawUnsafe(
          `
            INSERT INTO ReferralTransaction
            (
              id,
              userId,
              amount,
              type,
              description,
              purchaseId,
              withdrawalId,
              createdAt
            )
            VALUES (?, ?, ?, 'REFERRAL_BONUS', ?, ?, NULL, ?)
          `,
          referralTxnId,
          purchaseReferrerId,
          bonusToCredit,
          `Referral bonus from ${String(product.title || "product")} purchase`,
          purchaseId,
          now
        )
      );
    }

    await prisma.$transaction(statements);
    const nextWalletBalance = normalizeAmount(walletBalance - wallet.walletUsed);

    res.status(201).json({
      message: "Product purchased successfully.",
      purchase: {
        id: purchaseId,
        productId,
        amountPaid: wallet.payableAfterWallet,
        walletUsed: wallet.walletUsed,
        packageId: selectedPackage?.id || null,
        packageTitle: selectedPackage?.title || null,
        packagePrice: selectedPackage ? normalizeAmount(selectedPackage.price) : null,
        listPrice: pricing.listPrice,
        currentPrice: pricing.currentPrice,
        defaultOfferApplied: includeDefaultOffer,
        defaultOfferDiscount: pricing.defaultOfferDiscount,
        referralDiscountApplied: pricing.friendDiscountApplied,
        appliedReferralCode: friendOffer.appliedReferralCode,
        referralBonusCredited: bonusToCredit,
        createdAt: now.toISOString(),
      },
      walletBalance: nextWalletBalance,
    });
  } catch (error) {
    next(error);
  }
});

productsRouter.post("/:productId/buy-with-wallet", ...ensureStudent, async (req, res, next) => {
  try {
    const input = buyWithWalletSchema.parse(req.body || {});
    const userId = req.user!.userId;
    const productId = String(req.params.productId || "").trim();
    if (!productId) {
      throw new AppError("Product id is required.", 400);
    }

    const userRows = (await prisma.$queryRawUnsafe(
      `
        SELECT id, referrerId
        FROM User
        WHERE id = ?
        LIMIT 1
      `,
      userId
    )) as Array<{ id: string; referrerId: string | null }>;
    const user = userRows[0];
    if (!user) {
      throw new AppError("Student not found.", 404);
    }

    const { product, selectedPackage } = await getCheckoutSelection(productId, input.packageId);
    const existingPurchase = await getExistingProductPurchase(userId, productId);
    if (existingPurchase) {
      res.status(200).json(buildAlreadyOwnedResponse(existingPurchase));
      return;
    }

    const includeDefaultOffer = input.includeDefaultOffer !== false;
    const friendOffer = await resolveReferrerForFriendOffer(userId, input.referralCode || "");

    let purchaseReferrerId = user.referrerId || null;
    if (friendOffer.referrerId) {
      purchaseReferrerId = friendOffer.referrerId;
    }

    const pricing = buildOfferPricing(
      product,
      includeDefaultOffer,
      Boolean(friendOffer.appliedReferralCode),
      selectedPackage
    );

    const walletBalance = await getWalletBalance(userId);
    if (walletBalance < pricing.payableAmount) {
      throw new AppError("Insufficient referral wallet balance.", 400);
    }

    const referralBonusAmount = normalizeAmount(product.referralBonusAmount ?? 0);
    const bonusToCredit = purchaseReferrerId && referralBonusAmount > 0 ? referralBonusAmount : 0;

    const now = new Date();
    const purchaseId = randomUUID();
    const buyerTxnId = randomUUID();
    const referralTxnId = randomUUID();

    const statements = [
      prisma.$executeRawUnsafe(
        `
          INSERT INTO ProductPurchase
          (
            id,
            userId,
            productId,
            amountPaid,
            walletUsed,
            referralBonusCredited,
            packageId,
            packageTitle,
            packagePrice,
            createdAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        purchaseId,
        userId,
        productId,
        pricing.payableAmount,
        pricing.payableAmount,
        bonusToCredit,
        selectedPackage?.id || null,
        selectedPackage?.title || null,
        selectedPackage ? normalizeAmount(selectedPackage.price) : null,
        now
      ),
      prisma.$executeRawUnsafe(
        `
          INSERT INTO ReferralTransaction
          (
            id,
            userId,
            amount,
            type,
            description,
            purchaseId,
            withdrawalId,
            createdAt
          )
          VALUES (?, ?, ?, 'PRODUCT_PURCHASE', ?, ?, NULL, ?)
        `,
        buyerTxnId,
        userId,
        -pricing.payableAmount,
        friendOffer.appliedReferralCode
          ? `Wallet purchase: ${String(product.title || "Product")} (code ${friendOffer.appliedReferralCode}, saved ${pricing.friendDiscountApplied.toFixed(2)})`
          : `Wallet purchase: ${String(product.title || "Product")}`,
        purchaseId,
        now
      ),
    ];

    if (bonusToCredit > 0 && purchaseReferrerId) {
      statements.push(
        prisma.$executeRawUnsafe(
          `
            INSERT INTO ReferralTransaction
            (
              id,
              userId,
              amount,
              type,
              description,
              purchaseId,
              withdrawalId,
              createdAt
            )
            VALUES (?, ?, ?, 'REFERRAL_BONUS', ?, ?, NULL, ?)
          `,
          referralTxnId,
          purchaseReferrerId,
          bonusToCredit,
          `Referral bonus from ${String(product.title || "product")} purchase`,
          purchaseId,
          now
        )
      );
    }

    await prisma.$transaction(statements);

    const nextWalletBalance = normalizeAmount(walletBalance - pricing.payableAmount);

    res.status(201).json({
      message: "Product purchased successfully using referral wallet.",
      purchase: {
        id: purchaseId,
        productId,
        amountPaid: pricing.payableAmount,
        walletUsed: pricing.payableAmount,
        packageId: selectedPackage?.id || null,
        packageTitle: selectedPackage?.title || null,
        packagePrice: selectedPackage ? normalizeAmount(selectedPackage.price) : null,
        listPrice: pricing.listPrice,
        currentPrice: pricing.currentPrice,
        defaultOfferApplied: includeDefaultOffer,
        defaultOfferDiscount: pricing.defaultOfferDiscount,
        referralDiscountApplied: pricing.friendDiscountApplied,
        appliedReferralCode: friendOffer.appliedReferralCode,
        referralBonusCredited: bonusToCredit,
        createdAt: now.toISOString(),
      },
      walletBalance: nextWalletBalance,
    });
  } catch (error) {
    next(error);
  }
});
