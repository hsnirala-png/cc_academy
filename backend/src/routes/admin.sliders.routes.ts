import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { AppError } from "../utils/appError";
import { resolvePublicAssetsDir } from "../utils/publicAssetsPath";
import { prisma } from "../utils/prisma";
import { ensureSliderStorageReady } from "../utils/sliderStorage";

export const adminSlidersRouter = Router();

const ensureAdmin = [requireAuth, requireRole(Role.ADMIN)] as const;

adminSlidersRouter.use("/sliders", async (_req, _res, next) => {
  try {
    await ensureSliderStorageReady();
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

const optionalBoolean = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
}, z.boolean().optional());

const createSliderSchema = z.object({
  pageKey: parsePageKey,
  title: optionalTrimmedString(191),
  imageUrl: z.string().trim().min(1).max(800),
  linkUrl: optionalTrimmedString(1200),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: optionalBoolean,
});

const updateSliderSchema = createSliderSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "No slider updates provided");

const listSliderQuerySchema = z.object({
  pageKey: z.preprocess(
    (value) => (typeof value === "string" ? normalizePageKey(value) : value),
    z.string().trim().max(120).optional()
  ),
  includeInactive: optionalBoolean,
});

const uploadSliderSchema = z.object({
  fileName: z.string().trim().min(1).max(255).optional(),
  dataUrl: z.string().trim().min(1),
});

type SliderRow = {
  id: string;
  pageKey: string;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  sortOrder: number;
  isActive: number | boolean;
  createdBy: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdByUserId?: string | null;
  createdByUserName?: string | null;
  createdByUserMobile?: string | null;
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

const serializeSlider = (row: SliderRow) => ({
  id: row.id,
  pageKey: row.pageKey,
  title: row.title,
  imageUrl: row.imageUrl,
  linkUrl: row.linkUrl,
  sortOrder: Number(row.sortOrder || 0),
  isActive: toBoolean(row.isActive),
  createdBy: row.createdBy,
  createdByUser: row.createdByUserId
    ? {
        id: row.createdByUserId,
        name: row.createdByUserName || "",
        mobile: row.createdByUserMobile || "",
      }
    : null,
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

const slidersUploadDir = path.join(resolvePublicAssetsDir(), "uploads", "sliders");

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

const fetchOneSlider = async (id: string) => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        s.*,
        u.id AS createdByUserId,
        u.name AS createdByUserName,
        u.mobile AS createdByUserMobile
      FROM Slider s
      LEFT JOIN User u ON u.id = s.createdBy
      WHERE s.id = ?
      LIMIT 1
    `,
    id
  )) as SliderRow[];

  return rows[0] || null;
};

adminSlidersRouter.post("/sliders/image-upload", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = uploadSliderSchema.parse(req.body);
    const { mimeType, buffer } = parseDataUrl(input.dataUrl);
    const extension = mimeTypeToExtension[mimeType];
    const fileName = `${randomUUID()}.${extension}`;

    await mkdir(slidersUploadDir, { recursive: true });
    const absoluteFilePath = path.join(slidersUploadDir, fileName);
    await writeFile(absoluteFilePath, buffer);

    res.status(201).json({
      imageUrl: `/public/uploads/sliders/${fileName}`,
    });
  } catch (error) {
    next(error);
  }
});

adminSlidersRouter.get("/sliders", ...ensureAdmin, async (req, res, next) => {
  try {
    const filters = listSliderQuerySchema.parse(req.query || {});
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (filters.pageKey) {
      whereClauses.push("s.pageKey = ?");
      params.push(filters.pageKey);
    }

    if (!filters.includeInactive) {
      whereClauses.push("s.isActive = 1");
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          s.*,
          u.id AS createdByUserId,
          u.name AS createdByUserName,
          u.mobile AS createdByUserMobile
        FROM Slider s
        LEFT JOIN User u ON u.id = s.createdBy
        ${whereSQL}
        ORDER BY s.pageKey ASC, s.sortOrder ASC, s.createdAt ASC
      `,
      ...params
    )) as SliderRow[];

    res.json({ sliders: rows.map(serializeSlider) });
  } catch (error) {
    next(error);
  }
});

adminSlidersRouter.post("/sliders", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = createSliderSchema.parse(req.body);
    const sliderId = randomUUID();
    const now = new Date();

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO Slider
        (
          id,
          pageKey,
          title,
          imageUrl,
          linkUrl,
          sortOrder,
          isActive,
          createdBy,
          createdAt,
          updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      sliderId,
      input.pageKey,
      input.title ?? null,
      input.imageUrl,
      input.linkUrl ?? null,
      input.sortOrder ?? 0,
      input.isActive ?? true,
      req.user!.userId,
      now,
      now
    );

    const slider = await fetchOneSlider(sliderId);
    if (!slider) throw new AppError("Slider creation failed.", 500);

    res.status(201).json({ slider: serializeSlider(slider) });
  } catch (error) {
    next(error);
  }
});

adminSlidersRouter.patch("/sliders/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    const sliderId = String(req.params.id || "").trim();
    if (!sliderId) throw new AppError("Slider id is required.", 400);

    const updates = updateSliderSchema.parse(req.body);
    const existing = await fetchOneSlider(sliderId);
    if (!existing) throw new AppError("Slider not found.", 404);

    const setClauses: string[] = [];
    const params: unknown[] = [];

    const setValue = (column: string, value: unknown) => {
      setClauses.push(`${column} = ?`);
      params.push(value);
    };

    if (updates.pageKey !== undefined) setValue("pageKey", updates.pageKey);
    if (updates.title !== undefined) setValue("title", updates.title ?? null);
    if (updates.imageUrl !== undefined) setValue("imageUrl", updates.imageUrl);
    if (updates.linkUrl !== undefined) setValue("linkUrl", updates.linkUrl ?? null);
    if (updates.sortOrder !== undefined) setValue("sortOrder", updates.sortOrder);
    if (updates.isActive !== undefined) setValue("isActive", updates.isActive ? 1 : 0);
    setValue("updatedAt", new Date());

    await prisma.$executeRawUnsafe(
      `UPDATE Slider SET ${setClauses.join(", ")} WHERE id = ?`,
      ...params,
      sliderId
    );

    const slider = await fetchOneSlider(sliderId);
    if (!slider) throw new AppError("Slider not found after update.", 404);

    res.json({ slider: serializeSlider(slider) });
  } catch (error) {
    next(error);
  }
});

adminSlidersRouter.delete("/sliders/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    const sliderId = String(req.params.id || "").trim();
    if (!sliderId) throw new AppError("Slider id is required.", 400);
    await prisma.$executeRawUnsafe(`DELETE FROM Slider WHERE id = ?`, sliderId);
    res.json({ message: "Slider deleted." });
  } catch (error) {
    next(error);
  }
});
