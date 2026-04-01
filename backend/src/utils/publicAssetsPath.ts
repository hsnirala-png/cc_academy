import path from "node:path";

const backendRoot = path.resolve(__dirname, "..", "..");
const defaultBackendPublicDir = path.resolve(backendRoot, "public");
const defaultFrontendPublicDir = path.resolve(backendRoot, "..", "frontend", "public");

const normalizeEnvPath = (value: string | undefined): string | null => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  if (process.platform === "win32") {
    const looksLikePosixAbsolute = normalized.startsWith("/") && !normalized.startsWith("//");
    if (looksLikePosixAbsolute) {
      return null;
    }
  }
  return path.resolve(normalized);
};

export const resolvePublicAssetsDir = (): string =>
  normalizeEnvPath(process.env.PUBLIC_ASSETS_DIR) || defaultBackendPublicDir;

export const resolveFrontendPublicDir = (): string => defaultFrontendPublicDir;

export const resolveServedPublicAssetDirs = (): string[] => {
  const candidates = [defaultBackendPublicDir, defaultFrontendPublicDir, resolvePublicAssetsDir()];
  return Array.from(new Set(candidates));
};
