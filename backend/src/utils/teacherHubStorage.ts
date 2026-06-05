import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolvePublicAssetsDir } from "./publicAssetsPath";

const TEACHER_HUB_BASE_DIR = path.join(resolvePublicAssetsDir(), "uploads", "teacher-hub");

const sanitizeName = (value: string): string =>
  String(value || "file")
    .trim()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "file";

const resolveExtension = (fileName: string, mimeType: string): string => {
  const explicit = path.extname(String(fileName || "")).replace(/^\./, "").toLowerCase();
  if (/^[a-z0-9]{1,10}$/.test(explicit)) return explicit;
  const mime = String(mimeType || "").toLowerCase();
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("json")) return "json";
  if (mime.includes("plain")) return "txt";
  return "bin";
};

const decodeBase64 = (value: string): Buffer => {
  const input = String(value || "").trim();
  const raw = input.includes(",") ? input.split(",").pop() || "" : input;
  return Buffer.from(raw, "base64");
};

export const storeTeacherHubFile = async (folder: string, input: {
  fileName: string;
  mimeType: string;
  fileBase64: string;
}) => {
  const safeFolder = sanitizeName(folder);
  const dir = path.join(TEACHER_HUB_BASE_DIR, safeFolder);
  const safeName = sanitizeName(input.fileName);
  const extension = resolveExtension(input.fileName, input.mimeType);
  const fileKey = `${safeName}-${randomUUID()}.${extension}`;
  const absolutePath = path.join(dir, fileKey);
  const buffer = decodeBase64(input.fileBase64);

  await mkdir(dir, { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    fileName: fileKey,
    mimeType: input.mimeType,
    byteSize: buffer.byteLength,
    absolutePath,
    fileUrl: `/public/uploads/teacher-hub/${safeFolder}/${fileKey}`,
  };
};
