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

const parseAddons = (value: unknown): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0);
      }
    } catch {
      return [];
    }
  }

  return [];
};

const toLinkedMockTest = (row: ProductMockTestRow) => ({
  id: row.mockTestId,
  title: row.mockTestTitle,
  examType: row.mockTestExamType,
  subject: row.mockTestSubject,
  accessCode: normalizeAccessCode(row.mockTestAccessCode),
  isActive: toBoolean(row.mockTestIsActive),
});

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
        mar.accessCode AS mockTestAccessCode,
        mt.isActive AS mockTestIsActive
      FROM ProductMockTest pmt
      INNER JOIN MockTest mt ON mt.id = pmt.mockTestId
      LEFT JOIN MockTestAccessRule mar ON mar.mockTestId = mt.id
      WHERE pmt.productId IN (${placeholders})
      ORDER BY pmt.productId ASC, mt.createdAt DESC
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
        pdmt.productId,
        pdmt.mockTestId,
        mt.title AS mockTestTitle,
        mt.examType AS mockTestExamType,
        mt.subject AS mockTestSubject,
        mar.accessCode AS mockTestAccessCode,
        mt.isActive AS mockTestIsActive
      FROM ProductDemoMockTest pdmt
      INNER JOIN MockTest mt ON mt.id = pdmt.mockTestId
      LEFT JOIN MockTestAccessRule mar ON mar.mockTestId = mt.id
      WHERE pdmt.productId IN (${placeholders})
      ORDER BY pdmt.productId ASC, mt.createdAt DESC
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
  isPremiumUnlocked = false
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
    const [linkedMap, demoMap, unlockedSet] = await Promise.all([
      loadLinkedMockTestsByProductIds(productIds),
      loadDemoMockTestsByProductIds(productIds),
      loadUnlockedProductIdsForUser(studentUserId, productIds),
    ]);
    const products = rows.map((row) =>
      serializeProduct(
        row,
        linkedMap.get(row.id) || [],
        demoMap.get(row.id) || [],
        unlockedSet.has(row.id)
      )
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
        payableAmount: pricing.payableAmount,
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
    const referralBonusAmount = normalizeAmount(product.referralBonusAmount ?? 0);
    const bonusToCredit = purchaseReferrerId && referralBonusAmount > 0 ? referralBonusAmount : 0;

    const now = new Date();
    const purchaseId = randomUUID();
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
        0,
        bonusToCredit,
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

    res.status(201).json({
      message: "Product purchased successfully.",
      purchase: {
        id: purchaseId,
        productId,
        amountPaid: pricing.payableAmount,
        walletUsed: 0,
        listPrice: pricing.listPrice,
        currentPrice: pricing.currentPrice,
        defaultOfferApplied: includeDefaultOffer,
        defaultOfferDiscount: pricing.defaultOfferDiscount,
        referralDiscountApplied: pricing.friendDiscountApplied,
        appliedReferralCode: friendOffer.appliedReferralCode,
        referralBonusCredited: bonusToCredit,
        createdAt: now.toISOString(),
      },
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
