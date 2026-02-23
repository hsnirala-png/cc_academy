import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const backendRoot = path.resolve(__dirname, "..", "..");
const cwdRoot = process.cwd();

const loadIfPresent = (filePath: string, override = false): boolean => {
  if (!fs.existsSync(filePath)) return false;
  dotenv.config({ path: filePath, override });
  return true;
};

const backendEnvPath = path.join(backendRoot, ".env");
const backendEnvLocalPath = path.join(backendRoot, ".env.local");
const cwdEnvPath = path.join(cwdRoot, ".env");
const cwdEnvLocalPath = path.join(cwdRoot, ".env.local");

const loadedBackendEnv = loadIfPresent(backendEnvPath);
loadIfPresent(backendEnvLocalPath, true);

// Fallback for environments that intentionally run from another config root.
if (!loadedBackendEnv && cwdRoot !== backendRoot) {
  loadIfPresent(cwdEnvPath);
}
if (cwdRoot !== backendRoot) {
  loadIfPresent(cwdEnvLocalPath, true);
}
