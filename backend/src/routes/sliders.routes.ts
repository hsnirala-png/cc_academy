import { Router } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { ensureSliderStorageReady } from "../utils/sliderStorage";

export const slidersRouter = Router();

const normalizePageKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_ -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "");

const querySchema = z.object({
  page: z.preprocess(
    (value) => (typeof value === "string" ? normalizePageKey(value) : value),
    z.string().trim().max(120).optional()
  ),
});

type SliderRow = {
  id: string;
  pageKey: string;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const toIso = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

slidersRouter.get("/sliders", async (req, res, next) => {
  try {
    await ensureSliderStorageReady();
    const input = querySchema.parse(req.query || {});

    const whereClauses = ["s.isActive = 1"];
    const params: unknown[] = [];

    if (input.page) {
      whereClauses.push("s.pageKey = ?");
      params.push(input.page);
    }

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT s.id, s.pageKey, s.title, s.imageUrl, s.linkUrl, s.sortOrder, s.createdAt, s.updatedAt
        FROM Slider s
        WHERE ${whereClauses.join(" AND ")}
        ORDER BY s.pageKey ASC, s.sortOrder ASC, s.createdAt ASC
      `,
      ...params
    )) as SliderRow[];

    res.json({
      sliders: rows.map((item) => ({
        id: item.id,
        pageKey: item.pageKey,
        title: item.title,
        imageUrl: item.imageUrl,
        linkUrl: item.linkUrl,
        sortOrder: Number(item.sortOrder || 0),
        createdAt: toIso(item.createdAt),
        updatedAt: toIso(item.updatedAt),
      })),
    });
  } catch (error) {
    next(error);
  }
});
