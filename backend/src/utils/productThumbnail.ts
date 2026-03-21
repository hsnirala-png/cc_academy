import fs from "node:fs";
import path from "node:path";
import { resolveFrontendPublicDir, resolvePublicAssetsDir } from "./publicAssetsPath";

const FALLBACK_PRODUCT_THUMB_URL = "/public/PSTET_7.png";
const backendProductUploadsDir = path.resolve(__dirname, "..", "..", "public", "uploads", "products");
const frontendProductUploadsDir = path.join(resolveFrontendPublicDir(), "uploads", "products");

const normalizeRelativeUrl = (value: string): string => {
  if (value.startsWith("./")) return `/${value.slice(2)}`;
  return value;
};

const resolveProductUploadFileName = (value: string): string | null => {
  const normalized = normalizeRelativeUrl(String(value || "").trim());
  if (!normalized.toLowerCase().startsWith("/public/uploads/products/")) return null;
  const fileName = path.basename(normalized);
  return fileName && fileName !== "." ? fileName : null;
};

const fileExists = (filePath: string): boolean => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

export const resolveProductThumbnailUrl = (value: string | null | undefined): string => {
  const raw = String(value || "").trim();
  if (!raw) return FALLBACK_PRODUCT_THUMB_URL;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;

  const fileName = resolveProductUploadFileName(raw);
  if (!fileName) return raw;

  const candidatePaths = [
    path.join(resolvePublicAssetsDir(), "uploads", "products", fileName),
    path.join(backendProductUploadsDir, fileName),
    path.join(frontendProductUploadsDir, fileName),
  ];
  if (candidatePaths.some(fileExists)) {
    return `/public/uploads/products/${fileName}`;
  }

  return FALLBACK_PRODUCT_THUMB_URL;
};
