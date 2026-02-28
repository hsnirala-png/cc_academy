import { randomUUID } from "node:crypto";
import { Role } from "@prisma/client";
import { Request, Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { getReferrerIdByCode, getWalletBalance, normalizeAmount } from "../modules/referrals/referral.utils";
import { AppError } from "../utils/appError";
import { ensureMockTestAccessStorageReady } from "../utils/mockTestAccessStorage";
import { verifyToken } from "../utils/jwt";
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
  isActive: number | boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type ProductMockTestRow = {
  productId: string;
  mockTestId: string;
  mockTestTitle: string;
  mockTestExamType: string;
  mockTestSubject: string;
  mockTestAccessCode: string | null;
  mockTestIsActive: number | boolean;
  mockTestHasLessonContext?: number | boolean | null;
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

const toLinkedMockTest = (row: ProductMockTestRow) => ({
  id: row.mockTestId,
  title: row.mockTestTitle,
  examType: row.mockTestExamType,
  subject: row.mockTestSubject,
  accessCode: normalizeAccessCode(row.mockTestAccessCode),
  isActive: toBoolean(row.mockTestIsActive),
  hasLessonContext: toBoolean(row.mockTestHasLessonContext),
});

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
        mt.title AS mockTestTitle,
        mt.examType AS mockTestExamType,
        mt.subject AS mockTestSubject,
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
        ) AS mockTestHasLessonContext
      FROM ProductMockTest pmt
      INNER JOIN MockTest mt ON mt.id = pmt.mockTestId
      WHERE pmt.productId IN (${placeholders})
      ORDER BY pmt.productId ASC, pmt.createdAt ASC, mt.createdAt ASC
    `,
    ...productIds
  )) as ProductMockTestRow[];

  const grouped = new Map<string, ReturnType<typeof toLinkedMockTest>[]>();
  rows.forEach((row) => {
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
        linked.productId,
        linked.mockTestId,
        mt.title AS mockTestTitle,
        mt.examType AS mockTestExamType,
        mt.subject AS mockTestSubject,
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
        ) AS mockTestHasLessonContext
      FROM (
        SELECT
          rawLinks.productId,
          rawLinks.mockTestId,
          MIN(rawLinks.linkCreatedAt) AS linkCreatedAt
        FROM (
          SELECT
            pdmt.productId,
            pdmt.mockTestId,
            pdmt.createdAt AS linkCreatedAt
          FROM ProductDemoMockTest pdmt
          WHERE pdmt.productId IN (${placeholders})

          UNION ALL

          SELECT
            pmt.productId,
            pmt.mockTestId,
            pmt.createdAt AS linkCreatedAt
          FROM ProductMockTest pmt
          WHERE pmt.productId IN (${placeholders})
            AND UPPER(
              COALESCE(
                (
                  SELECT mar2.accessCode
                  FROM MockTestAccessRule mar2
                  WHERE mar2.mockTestId = pmt.mockTestId
                  ORDER BY mar2.updatedAt DESC, mar2.createdAt DESC
                  LIMIT 1
                ),
                'DEMO'
              )
            ) LIKE 'DEMO%'
        ) rawLinks
        GROUP BY rawLinks.productId, rawLinks.mockTestId
      ) linked
      INNER JOIN MockTest mt ON mt.id = linked.mockTestId
      ORDER BY linked.productId ASC, linked.linkCreatedAt ASC, mt.createdAt ASC
    `,
    ...productIds,
    ...productIds
  )) as ProductMockTestRow[];

  const grouped = new Map<string, ReturnType<typeof toLinkedMockTest>[]>();
  rows.forEach((row) => {
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
  if (!userId || !productIds.length) return new Set<string>();
  const placeholders = productIds.map(() => "?").join(", ");
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT DISTINCT unlocked.productId
        FROM (
          SELECT pp.productId
          FROM ProductPurchase pp
          WHERE pp.userId = ?
          UNION
          SELECT spa.productId
          FROM StudentProductAccess spa
          WHERE spa.userId = ?
        ) unlocked
        WHERE unlocked.productId IN (${placeholders})
      `,
      userId,
      userId,
      ...productIds
    )) as Array<{ productId: string }>;
    return new Set(rows.map((item) => item.productId));
  } catch (error) {
    const message = String((error as { message?: string })?.message || "").toLowerCase();
    const missingPurchaseTable =
      message.includes("1146") &&
      (message.includes("productpurchase") || message.includes("product purchase"));
    if (!missingPurchaseTable) throw error;

    const assignedOnlyRows = (await prisma.$queryRawUnsafe(
      `
        SELECT DISTINCT spa.productId
        FROM StudentProductAccess spa
        WHERE spa.userId = ?
          AND spa.productId IN (${placeholders})
      `,
      userId,
      ...productIds
    )) as Array<{ productId: string }>;
    return new Set(assignedOnlyRows.map((item) => item.productId));
  }
};

const serializeProduct = (
  row: ProductRow,
  linkedMockTests: ReturnType<typeof toLinkedMockTest>[] = [],
  demoMockTests: ReturnType<typeof toLinkedMockTest>[] = [],
  isPremiumUnlocked = false,
  tocTabPreset: TocTabPreset = null
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
    thumbnailUrl: row.thumbnailUrl,
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
    linkedMockTests,
    demoMockTests,
    tocTabPreset,
    isPremiumUnlocked,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
};

const buyWithWalletSchema = z.object({
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
  isActive: number | boolean;
};

const getCheckoutProduct = async (productId: string): Promise<CheckoutProductRow> => {
  const productRows = (await prisma.$queryRawUnsafe(
    `
      SELECT id, title, listPrice, salePrice, referralBonusAmount, isActive
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
  return product;
};

const buildOfferPricing = (product: CheckoutProductRow, includeDefaultOffer: boolean, applyFriendOffer: boolean) => {
  const listPrice = normalizeAmount(product.listPrice);
  const salePrice = normalizeAmount(product.salePrice);
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
    const [linkedMap, demoMap, chapterSubSubjectMap, unlockedSet] = await Promise.all([
      loadLinkedMockTestsByProductIds(productIds),
      loadDemoMockTestsByProductIds(productIds),
      loadChapterSubSubjectsByProductIds(productIds),
      loadUnlockedProductIdsForUser(studentUserId, productIds),
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
          tocTabPreset
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

    const product = await getCheckoutProduct(productId);
    const includeDefaultOffer = input.includeDefaultOffer !== false;
    const friendOffer = await resolveReferrerForFriendOffer(userId, input.referralCode || "");
    const pricing = buildOfferPricing(product, includeDefaultOffer, Boolean(friendOffer.appliedReferralCode));
    const walletBalance = await getWalletBalance(userId);
    const wallet = resolveWalletAdjustment(pricing.payableAmount, walletBalance, input.walletUseAmount);

    res.json({
      product: {
        id: product.id,
        title: product.title,
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

    const product = await getCheckoutProduct(productId);
    const includeDefaultOffer = input.includeDefaultOffer !== false;
    const friendOffer = await resolveReferrerForFriendOffer(userId, input.referralCode || "");

    let purchaseReferrerId = user.referrerId || null;
    if (friendOffer.referrerId) {
      purchaseReferrerId = friendOffer.referrerId;
    }

    const pricing = buildOfferPricing(product, includeDefaultOffer, Boolean(friendOffer.appliedReferralCode));
    const walletBalance = await getWalletBalance(userId);
    const wallet = resolveWalletAdjustment(pricing.payableAmount, walletBalance, input.walletUseAmount);
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
            createdAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        purchaseId,
        userId,
        productId,
        wallet.payableAfterWallet,
        wallet.walletUsed,
        bonusToCredit,
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

    const product = await getCheckoutProduct(productId);
    const includeDefaultOffer = input.includeDefaultOffer !== false;
    const friendOffer = await resolveReferrerForFriendOffer(userId, input.referralCode || "");

    let purchaseReferrerId = user.referrerId || null;
    if (friendOffer.referrerId) {
      purchaseReferrerId = friendOffer.referrerId;
    }

    const pricing = buildOfferPricing(product, includeDefaultOffer, Boolean(friendOffer.appliedReferralCode));

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
            createdAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        purchaseId,
        userId,
        productId,
        pricing.payableAmount,
        pricing.payableAmount,
        bonusToCredit,
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
