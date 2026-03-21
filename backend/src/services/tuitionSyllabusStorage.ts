import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { resolvePublicAssetsDir } from "../utils/publicAssetsPath";

const TUITION_SYLLABUS_DIR = path.join(resolvePublicAssetsDir(), "uploads", "tuition-syllabi");

const sanitizeFileName = (value: string): string =>
  String(value || "syllabus")
    .trim()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "syllabus";

const sanitizeExtension = (fileName: string, mimeType: string): string => {
  const explicit = path.extname(String(fileName || "")).replace(/^\./, "").toLowerCase();
  if (/^[a-z0-9]+$/.test(explicit)) return explicit;

  const mime = String(mimeType || "").toLowerCase();
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("webp")) return "webp";
  return "bin";
};

const decodeBase64 = (value: string): Buffer => {
  const input = String(value || "").trim();
  if (!input) {
    throw new Error("Syllabus file data is required.");
  }
  const raw = input.includes(",") ? input.split(",").pop() || "" : input;
  return Buffer.from(raw, "base64");
};

export const storeTuitionSyllabusFile = async (input: {
  fileName: string;
  mimeType: string;
  fileBase64: string;
}) => {
  const safeName = sanitizeFileName(input.fileName);
  const extension = sanitizeExtension(input.fileName, input.mimeType);
  const fileKey = `${safeName}-${randomUUID()}.${extension}`;
  const absolutePath = path.join(TUITION_SYLLABUS_DIR, fileKey);
  const buffer = decodeBase64(input.fileBase64);

  await mkdir(TUITION_SYLLABUS_DIR, { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    fileName: fileKey,
    absolutePath,
    fileUrl: `/public/uploads/tuition-syllabi/${fileKey}`,
    byteSize: buffer.byteLength,
  };
};
