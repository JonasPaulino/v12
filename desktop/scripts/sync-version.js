import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, "..");
const versionFile = path.join(desktopRoot, "VERSION");

function readReleaseVersion() {
  const version = fs.readFileSync(versionFile, "utf8").trim();
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Versão inválida em ${versionFile}: ${version}`);
  }

  return version;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function updatePackageJson(relativePath, version) {
  const filePath = path.join(desktopRoot, relativePath);
  const data = readJson(filePath);
  data.version = version;
  writeJson(filePath, data);
}

function updatePackageLock(version) {
  const filePath = path.join(desktopRoot, "package-lock.json");
  const data = readJson(filePath);
  data.version = version;

  const packageVersions = {
    "": version,
    "apps/server": version,
    "apps/station": version,
    "packages/shared": version,
  };

  for (const [packagePath, packageVersion] of Object.entries(packageVersions)) {
    if (data.packages?.[packagePath]) {
      data.packages[packagePath].version = packageVersion;
    }
  }

  writeJson(filePath, data);
}

const version = readReleaseVersion();

updatePackageJson("package.json", version);
updatePackageJson("apps/server/package.json", version);
updatePackageJson("apps/station/package.json", version);
updatePackageJson("packages/shared/package.json", version);
updatePackageLock(version);

console.log(`[sync-version] V12 PDV ${version}`);
