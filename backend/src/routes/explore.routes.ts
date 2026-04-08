import { Router } from "express";
import { z } from "zod";
import { ensureLandingExploreStorageReady } from "../utils/landingExploreStorage";
import { prisma } from "../utils/prisma";

export const exploreRouter = Router();

exploreRouter.use("/explore-sections", async (_req, _res, next) => {
  try {
    await ensureLandingExploreStorageReady();
    next();
  } catch (error) {
    next(error);
  }
});

const normalizePageKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_ -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "");

const querySchema = z.object({
  pageKey: z.preprocess(
    (value) => (typeof value === "string" ? normalizePageKey(value) : value),
    z.string().trim().min(1).max(120)
  ),
});

type PublicTypeRow = {
  id: string;
  pageKey: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  sortOrder: number;
};

type PublicItemRow = {
  id: string;
  typeId: string;
  categoryName: string | null;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  sortOrder: number;
};

exploreRouter.get("/explore-sections", async (req, res, next) => {
  try {
    const { pageKey } = querySchema.parse(req.query || {});
    const [types, items] = await Promise.all([
      prisma.$queryRawUnsafe(
        `
          SELECT id, pageKey, name, description, iconUrl, sortOrder
          FROM LandingExploreType
          WHERE pageKey = ? AND isActive = 1
          ORDER BY sortOrder ASC, createdAt ASC
        `,
        pageKey
      ) as Promise<PublicTypeRow[]>,
      prisma.$queryRawUnsafe(
        `
          SELECT i.id, i.typeId, i.title, i.subtitle, i.imageUrl, i.linkUrl, i.sortOrder
          , i.categoryName
          FROM LandingExploreItem i
          INNER JOIN LandingExploreType t ON t.id = i.typeId
          WHERE t.pageKey = ? AND t.isActive = 1 AND i.isActive = 1
          ORDER BY t.sortOrder ASC, i.sortOrder ASC, i.createdAt ASC
        `,
        pageKey
      ) as Promise<PublicItemRow[]>,
    ]);

    const itemsByType = new Map<string, PublicItemRow[]>();
    items.forEach((item) => {
      const list = itemsByType.get(item.typeId) || [];
      list.push(item);
      itemsByType.set(item.typeId, list);
    });

    res.json({
      pageKey,
      types: types.map((type) => ({
        ...type,
        items: (itemsByType.get(type.id) || []).map((item) => ({
          id: item.id,
          categoryName: item.categoryName || null,
          title: item.title,
          subtitle: item.subtitle,
          imageUrl: item.imageUrl,
          linkUrl: item.linkUrl,
          sortOrder: Number(item.sortOrder || 0),
        })),
      })),
    });
  } catch (error) {
    next(error);
  }
});
