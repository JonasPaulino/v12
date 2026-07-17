import path from "node:path";
import process from "node:process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopEnvPath = path.resolve(__dirname, "../../../../.env");
const workspaceRoot = path.resolve(__dirname, "../../../../../");
const desktopRoot = path.resolve(workspaceRoot, "desktop");
const desktopAcbrRoot = path.resolve(desktopRoot, "lib", "ACBrLibNFE");
const webAcbrMdfeRoot = path.resolve(workspaceRoot, "web", "acbr", "lib", "ACBrLibMDFe");

function applyEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] != null) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

applyEnvFile(path.resolve(process.cwd(), ".env"));
applyEnvFile(desktopEnvPath);

const rootDir = process.cwd();
function resolveDefaultAcbrLibPath() {
  const candidates =
    process.platform === "win32"
      ? [
          path.join(desktopAcbrRoot, "Windows", "MT", "Cdecl", "ACBrNFe64.dll"),
          path.join(desktopAcbrRoot, "Windows", "CONSOLE-MT", "ACBrNFe64.dll"),
          path.join(desktopAcbrRoot, "Windows", "MT", "StdCall", "ACBrNFe64.dll"),
          path.join(desktopAcbrRoot, "win64", "ACBrNFe64.dll"),
        ]
      : [
          path.join(desktopAcbrRoot, "linux", "CONSOLE-MT", "libacbrnfe64.so"),
          path.join(desktopAcbrRoot, "linux", "mt", "libacbrnfe64.so"),
        ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

const defaultAcbrLibPath = resolveDefaultAcbrLibPath();

function resolveDefaultSevenZipPath() {
  const configuredPath = String(process.env.V12_BACKUP_7Z_PATH || "").trim();
  if (configuredPath) {
    return configuredPath;
  }

  const candidates =
    process.platform === "win32"
      ? [
          path.join(rootDir, "tools", "7zip", "7z.exe"),
          path.join(workspaceRoot, "tools", "7zip", "7z.exe"),
          path.join(desktopRoot, "tools", "7zip", "7z.exe"),
          "7z",
        ]
      : ["7z"];

  return candidates.find((candidate) => candidate === "7z" || fs.existsSync(candidate)) || "7z";
}

const defaultSevenZipPath = resolveDefaultSevenZipPath();

function resolveAcbrNativeDependencyDirs() {
  const configuredDirs = String(process.env.V12_ACBRLIB_NATIVE_DEP_DIRS || "")
    .split(path.delimiter)
    .map((item) => item.trim())
    .filter(Boolean);

  if (configuredDirs.length) {
    return configuredDirs.filter((candidate) => fs.existsSync(candidate));
  }

  const candidates =
    process.platform === "win32"
      ? [
          path.join(desktopAcbrRoot, "dep", "LibXml2", "x64"),
          path.join(desktopAcbrRoot, "dep", "OpenSSL", "x64"),
          path.join(webAcbrMdfeRoot, "dep", "LibXml2", "x64"),
          path.join(webAcbrMdfeRoot, "dep", "OpenSSL", "x64"),
        ]
      : [];

  return candidates.filter((candidate) => fs.existsSync(candidate));
}

export const env = {
  port: Number(process.env.V12_LOCAL_PORT || 5100),
  dbPath: process.env.V12_LOCAL_DB_PATH || path.join(rootDir, "data", "v12-pdv.sqlite"),
  erpApiUrl: process.env.V12_ERP_API_URL || "",
  erpSyncToken: process.env.V12_ERP_SYNC_TOKEN || "",
  estacaoNome: process.env.V12_ESTACAO_NOME || "Caixa 01",
  acbrMode: process.env.V12_ACBR_MODE || "lib",
  acbrMonitorHost: process.env.V12_ACBR_MONITOR_HOST || "127.0.0.1",
  acbrMonitorPort: Number(process.env.V12_ACBR_MONITOR_PORT || 3434),
  acbrLibPath: process.env.V12_ACBRLIB_NFE_PATH || defaultAcbrLibPath,
  acbrLibSchemaPath:
    process.env.V12_ACBRLIB_SCHEMA_PATH ||
    path.join(desktopAcbrRoot, "dep", "Schemas", "NFe"),
  acbrLibIniServicosPath:
    process.env.V12_ACBRLIB_NFE_SERVICOS_PATH ||
    path.join(desktopAcbrRoot, "dep", "ACBrNFeServicos.ini"),
  acbrLibConfigDir:
    process.env.V12_ACBRLIB_CONFIG_DIR || path.join(desktopRoot, "data", "acbrlib", "config"),
  acbrLibTempDir:
    process.env.V12_ACBRLIB_TEMP_DIR || path.join(desktopRoot, "data", "acbrlib", "runtime"),
  acbrLibLogDir:
    process.env.V12_ACBRLIB_LOG_DIR || path.join(desktopRoot, "data", "acbrlib", "log"),
  acbrLibNativeDependencyDirs: resolveAcbrNativeDependencyDirs(),
  backupEnabled: String(process.env.V12_BACKUP_ENABLED || "false").toLowerCase() === "true",
  backupDir: process.env.V12_BACKUP_DIR || path.join(desktopRoot, "data", "backups"),
  backupSevenZipPath: defaultSevenZipPath,
  backupLocalRetentionDays: Number(process.env.V12_BACKUP_LOCAL_RETENTION_DAYS || 30),
  backupAutoIntervalMinutes: Number(process.env.V12_BACKUP_AUTO_INTERVAL_MINUTES || 0),
  pdvVersion: process.env.V12_PDV_VERSION || "0.1.12",
  pdvReleaseChannel: process.env.V12_PDV_RELEASE_CHANNEL || "stable",
  pdvReleasePlatform:
    process.env.V12_PDV_RELEASE_PLATFORM ||
    (process.platform === "win32" ? "win32-x64" : `${process.platform}-${process.arch}`),
  pdvReleaseDir: process.env.V12_PDV_RELEASE_DIR || path.join(desktopRoot, "data", "releases"),
  pdvVersionDir: process.env.V12_PDV_VERSION_DIR || path.join(desktopRoot, "data", "versions"),
  pdvResourceDir: process.env.V12_PDV_RESOURCE_DIR || path.join(desktopRoot, "data", "resources"),
  pdvReleaseAutoCheckMinutes: Number(process.env.V12_PDV_RELEASE_AUTO_CHECK_MINUTES || 30),
};
