import { mkdir } from "node:fs/promises";
import path from "node:path";
import { resolvePublicAssetsDir } from "./publicAssetsPath";
import { prisma } from "./prisma";

let ensureLandingExploreStoragePromise: Promise<void> | null = null;

const exploreUploadDir = path.join(resolvePublicAssetsDir(), "uploads", "explore");

const createTables = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS LandingExploreType (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      pageKey VARCHAR(120) NOT NULL,
      name VARCHAR(191) NOT NULL,
      description TEXT NULL,
      iconUrl VARCHAR(800) NULL,
      sortOrder INT NOT NULL DEFAULT 0,
      isActive TINYINT(1) NOT NULL DEFAULT 1,
      createdBy VARCHAR(191) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_landingExploreType_page (pageKey, isActive, sortOrder),
      INDEX idx_landingExploreType_name (name)
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS LandingExploreItem (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      typeId VARCHAR(36) NOT NULL,
      categoryName VARCHAR(191) NULL,
      title VARCHAR(191) NOT NULL,
      subtitle VARCHAR(255) NULL,
      imageUrl VARCHAR(800) NULL,
      linkUrl VARCHAR(1200) NULL,
      sortOrder INT NOT NULL DEFAULT 0,
      isActive TINYINT(1) NOT NULL DEFAULT 1,
      createdBy VARCHAR(191) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_landingExploreItem_type (typeId, isActive, sortOrder),
      INDEX idx_landingExploreItem_title (title)
    )
  `);

  const categoryColumn = (await prisma.$queryRawUnsafe(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'LandingExploreItem'
      AND COLUMN_NAME = 'categoryName'
    LIMIT 1
  `)) as Array<{ COLUMN_NAME?: string }>;

  if (!categoryColumn.length) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE LandingExploreItem
      ADD COLUMN categoryName VARCHAR(191) NULL AFTER typeId
    `);
  }
};

export const ensureLandingExploreStorageReady = async () => {
  if (!ensureLandingExploreStoragePromise) {
    ensureLandingExploreStoragePromise = (async () => {
      await mkdir(exploreUploadDir, { recursive: true });
      await createTables();
    })().catch((error) => {
      ensureLandingExploreStoragePromise = null;
      throw error;
    });
  }
  await ensureLandingExploreStoragePromise;
};

export const resolveLandingExploreUploadDir = () => exploreUploadDir;
