import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { AppError } from "../utils/appError";
import {
  ensureLandingExploreStorageReady,
  resolveLandingExploreUploadDir,
} from "../utils/landingExploreStorage";
import { prisma } from "../utils/prisma";

export const adminExploreRouter = Router();

const ensureAdmin = [requireAuth, requireRole(Role.ADMIN)] as const;

adminExploreRouter.use("/explore", async (_req, _res, next) => {
  try {
    await ensureLandingExploreStorageReady();
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
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
}, z.boolean().optional());

const normalizePageKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_ -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "");

const parsePageKey = z.preprocess(
  (value) => (typeof value === "string" ? normalizePageKey(value) : value),
  z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9][a-z0-9/_-]*$/, "Invalid page key")
);

const createTypeSchema = z.object({
  pageKey: parsePageKey,
  name: z.string().trim().min(1).max(191),
  description: optionalTrimmedString(1500),
  iconUrl: optionalTrimmedString(800),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: optionalBoolean,
});

const updateTypeSchema = createTypeSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "No type updates provided");

const createItemSchema = z.object({
  typeId: z.string().trim().min(1).max(36),
  categoryName: optionalTrimmedString(191),
  title: z.string().trim().min(1).max(191),
  subtitle: optionalTrimmedString(255),
  imageUrl: optionalTrimmedString(800),
  linkUrl: optionalTrimmedString(1200),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: optionalBoolean,
});

const updateItemSchema = createItemSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "No item updates provided");

const listQuerySchema = z.object({
  pageKey: z.preprocess(
    (value) => (typeof value === "string" ? normalizePageKey(value) : value),
    z.string().trim().max(120).optional()
  ),
  includeInactive: optionalBoolean,
});

const uploadImageSchema = z.object({
  fileName: z.string().trim().min(1).max(255).optional(),
  dataUrl: z.string().trim().min(1),
});

type ExploreTypeRow = {
  id: string;
  pageKey: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  sortOrder: number;
  isActive: number | boolean;
  createdBy: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type ExploreItemRow = {
  id: string;
  typeId: string;
  categoryName: string | null;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isActive: number | boolean;
  createdBy: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  typeName?: string | null;
  pageKey?: string | null;
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

const serializeType = (row: ExploreTypeRow) => ({
  id: row.id,
  pageKey: row.pageKey,
  name: row.name,
  description: row.description,
  iconUrl: row.iconUrl,
  sortOrder: Number(row.sortOrder || 0),
  isActive: toBoolean(row.isActive),
  createdBy: row.createdBy,
  createdByUser: null,
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt),
});

const serializeItem = (row: ExploreItemRow) => ({
  id: row.id,
  typeId: row.typeId,
  typeName: row.typeName || null,
  pageKey: row.pageKey || null,
  categoryName: row.categoryName || null,
  title: row.title,
  subtitle: row.subtitle,
  imageUrl: row.imageUrl,
  linkUrl: row.linkUrl,
  sortOrder: Number(row.sortOrder || 0),
  isActive: toBoolean(row.isActive),
  createdBy: row.createdBy,
  createdByUser: null,
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt),
});

const mimeTypeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

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
  if (buffer.length > 5 * 1024 * 1024) {
    throw new AppError("Image size must be 5MB or less.", 400);
  }

  return { mimeType, buffer };
};

const fetchOneType = async (id: string) => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT t.*
      FROM LandingExploreType t
      WHERE t.id = ?
      LIMIT 1
    `,
    id
  )) as ExploreTypeRow[];
  return rows[0] || null;
};

const fetchOneItem = async (id: string) => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        i.*,
        t.name AS typeName,
        t.pageKey AS pageKey
      FROM LandingExploreItem i
      INNER JOIN LandingExploreType t ON t.id = i.typeId
      WHERE i.id = ?
      LIMIT 1
    `,
    id
  )) as ExploreItemRow[];
  return rows[0] || null;
};

adminExploreRouter.post("/explore/image-upload", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = uploadImageSchema.parse(req.body);
    const { mimeType, buffer } = parseDataUrl(input.dataUrl);
    const extension = mimeTypeToExtension[mimeType];
    const fileName = `${randomUUID()}.${extension}`;
    const uploadDir = resolveLandingExploreUploadDir();

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);

    res.status(201).json({
      imageUrl: `/public/uploads/explore/${fileName}`,
    });
  } catch (error) {
    next(error);
  }
});

adminExploreRouter.get("/explore/types", ...ensureAdmin, async (req, res, next) => {
  try {
    const filters = listQuerySchema.parse(req.query || {});
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (filters.pageKey) {
      whereClauses.push("t.pageKey = ?");
      params.push(filters.pageKey);
    }
    if (!filters.includeInactive) {
      whereClauses.push("t.isActive = 1");
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT t.*
        FROM LandingExploreType t
        ${whereSQL}
        ORDER BY t.pageKey ASC, t.sortOrder ASC, t.createdAt ASC
      `,
      ...params
    )) as ExploreTypeRow[];

    res.json({ types: rows.map(serializeType) });
  } catch (error) {
    next(error);
  }
});

adminExploreRouter.post("/explore/types", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = createTypeSchema.parse(req.body);
    const typeId = randomUUID();
    const now = new Date();

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO LandingExploreType
        (
          id, pageKey, name, description, iconUrl, sortOrder, isActive, createdBy, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      typeId,
      input.pageKey,
      input.name,
      input.description ?? null,
      input.iconUrl ?? null,
      input.sortOrder ?? 0,
      input.isActive ?? true,
      req.user!.userId,
      now,
      now
    );

    const row = await fetchOneType(typeId);
    if (!row) throw new AppError("Explore type creation failed.", 500);
    res.status(201).json({ type: serializeType(row) });
  } catch (error) {
    next(error);
  }
});

adminExploreRouter.patch("/explore/types/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    const typeId = String(req.params.id || "").trim();
    if (!typeId) throw new AppError("Type id is required.", 400);
    const updates = updateTypeSchema.parse(req.body);
    const existing = await fetchOneType(typeId);
    if (!existing) throw new AppError("Explore type not found.", 404);

    const setClauses: string[] = [];
    const params: unknown[] = [];
    const setValue = (column: string, value: unknown) => {
      setClauses.push(`${column} = ?`);
      params.push(value);
    };

    if (updates.pageKey !== undefined) setValue("pageKey", updates.pageKey);
    if (updates.name !== undefined) setValue("name", updates.name);
    if (updates.description !== undefined) setValue("description", updates.description ?? null);
    if (updates.iconUrl !== undefined) setValue("iconUrl", updates.iconUrl ?? null);
    if (updates.sortOrder !== undefined) setValue("sortOrder", updates.sortOrder);
    if (updates.isActive !== undefined) setValue("isActive", updates.isActive ? 1 : 0);
    setValue("updatedAt", new Date());

    await prisma.$executeRawUnsafe(
      `UPDATE LandingExploreType SET ${setClauses.join(", ")} WHERE id = ?`,
      ...params,
      typeId
    );

    const row = await fetchOneType(typeId);
    if (!row) throw new AppError("Explore type update failed.", 500);
    res.json({ type: serializeType(row) });
  } catch (error) {
    next(error);
  }
});

adminExploreRouter.delete("/explore/types/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    const typeId = String(req.params.id || "").trim();
    if (!typeId) throw new AppError("Type id is required.", 400);
    await prisma.$executeRawUnsafe(`DELETE FROM LandingExploreItem WHERE typeId = ?`, typeId);
    await prisma.$executeRawUnsafe(`DELETE FROM LandingExploreType WHERE id = ?`, typeId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

adminExploreRouter.get("/explore/items", ...ensureAdmin, async (req, res, next) => {
  try {
    const filters = listQuerySchema.parse(req.query || {});
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (filters.pageKey) {
      whereClauses.push("t.pageKey = ?");
      params.push(filters.pageKey);
    }
    if (!filters.includeInactive) {
      whereClauses.push("i.isActive = 1");
      whereClauses.push("t.isActive = 1");
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          i.*,
          t.name AS typeName,
          t.pageKey AS pageKey
        FROM LandingExploreItem i
        INNER JOIN LandingExploreType t ON t.id = i.typeId
        ${whereSQL}
        ORDER BY t.pageKey ASC, t.sortOrder ASC, i.sortOrder ASC, i.createdAt ASC
      `,
      ...params
    )) as ExploreItemRow[];
    res.json({ items: rows.map(serializeItem) });
  } catch (error) {
    next(error);
  }
});

adminExploreRouter.post("/explore/items", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = createItemSchema.parse(req.body);
    const existingType = await fetchOneType(input.typeId);
    if (!existingType) throw new AppError("Selected type was not found.", 404);

    const itemId = randomUUID();
    const now = new Date();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO LandingExploreItem
        (
          id, typeId, categoryName, title, subtitle, imageUrl, linkUrl, sortOrder, isActive, createdBy, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      itemId,
      input.typeId,
      input.categoryName ?? null,
      input.title,
      input.subtitle ?? null,
      input.imageUrl ?? null,
      input.linkUrl ?? null,
      input.sortOrder ?? 0,
      input.isActive ?? true,
      req.user!.userId,
      now,
      now
    );

    const row = await fetchOneItem(itemId);
    if (!row) throw new AppError("Explore item creation failed.", 500);
    res.status(201).json({ item: serializeItem(row) });
  } catch (error) {
    next(error);
  }
});

adminExploreRouter.patch("/explore/items/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    const itemId = String(req.params.id || "").trim();
    if (!itemId) throw new AppError("Item id is required.", 400);
    const updates = updateItemSchema.parse(req.body);
    const existing = await fetchOneItem(itemId);
    if (!existing) throw new AppError("Explore item not found.", 404);
    if (updates.typeId) {
      const targetType = await fetchOneType(updates.typeId);
      if (!targetType) throw new AppError("Selected type was not found.", 404);
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
    const setValue = (column: string, value: unknown) => {
      setClauses.push(`${column} = ?`);
      params.push(value);
    };

    if (updates.typeId !== undefined) setValue("typeId", updates.typeId);
    if (updates.categoryName !== undefined) setValue("categoryName", updates.categoryName ?? null);
    if (updates.title !== undefined) setValue("title", updates.title);
    if (updates.subtitle !== undefined) setValue("subtitle", updates.subtitle ?? null);
    if (updates.imageUrl !== undefined) setValue("imageUrl", updates.imageUrl ?? null);
    if (updates.linkUrl !== undefined) setValue("linkUrl", updates.linkUrl ?? null);
    if (updates.sortOrder !== undefined) setValue("sortOrder", updates.sortOrder);
    if (updates.isActive !== undefined) setValue("isActive", updates.isActive ? 1 : 0);
    setValue("updatedAt", new Date());

    await prisma.$executeRawUnsafe(
      `UPDATE LandingExploreItem SET ${setClauses.join(", ")} WHERE id = ?`,
      ...params,
      itemId
    );

    const row = await fetchOneItem(itemId);
    if (!row) throw new AppError("Explore item update failed.", 500);
    res.json({ item: serializeItem(row) });
  } catch (error) {
    next(error);
  }
});

adminExploreRouter.delete("/explore/items/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    const itemId = String(req.params.id || "").trim();
    if (!itemId) throw new AppError("Item id is required.", 400);
    await prisma.$executeRawUnsafe(`DELETE FROM LandingExploreItem WHERE id = ?`, itemId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
