import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function hasStationIndex(candidate) {
  return !!candidate && fs.existsSync(path.join(candidate, "index.html"));
}

export function resolveStationDistDir() {
  const activeManifest = readJson(path.join(env.pdvVersionDir, "current.json"));
  const candidates = [
    activeManifest?.staging_dir
      ? path.join(activeManifest.staging_dir, "station", "dist")
      : null,
    process.resourcesPath
      ? path.join(process.resourcesPath, "app.asar", "apps", "station", "dist")
      : null,
    process.resourcesPath
      ? path.join(process.resourcesPath, "app.asar.unpacked", "apps", "station", "dist")
      : null,
    process.resourcesPath ? path.join(process.resourcesPath, "apps", "station", "dist") : null,
    path.resolve(__dirname, "../../../station/dist"),
    path.resolve(process.cwd(), "../station/dist"),
    path.resolve(process.cwd(), "apps/station/dist"),
  ];

  return candidates.find(hasStationIndex) || null;
}
