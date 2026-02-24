import path from "node:path";

const backendRoot = path.resolve(__dirname, "..", "..");
const defaultFrontendPublicDir = path.resolve(backendRoot, "..", "frontend", "public");

const normalizeEnvPath = (value: string | undefined): string | null => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  return path.resolve(normalized);
};

export const resolvePublicAssetsDir = (): string =>
  normalizeEnvPath(process.env.PUBLIC_ASSETS_DIR) || defaultFrontendPublicDir;

