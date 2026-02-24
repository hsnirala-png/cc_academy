import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { AppError } from "../utils/appError";
import { ensureMockTestAccessStorageReady } from "../utils/mockTestAccessStorage";
import { resolvePublicAssetsDir } from "../utils/publicAssetsPath";
import { ensureProductStorageReady } from "../utils/productStorage";
import { prisma } from "../utils/prisma";

export const adminProductsRouter = Router();

const ensureAdmin = [requireAuth, requireRole(Role.ADMIN)] as const;

adminProductsRouter.use("/products", async (_req, _res, next) => {
  try {
    await Promise.all([ensureProductStorageReady(), ensureMockTestAccessStorageReady()]);
    next();
  } catch (error) {
    next(error);
  }
});

const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value === "string" && value.trim() === "") return undefined;
      return value;
    },
    z.string().trim().max(max).optional()
  );

const optionalBoolean = z.preprocess((value) => {
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return value;
}, z.boolean().optional());

const optionalPositiveNumber = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return value;
  },
  z.coerce.number().positive().optional()
);

const optionalNonNegativeNumber = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return value;
  },
  z.coerce.number().min(0).optional()
);

const addonsSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value;
}, z.array(z.string().trim().min(1).max(120)).max(30).optional());

const createProductSchema = z.object({
  title: z.string().trim().min(2).max(180),
  examCategory: z.string().trim().min(2).max(120),
  examName: z.string().trim().min(2).max(120),
  courseType: z.string().trim().min(2).max(120),
  languageMode: optionalTrimmedString(60),
  thumbnailUrl: optionalTrimmedString(800),
  description: optionalTrimmedString(4000),
  listPrice: z.coerce.number().positive(),
  salePrice: z.coerce.number().positive(),
  referralBonusAmount: optionalNonNegativeNumber,
  referralDiscountAmount: optionalNonNegativeNumber,
  accessDays: z.coerce.number().int().positive(),
  validityLabel: optionalTrimmedString(120),
  addons: addonsSchema,
  demoLessonTitle: optionalTrimmedString(191),
  demoLessonUrl: optionalTrimmedString(1000),
  mockTestIds: z.array(z.string().trim().min(1)).max(200).optional(),
  demoMockTestIds: z.array(z.string().trim().min(1)).max(200).optional(),
  isActive: optionalBoolean,
});

const updateProductSchema = createProductSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "No product updates provided");

const uploadThumbnailSchema = z.object({
  fileName: z.string().trim().min(1).max(255).optional(),
  dataUrl: z.string().trim().min(1),
});

const listProductsSchema = z.object({
  examCategory: optionalTrimmedString(120),
  examName: optionalTrimmedString(120),
  courseType: optionalTrimmedString(120),
  languageMode: optionalTrimmedString(60),
  search: optionalTrimmedString(180),
  minPrice: optionalPositiveNumber,
  maxPrice: optionalPositiveNumber,
  isActive: optionalBoolean,
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
  createdBy: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdByUserId?: string | null;
  createdByUserName?: string | null;
  createdByUserMobile?: string | null;
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

type ProductDemoMockTestRow = {
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

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  return Number(value) === 1;
};

const toIso = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
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

const normalizeAccessCode = (value: unknown): "DEMO" | "MOCK" | "LESSON" => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (normalized === "MOCK" || normalized === "LESSON") return normalized;
  return "DEMO";
};

const toLinkedMockTest = (row: ProductMockTestRow) => ({
  id: row.mockTestId,
  title: row.mockTestTitle,
  examType: row.mockTestExamType,
  subject: row.mockTestSubject,
  accessCode: normalizeAccessCode(row.mockTestAccessCode),
  isActive: toBoolean(row.mockTestIsActive),
});

const loadMockTestsByProductIds = async (productIds: string[]) => {
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
  )) as ProductDemoMockTestRow[];

  const grouped = new Map<string, ReturnType<typeof toLinkedMockTest>[]>();
  rows.forEach((row) => {
    const list = grouped.get(row.productId) || [];
    list.push(toLinkedMockTest(row));
    grouped.set(row.productId, list);
  });
  return grouped;
};

const serializeProduct = (
  row: ProductRow,
  linkedMockTests: ReturnType<typeof toLinkedMockTest>[] = [],
  linkedDemoMockTests: ReturnType<typeof toLinkedMockTest>[] = []
) => {
  const listPrice = toNumber(row.listPrice);
  const salePrice = toNumber(row.salePrice);

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
    referralBonusAmount: toNumber(row.referralBonusAmount),
    referralDiscountAmount: toNumber(row.referralDiscountAmount),
    accessDays: Number(row.accessDays),
    validityLabel: row.validityLabel,
    addons: parseAddons(row.addons),
    demoLessonTitle: row.demoLessonTitle || null,
    demoLessonUrl: row.demoLessonUrl || null,
    isActive: toBoolean(row.isActive),
    createdBy: row.createdBy,
    createdByUser: row.createdByUserId
      ? {
          id: row.createdByUserId,
          name: row.createdByUserName || "",
          mobile: row.createdByUserMobile || "",
        }
      : null,
    linkedMockTests,
    linkedDemoMockTests,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
};

const assertPricing = (listPrice: number, salePrice: number) => {
  if (salePrice > listPrice) {
    throw new AppError("Sale price cannot be greater than list price", 400);
  }
};

const assertReferralDiscount = (salePrice: number, referralDiscountAmount: number) => {
  if (referralDiscountAmount < 0) {
    throw new AppError("Referral friend discount cannot be negative.", 400);
  }
  if (referralDiscountAmount > salePrice) {
    throw new AppError("Referral friend discount cannot be greater than sale price.", 400);
  }
};

const mimeTypeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const productsUploadDir = path.join(resolvePublicAssetsDir(), "uploads", "products");

const parseDataUrl = (dataUrl: string): { mimeType: string; buffer: Buffer } => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new AppError("Invalid image data. Please upload a valid image file.", 400);
  }

  const mimeType = match[1].toLowerCase();
  const base64Data = match[2];
  const extension = mimeTypeToExtension[mimeType];

  if (!extension) {
    throw new AppError("Only JPG, PNG, WEBP, and GIF images are allowed.", 400);
  }

  const buffer = Buffer.from(base64Data, "base64");
  if (!buffer.length) {
    throw new AppError("Uploaded image is empty.", 400);
  }

  const maxSizeBytes = 5 * 1024 * 1024;
  if (buffer.length > maxSizeBytes) {
    throw new AppError("Image size must be 5MB or less.", 400);
  }

  return { mimeType, buffer };
};

const validateMockTestIds = async (mockTestIds: string[]) => {
  if (!mockTestIds.length) return [];
  const unique = Array.from(new Set(mockTestIds.map((item) => String(item || "").trim()).filter(Boolean)));
  if (!unique.length) return [];
  const placeholders = unique.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT id
      FROM MockTest
      WHERE id IN (${placeholders})
    `,
    ...unique
  )) as Array<{ id: string }>;
  const validSet = new Set(rows.map((item) => item.id));
  const invalid = unique.filter((id) => !validSet.has(id));
  if (invalid.length) {
    throw new AppError("One or more linked mock tests were not found.", 400);
  }
  return unique;
};

const syncProductMockTests = async (productId: string, mockTestIds: string[]) => {
  const validIds = await validateMockTestIds(mockTestIds);
  await prisma.$executeRawUnsafe("DELETE FROM ProductMockTest WHERE productId = ?", productId);
  if (!validIds.length) return;

  const now = new Date();
  await Promise.all(
    validIds.map((mockTestId) =>
      prisma.$executeRawUnsafe(
        `
          INSERT INTO ProductMockTest (productId, mockTestId, createdAt)
          VALUES (?, ?, ?)
        `,
        productId,
        mockTestId,
        now
      )
    )
  );
};

const syncProductDemoMockTests = async (productId: string, mockTestIds: string[]) => {
  const validIds = await validateMockTestIds(mockTestIds);
  await prisma.$executeRawUnsafe("DELETE FROM ProductDemoMockTest WHERE productId = ?", productId);
  if (!validIds.length) return;

  const now = new Date();
  await Promise.all(
    validIds.map((mockTestId) =>
      prisma.$executeRawUnsafe(
        `
          INSERT INTO ProductDemoMockTest (productId, mockTestId, createdAt)
          VALUES (?, ?, ?)
        `,
        productId,
        mockTestId,
        now
      )
    )
  );
};

adminProductsRouter.post(
  "/products/thumbnail-upload",
  ...ensureAdmin,
  async (req, res, next) => {
    try {
      await ensureProductStorageReady();
      const input = uploadThumbnailSchema.parse(req.body);
      const { mimeType, buffer } = parseDataUrl(input.dataUrl);
      const extension = mimeTypeToExtension[mimeType];
      const fileName = `${randomUUID()}.${extension}`;

      await mkdir(productsUploadDir, { recursive: true });
      const absoluteFilePath = path.join(productsUploadDir, fileName);
      await writeFile(absoluteFilePath, buffer);

      res.status(201).json({
        thumbnailUrl: `/public/uploads/products/${fileName}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

adminProductsRouter.get("/products/mock-tests", ...ensureAdmin, async (_req, res, next) => {
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          mt.id,
          mt.title,
          mt.examType,
          mt.subject,
          mt.streamChoice,
          mt.languageMode,
          mt.isActive,
          COALESCE(mar.accessCode, 'DEMO') AS accessCode,
          mt.createdAt
        FROM MockTest mt
        LEFT JOIN MockTestAccessRule mar ON mar.mockTestId = mt.id
        WHERE mt.isActive = 1
        ORDER BY mt.createdAt DESC
      `
    )) as Array<{
      id: string;
      title: string;
      examType: string;
      subject: string;
      streamChoice: string | null;
      languageMode: string | null;
      isActive: number | boolean;
      accessCode: string | null;
    }>;

    res.json({
      mockTests: rows.map((item) => ({
        id: item.id,
        title: item.title,
        examType: item.examType,
        subject: item.subject,
        streamChoice: item.streamChoice,
        languageMode: item.languageMode,
        isActive: toBoolean(item.isActive),
        accessCode: normalizeAccessCode(item.accessCode),
      })),
    });
  } catch (error) {
    next(error);
  }
});

const fetchOneProduct = async (id: string) => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        p.*,
        u.id AS createdByUserId,
        u.name AS createdByUserName,
        u.mobile AS createdByUserMobile
      FROM Product p
      LEFT JOIN User u ON u.id = p.createdBy
      WHERE p.id = ?
      LIMIT 1
    `,
    id
  )) as ProductRow[];

  return rows[0] || null;
};

const fetchSerializedProduct = async (id: string) => {
  const product = await fetchOneProduct(id);
  if (!product) return null;
  const [linkedMap, linkedDemoMap] = await Promise.all([
    loadMockTestsByProductIds([id]),
    loadDemoMockTestsByProductIds([id]),
  ]);
  return serializeProduct(product, linkedMap.get(id) || [], linkedDemoMap.get(id) || []);
};

adminProductsRouter.get("/products", ...ensureAdmin, async (req, res, next) => {
  try {
    const filters = listProductsSchema.parse(req.query);

    const whereClauses: string[] = [];
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
    if (typeof filters.isActive === "boolean") {
      whereClauses.push("p.isActive = ?");
      params.push(filters.isActive ? 1 : 0);
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

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          p.*,
          u.id AS createdByUserId,
          u.name AS createdByUserName,
          u.mobile AS createdByUserMobile
        FROM Product p
        LEFT JOIN User u ON u.id = p.createdBy
        ${whereSQL}
        ORDER BY p.createdAt DESC
      `,
      ...params
    )) as ProductRow[];
    const productIds = rows.map((item) => item.id);
    const [linkedMap, linkedDemoMap] = await Promise.all([
      loadMockTestsByProductIds(productIds),
      loadDemoMockTestsByProductIds(productIds),
    ]);

    res.json({
      products: rows.map((row) =>
        serializeProduct(row, linkedMap.get(row.id) || [], linkedDemoMap.get(row.id) || [])
      ),
    });
  } catch (error) {
    next(error);
  }
});

adminProductsRouter.post("/products", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = createProductSchema.parse(req.body);
    assertPricing(input.listPrice, input.salePrice);
    assertReferralDiscount(input.salePrice, input.referralDiscountAmount ?? 0);

    const productId = randomUUID();
    const now = new Date();

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO Product
        (
          id,
          title,
          examCategory,
          examName,
          courseType,
          languageMode,
          thumbnailUrl,
          description,
          listPrice,
          salePrice,
          referralBonusAmount,
          referralDiscountAmount,
          accessDays,
          validityLabel,
          addons,
          demoLessonTitle,
          demoLessonUrl,
          isActive,
          createdBy,
          createdAt,
          updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      productId,
      input.title,
      input.examCategory,
      input.examName,
      input.courseType,
      input.languageMode ?? null,
      input.thumbnailUrl ?? null,
      input.description ?? null,
        input.listPrice,
        input.salePrice,
        input.referralBonusAmount ?? 0,
        input.referralDiscountAmount ?? 0,
        input.accessDays,
      input.validityLabel ?? null,
      JSON.stringify(input.addons ?? []),
      input.demoLessonTitle ?? null,
      input.demoLessonUrl ?? null,
      input.isActive ?? true,
      req.user!.userId,
      now,
      now
    );
    await Promise.all([
      syncProductMockTests(productId, input.mockTestIds || []),
      syncProductDemoMockTests(productId, input.demoMockTestIds || []),
    ]);

    const product = await fetchSerializedProduct(productId);
    if (!product) throw new AppError("Product creation failed", 500);

    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
});

adminProductsRouter.patch("/products/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    const productId = req.params.id;
    const updates = updateProductSchema.parse(req.body);
    const existing = await fetchOneProduct(productId);

    if (!existing) {
      throw new AppError("Product not found", 404);
    }

    const nextListPrice = updates.listPrice ?? toNumber(existing.listPrice);
    const nextSalePrice = updates.salePrice ?? toNumber(existing.salePrice);
    const nextReferralDiscountAmount =
      updates.referralDiscountAmount ?? toNumber(existing.referralDiscountAmount);
    assertPricing(nextListPrice, nextSalePrice);
    assertReferralDiscount(nextSalePrice, nextReferralDiscountAmount);

    const setClauses: string[] = [];
    const params: unknown[] = [];

    const setValue = (column: string, value: unknown) => {
      setClauses.push(`${column} = ?`);
      params.push(value);
    };

    if (updates.title !== undefined) setValue("title", updates.title);
    if (updates.examCategory !== undefined) setValue("examCategory", updates.examCategory);
    if (updates.examName !== undefined) setValue("examName", updates.examName);
    if (updates.courseType !== undefined) setValue("courseType", updates.courseType);
    if (updates.languageMode !== undefined) setValue("languageMode", updates.languageMode ?? null);
    if (updates.thumbnailUrl !== undefined) setValue("thumbnailUrl", updates.thumbnailUrl ?? null);
    if (updates.description !== undefined) setValue("description", updates.description ?? null);
    if (updates.listPrice !== undefined) setValue("listPrice", updates.listPrice);
    if (updates.salePrice !== undefined) setValue("salePrice", updates.salePrice);
    if (updates.referralBonusAmount !== undefined) {
      setValue("referralBonusAmount", updates.referralBonusAmount);
    }
    if (updates.referralDiscountAmount !== undefined) {
      setValue("referralDiscountAmount", updates.referralDiscountAmount);
    }
    if (updates.accessDays !== undefined) setValue("accessDays", updates.accessDays);
    if (updates.validityLabel !== undefined) setValue("validityLabel", updates.validityLabel ?? null);
    if (updates.addons !== undefined) setValue("addons", JSON.stringify(updates.addons ?? []));
    if (updates.demoLessonTitle !== undefined) {
      setValue("demoLessonTitle", updates.demoLessonTitle ?? null);
    }
    if (updates.demoLessonUrl !== undefined) {
      setValue("demoLessonUrl", updates.demoLessonUrl ?? null);
    }
    if (updates.isActive !== undefined) setValue("isActive", updates.isActive ? 1 : 0);
    if (updates.mockTestIds !== undefined) {
      await syncProductMockTests(productId, updates.mockTestIds || []);
    }
    if (updates.demoMockTestIds !== undefined) {
      await syncProductDemoMockTests(productId, updates.demoMockTestIds || []);
    }

    setValue("updatedAt", new Date());

    await prisma.$executeRawUnsafe(
      `UPDATE Product SET ${setClauses.join(", ")} WHERE id = ?`,
      ...params,
      productId
    );

    const product = await fetchSerializedProduct(productId);
    if (!product) throw new AppError("Product not found after update", 404);

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

adminProductsRouter.delete("/products/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM Product WHERE id = ?`, req.params.id);
    res.json({ message: "Product deleted" });
  } catch (error) {
    next(error);
  }
});
